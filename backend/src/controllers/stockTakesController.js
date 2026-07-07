const { z } = require("zod");
const pool = require("../config/db");
const AppError = require("../utils/AppError");
const asyncHandler = require("../utils/asyncHandler");
const { recordMovement } = require("../services/stockMovementService");
const { userCanAccessWarehouse } = require("../middleware/roleMiddleware");

const createStockTakeSchema = z.object({
  warehouseId: z.number().int().positive(),
  countDate: z.string(), // 'YYYY-MM-DD'
});

const updateCountSchema = z.object({
  countedQty: z.number().nonnegative(),
});

async function findStockTakeOr404(runner, id) {
  const [rows] = await runner.query("SELECT * FROM stock_takes WHERE id = ?", [
    id,
  ]);
  if (!rows.length) throw new AppError(404, "ບໍ່ພົບຮອບກວດນັບນີ້");
  return rows[0];
}

const listStockTakes = asyncHandler(async (req, res) => {
  const { warehouseId, status } = req.query;
  const conditions = [];
  const params = [];
  if (warehouseId) {
    conditions.push("st.warehouse_id = ?");
    params.push(warehouseId);
  }
  if (status) {
    conditions.push("st.status = ?");
    params.push(status);
  }
  const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";

  const [rows] = await pool.query(
    `SELECT st.*, w.name AS warehouse_name
     FROM stock_takes st
     JOIN warehouses w ON w.id = st.warehouse_id
     ${where}
     ORDER BY st.id DESC`,
    params,
  );
  res.json(rows);
});

const getStockTake = asyncHandler(async (req, res) => {
  const stockTake = await findStockTakeOr404(pool, req.params.id);
  const [items] = await pool.query(
    `SELECT sti.*, p.sku, p.name_lo AS product_name
     FROM stock_take_items sti
     JOIN products p ON p.id = sti.product_id
     WHERE sti.stock_take_id = ?
     ORDER BY p.name_lo`,
    [req.params.id],
  );
  res.json({ ...stockTake, items });
});

// เปิดรอบตรวจนับใหม่ — ดึงยอดระบบปัจจุบัน (system_qty) ของทุกสินค้าที่มีในคลังนี้มาเป็นค่าตั้งต้น
const createStockTake = asyncHandler(async (req, res) => {
  const body = createStockTakeSchema.parse(req.body);

  if (!(await userCanAccessWarehouse(req.user, body.warehouseId))) {
    throw new AppError(403, "ບໍ່ມີສິດທິກວດນັບຄັງນີ້");
  }

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const [result] = await conn.query(
      `INSERT INTO stock_takes (warehouse_id, count_date, created_by) VALUES (?, ?, ?)`,
      [body.warehouseId, body.countDate, req.user.sub],
    );
    const stockTakeId = result.insertId;

    const [balances] = await conn.query(
      `SELECT product_id, quantity FROM stock_balance WHERE warehouse_id = ? AND quantity <> 0`,
      [body.warehouseId],
    );

    for (const balance of balances) {
      await conn.query(
        `INSERT INTO stock_take_items (stock_take_id, product_id, system_qty, counted_qty)
         VALUES (?, ?, ?, ?)`,
        [stockTakeId, balance.product_id, balance.quantity, balance.quantity],
      );
    }

    await conn.commit();
    const stockTake = await findStockTakeOr404(pool, stockTakeId);
    res.status(201).json(stockTake);
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
});

// บันทึกจำนวนที่นับได้จริงของสินค้า 1 รายการ (variance คำนวณอัตโนมัติจาก generated column)
const updateCount = asyncHandler(async (req, res) => {
  const body = updateCountSchema.parse(req.body);

  const stockTake = await findStockTakeOr404(pool, req.params.id);
  if (stockTake.status !== "IN_PROGRESS") {
    throw new AppError(400, "ຮອບກວດນັບນີ້ປິດໄປແລ້ວ ແກ້ໄຂບໍ່ໄດ້");
  }
  if (!(await userCanAccessWarehouse(req.user, stockTake.warehouse_id))) {
    throw new AppError(403, "ບໍ່ມີສິດທິແກ້ໄຂຮອບກວດນັບນີ້");
  }

  const [result] = await pool.query(
    `UPDATE stock_take_items SET counted_qty = ? WHERE id = ? AND stock_take_id = ?`,
    [body.countedQty, req.params.itemId, req.params.id],
  );
  if (!result.affectedRows) throw new AppError(404, "ບໍ່ພົບລາຍການນັບນີ້");

  const [rows] = await pool.query(
    "SELECT * FROM stock_take_items WHERE id = ?",
    [req.params.itemId],
  );
  res.json(rows[0]);
});

// ปิดรอบตรวจนับ — ส่วนต่าง (variance) ที่ไม่เท่ากับ 0 จะถูกบันทึกเป็น ADJUSTMENT เข้า stock_movements
// และปรับ stock_balance ให้ตรงกับยอดที่นับได้จริง
const completeStockTake = asyncHandler(async (req, res) => {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const stockTake = await findStockTakeOr404(conn, req.params.id);
    if (stockTake.status !== "IN_PROGRESS") {
      throw new AppError(400, "ຮອບກວດນັບນີ້ປິດໄປແລ້ວ");
    }
    if (!(await userCanAccessWarehouse(req.user, stockTake.warehouse_id))) {
      throw new AppError(403, "ບໍ່ມີສິດທິປິດຮອບກວດນັບນີ້");
    }

    const [items] = await conn.query(
      "SELECT * FROM stock_take_items WHERE stock_take_id = ?",
      [req.params.id],
    );

    for (const item of items) {
      const variance = Number(item.counted_qty) - Number(item.system_qty);
      if (!variance) continue;

      await recordMovement(conn, {
        productId: item.product_id,
        warehouseId: stockTake.warehouse_id,
        movementType: "ADJUSTMENT",
        quantity: variance,
        // ขาดั้งเดิม (ค่าลบ) ใช้ avg cost ปัจจุบันอัตโนมัติใน service
        // ส่วนเกิน (ค่าบวก) ต้องระบุต้นทุน ใช้ avg cost เดิมของคลังนี้เป็นฐาน
        unitValueLak:
          variance > 0
            ? await getAvgCost(conn, item.product_id, stockTake.warehouse_id)
            : undefined,
        referenceTable: "stock_takes",
        referenceId: stockTake.id,
        note: `ປັບຍອດຈາກການກວດນັບ: ລະບົບ ${item.system_qty} ນັບໄດ້ ${item.counted_qty}`,
        createdBy: req.user.sub,
      });
    }

    await conn.query(
      `UPDATE stock_takes SET status = 'COMPLETED' WHERE id = ?`,
      [req.params.id],
    );

    await conn.commit();
    const updated = await findStockTakeOr404(pool, req.params.id);
    res.json(updated);
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
});

async function getAvgCost(runner, productId, warehouseId) {
  const [rows] = await runner.query(
    "SELECT avg_unit_value_lak FROM stock_balance WHERE product_id = ? AND warehouse_id = ?",
    [productId, warehouseId],
  );
  return rows.length ? Number(rows[0].avg_unit_value_lak) : 0;
}

module.exports = {
  listStockTakes,
  getStockTake,
  createStockTake,
  updateCount,
  completeStockTake,
};
