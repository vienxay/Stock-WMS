const { z } = require("zod");
const pool = require("../config/db");
const AppError = require("../utils/AppError");
const asyncHandler = require("../utils/asyncHandler");
const { getRateToBase } = require("../services/exchangeRateService");
const { recordMovement } = require("../services/stockMovementService");
const { userCanAccessWarehouse } = require("../middleware/roleMiddleware");

const receiptItemSchema = z.object({
  productId: z.number().int().positive(),
  quantity: z.number().positive(),
  unitPriceOriginal: z.number().nonnegative(),
});

const createReceiptSchema = z.object({
  warehouseId: z.number().int().positive(),
  sourceNote: z.string().optional().nullable(),
  currencyCode: z.enum(["LAK", "THB", "CNY"]),
  receivedDate: z.string(), // 'YYYY-MM-DD'
  items: z.array(receiptItemSchema).min(1),
});

const listReceipts = asyncHandler(async (req, res) => {
  const { warehouseId } = req.query;
  const where = warehouseId ? "WHERE warehouse_id = ?" : "";
  const params = warehouseId ? [warehouseId] : [];
  const [rows] = await pool.query(
    `SELECT sr.*, w.name AS warehouse_name, u.username AS created_by_username
     FROM stock_receipts sr
     JOIN warehouses w ON w.id = sr.warehouse_id
     JOIN users u ON u.id = sr.created_by
     ${where}
     ORDER BY sr.id DESC`,
    params,
  );
  res.json(rows);
});

const getReceipt = asyncHandler(async (req, res) => {
  const [receipts] = await pool.query(
    "SELECT * FROM stock_receipts WHERE id = ?",
    [req.params.id],
  );
  const receipt = receipts[0];
  if (!receipt) throw new AppError(404, "ບໍ່ພົບໃບຮັບສິນຄ້ານີ້");

  const [items] = await pool.query(
    `SELECT sri.*, p.sku, p.name_lo AS product_name
     FROM stock_receipt_items sri
     JOIN products p ON p.id = sri.product_id
     WHERE sri.receipt_id = ?`,
    [req.params.id],
  );
  res.json({ ...receipt, items });
});

// รับสินค้าเข้าได้เฉพาะคลังส่วนกลาง (is_central = TRUE) เท่านั้น ตามกติกาของระบบ
const createReceipt = asyncHandler(async (req, res) => {
  const body = createReceiptSchema.parse(req.body);

  if (!(await userCanAccessWarehouse(req.user, body.warehouseId))) {
    throw new AppError(403, "ບໍ່ມີສິດທິຮັບສິນຄ້າເຂົ້າຄັງນີ້");
  }

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const [warehouses] = await conn.query(
      "SELECT is_central FROM warehouses WHERE id = ? FOR UPDATE",
      [body.warehouseId],
    );
    if (!warehouses.length) throw new AppError(404, "ບໍ່ພົບຄັງນີ້");
    if (!warehouses[0].is_central) {
      throw new AppError(
        400,
        "ຮັບສິນຄ້າເຂົ້າໄດ້ສະເພາະຄັງສ່ວນກາງ (is_central) ເທົ່ານັ້ນ",
      );
    }

    const rate = await getRateToBase(
      conn,
      body.currencyCode,
      body.receivedDate,
    );

    const [receiptResult] = await conn.query(
      `INSERT INTO stock_receipts
        (warehouse_id, source_note, currency_code, exchange_rate_used, received_date, created_by)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        body.warehouseId,
        body.sourceNote ?? null,
        body.currencyCode,
        rate,
        body.receivedDate,
        req.user.sub,
      ],
    );
    const receiptId = receiptResult.insertId;

    for (const item of body.items) {
      const unitPriceLak = item.unitPriceOriginal * rate;
      const totalValueLak = item.quantity * unitPriceLak;

      await conn.query(
        `INSERT INTO stock_receipt_items
          (receipt_id, product_id, quantity, unit_price_original, unit_price_lak, total_value_lak)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [
          receiptId,
          item.productId,
          item.quantity,
          item.unitPriceOriginal,
          unitPriceLak,
          totalValueLak,
        ],
      );

      await recordMovement(conn, {
        productId: item.productId,
        warehouseId: body.warehouseId,
        movementType: "RECEIPT",
        quantity: item.quantity,
        unitValueLak: unitPriceLak,
        referenceTable: "stock_receipts",
        referenceId: receiptId,
        createdBy: req.user.sub,
      });
    }

    await conn.commit();

    const [receipts] = await pool.query(
      "SELECT * FROM stock_receipts WHERE id = ?",
      [receiptId],
    );
    res.status(201).json(receipts[0]);
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
});

module.exports = { listReceipts, getReceipt, createReceipt };
