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

const updateReceiptSchema = z.object({
  sourceNote: z.string().optional().nullable(),
  currencyCode: z.enum(["LAK", "THB", "CNY"]),
  receivedDate: z.string(),
  items: z.array(receiptItemSchema).min(1),
});

async function findReceiptOr404(runner, id) {
  const [rows] = await runner.query(
    "SELECT * FROM stock_receipts WHERE id = ?",
    [id],
  );
  if (!rows.length) throw new AppError(404, "ບໍ່ພົບໃບຮັບສິນຄ້ານີ້");
  return rows[0];
}

const listReceipts = asyncHandler(async (req, res) => {
  const { warehouseId, status } = req.query;
  const conditions = [];
  const params = [];
  if (warehouseId) {
    conditions.push("warehouse_id = ?");
    params.push(warehouseId);
  }
  if (status) {
    conditions.push("status = ?");
    params.push(status);
  }
  const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
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
  const receipt = await findReceiptOr404(pool, req.params.id);

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
// สร้างเป็นสถานะ PENDING ก่อน — ยังไม่กระทบสต็อกจริง ต้องรออนุมัติก่อน (recordMovement เกิดตอน approve เท่านั้น)
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
    }

    await conn.commit();

    const receipt = await findReceiptOr404(pool, receiptId);
    res.status(201).json(receipt);
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
});

// แก้ไขได้เฉพาะตอนยังเป็น PENDING เท่านั้น (ยังไม่อนุมัติ) — แก้ header + แทนที่รายการสินค้าทั้งหมด
const updateReceipt = asyncHandler(async (req, res) => {
  const body = updateReceiptSchema.parse(req.body);

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const receipt = await findReceiptOr404(conn, req.params.id);
    if (receipt.status !== "PENDING") {
      throw new AppError(400, "ແກ້ໄຂໄດ້ສະເພາະໃບຮັບທີ່ຍັງບໍ່ອະນຸມັດເທົ່ານັ້ນ");
    }
    if (!(await userCanAccessWarehouse(req.user, receipt.warehouse_id))) {
      throw new AppError(403, "ບໍ່ມີສິດທິແກ້ໄຂໃບຮັບນີ້");
    }

    const rate = await getRateToBase(
      conn,
      body.currencyCode,
      body.receivedDate,
    );

    await conn.query(
      `UPDATE stock_receipts
       SET source_note = ?, currency_code = ?, exchange_rate_used = ?, received_date = ?
       WHERE id = ?`,
      [
        body.sourceNote ?? null,
        body.currencyCode,
        rate,
        body.receivedDate,
        req.params.id,
      ],
    );

    await conn.query("DELETE FROM stock_receipt_items WHERE receipt_id = ?", [
      req.params.id,
    ]);
    for (const item of body.items) {
      const unitPriceLak = item.unitPriceOriginal * rate;
      const totalValueLak = item.quantity * unitPriceLak;

      await conn.query(
        `INSERT INTO stock_receipt_items
          (receipt_id, product_id, quantity, unit_price_original, unit_price_lak, total_value_lak)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [
          req.params.id,
          item.productId,
          item.quantity,
          item.unitPriceOriginal,
          unitPriceLak,
          totalValueLak,
        ],
      );
    }

    await conn.commit();
    const updated = await findReceiptOr404(pool, req.params.id);
    res.json(updated);
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
});

// อนุมัติใบรับ — ตอนนี้เท่านั้นที่สต็อกจริงจะขยับ (recordMovement ต่อรายการ)
const approveReceipt = asyncHandler(async (req, res) => {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const receipt = await findReceiptOr404(conn, req.params.id);
    if (receipt.status !== "PENDING") {
      throw new AppError(400, "ໃບຮັບນີ້ຖືກດຳເນີນການໄປແລ້ວ");
    }
    if (!(await userCanAccessWarehouse(req.user, receipt.warehouse_id))) {
      throw new AppError(403, "ບໍ່ມີສິດທິອະນຸມັດໃບຮັບນີ້");
    }

    const [items] = await conn.query(
      "SELECT * FROM stock_receipt_items WHERE receipt_id = ?",
      [req.params.id],
    );

    for (const item of items) {
      await recordMovement(conn, {
        productId: item.product_id,
        warehouseId: receipt.warehouse_id,
        movementType: "RECEIPT",
        quantity: Number(item.quantity),
        unitValueLak: Number(item.unit_price_lak),
        referenceTable: "stock_receipts",
        referenceId: receipt.id,
        createdBy: req.user.sub,
      });
    }

    await conn.query(
      `UPDATE stock_receipts
       SET status = 'APPROVED', approved_by = ?, approved_at = NOW()
       WHERE id = ?`,
      [req.user.sub, req.params.id],
    );

    await conn.commit();
    const updated = await findReceiptOr404(pool, req.params.id);
    res.json(updated);
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
});

const rejectReceipt = asyncHandler(async (req, res) => {
  const receipt = await findReceiptOr404(pool, req.params.id);
  if (receipt.status !== "PENDING") {
    throw new AppError(400, "ໃບຮັບນີ້ຖືກດຳເນີນການໄປແລ້ວ");
  }
  if (!(await userCanAccessWarehouse(req.user, receipt.warehouse_id))) {
    throw new AppError(403, "ບໍ່ມີສິດທິປະຕິເສດໃບຮັບນີ້");
  }
  await pool.query(
    `UPDATE stock_receipts
     SET status = 'REJECTED', approved_by = ?, approved_at = NOW()
     WHERE id = ?`,
    [req.user.sub, req.params.id],
  );
  const updated = await findReceiptOr404(pool, req.params.id);
  res.json(updated);
});

module.exports = {
  listReceipts,
  getReceipt,
  createReceipt,
  updateReceipt,
  approveReceipt,
  rejectReceipt,
};
