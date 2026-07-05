const { z } = require("zod");
const pool = require("../config/db");
const AppError = require("../utils/AppError");
const asyncHandler = require("../utils/asyncHandler");
const { recordMovement } = require("../services/stockMovementService");

const createRequisitionSchema = z.object({
  warehouseId: z.number().int().positive(),
  departmentId: z.number().int().positive().optional().nullable(),
  purpose: z.string().optional().nullable(),
  items: z
    .array(
      z.object({
        productId: z.number().int().positive(),
        quantityRequested: z.number().positive(),
      }),
    )
    .min(1),
});

const issueSchema = z.object({
  items: z
    .array(
      z.object({
        itemId: z.number().int().positive(),
        quantityIssued: z.number().nonnegative(),
      }),
    )
    .min(1),
});

async function findRequisitionOr404(runner, id) {
  const [rows] = await runner.query("SELECT * FROM requisitions WHERE id = ?", [
    id,
  ]);
  if (!rows.length) throw new AppError(404, "ไม่พบใบขอเบิกนี้");
  return rows[0];
}

const listRequisitions = asyncHandler(async (req, res) => {
  const { status, warehouseId, employeeId } = req.query;
  const conditions = [];
  const params = [];
  if (status) {
    conditions.push("r.status = ?");
    params.push(status);
  }
  if (warehouseId) {
    conditions.push("r.warehouse_id = ?");
    params.push(warehouseId);
  }
  if (employeeId) {
    conditions.push("r.employee_id = ?");
    params.push(employeeId);
  }
  const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";

  const [rows] = await pool.query(
    `SELECT r.*, w.name AS warehouse_name, e.full_name AS employee_name, d.name AS department_name
     FROM requisitions r
     JOIN warehouses w ON w.id = r.warehouse_id
     JOIN employees e ON e.id = r.employee_id
     LEFT JOIN departments d ON d.id = r.department_id
     ${where}
     ORDER BY r.id DESC`,
    params,
  );
  res.json(rows);
});

const getRequisition = asyncHandler(async (req, res) => {
  const requisition = await findRequisitionOr404(pool, req.params.id);
  const [items] = await pool.query(
    `SELECT ri.*, p.sku, p.name_lo AS product_name
     FROM requisition_items ri
     JOIN products p ON p.id = ri.product_id
     WHERE ri.requisition_id = ?`,
    [req.params.id],
  );
  res.json({ ...requisition, items });
});

// ใบขอเบิกใช้งานจริงของพนักงาน — employee_id มาจากบัญชีผู้ login เอง ไม่รับจาก client
const createRequisition = asyncHandler(async (req, res) => {
  const body = createRequisitionSchema.parse(req.body);

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const [result] = await conn.query(
      `INSERT INTO requisitions (warehouse_id, employee_id, department_id, purpose)
       VALUES (?, ?, ?, ?)`,
      [
        body.warehouseId,
        req.user.employeeId,
        body.departmentId ?? null,
        body.purpose ?? null,
      ],
    );
    const requisitionId = result.insertId;

    for (const item of body.items) {
      await conn.query(
        `INSERT INTO requisition_items (requisition_id, product_id, quantity_requested)
         VALUES (?, ?, ?)`,
        [requisitionId, item.productId, item.quantityRequested],
      );
    }

    await conn.commit();
    const requisition = await findRequisitionOr404(pool, requisitionId);
    res.status(201).json(requisition);
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
});

// หัวหน้าแผนก/ผู้อนุมัติ อนุมัติเป็นภาพรวม (จำนวนที่ให้จริงจะกำหนดตอน issue อีกที)
const approveRequisition = asyncHandler(async (req, res) => {
  const requisition = await findRequisitionOr404(pool, req.params.id);
  if (requisition.status !== "PENDING") {
    throw new AppError(400, "ใบขอเบิกนี้ถูกดำเนินการไปแล้ว");
  }
  await pool.query(
    `UPDATE requisitions SET status = 'APPROVED', approved_by = ?, approved_at = NOW() WHERE id = ?`,
    [req.user.sub, req.params.id],
  );
  const updated = await findRequisitionOr404(pool, req.params.id);
  res.json(updated);
});

const rejectRequisition = asyncHandler(async (req, res) => {
  const requisition = await findRequisitionOr404(pool, req.params.id);
  if (requisition.status !== "PENDING") {
    throw new AppError(400, "ใบขอเบิกนี้ถูกดำเนินการไปแล้ว");
  }
  await pool.query(
    `UPDATE requisitions SET status = 'REJECTED', approved_by = ?, approved_at = NOW() WHERE id = ?`,
    [req.user.sub, req.params.id],
  );
  const updated = await findRequisitionOr404(pool, req.params.id);
  res.json(updated);
});

// เจ้าหน้าที่คลังสาขาจ่ายของจริง — จำนวนที่จ่ายอาจน้อยกว่าที่ขอถ้าของไม่พอ
const issueRequisition = asyncHandler(async (req, res) => {
  const body = issueSchema.parse(req.body);

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const requisition = await findRequisitionOr404(conn, req.params.id);
    if (requisition.status !== "APPROVED") {
      throw new AppError(400, "ต้องอนุมัติใบขอเบิกนี้ก่อนจึงจะจ่ายของได้");
    }

    for (const item of body.items) {
      if (!item.quantityIssued) continue;

      const [itemRows] = await conn.query(
        "SELECT * FROM requisition_items WHERE id = ? AND requisition_id = ?",
        [item.itemId, req.params.id],
      );
      if (!itemRows.length)
        throw new AppError(404, `ไม่พบรายการเบิก id ${item.itemId}`);

      await conn.query(
        "UPDATE requisition_items SET quantity_issued = ? WHERE id = ?",
        [item.quantityIssued, item.itemId],
      );

      await recordMovement(conn, {
        productId: itemRows[0].product_id,
        warehouseId: requisition.warehouse_id,
        movementType: "ISSUE",
        quantity: -item.quantityIssued,
        referenceTable: "requisitions",
        referenceId: requisition.id,
        createdBy: req.user.sub,
      });
    }

    await conn.query(`UPDATE requisitions SET status = 'ISSUED' WHERE id = ?`, [
      req.params.id,
    ]);

    await conn.commit();
    const updated = await findRequisitionOr404(pool, req.params.id);
    res.json(updated);
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
});

module.exports = {
  listRequisitions,
  getRequisition,
  createRequisition,
  approveRequisition,
  rejectRequisition,
  issueRequisition,
};
