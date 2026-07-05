const { z } = require("zod");
const pool = require("../config/db");
const AppError = require("../utils/AppError");
const asyncHandler = require("../utils/asyncHandler");
const { recordMovement } = require("../services/stockMovementService");

const createRequestSchema = z.object({
  fromWarehouseId: z.number().int().positive(),
  toWarehouseId: z.number().int().positive(),
  note: z.string().optional().nullable(),
  items: z
    .array(
      z.object({
        productId: z.number().int().positive(),
        quantityRequested: z.number().positive(),
      }),
    )
    .min(1),
});

const approveSchema = z.object({
  items: z
    .array(
      z.object({
        itemId: z.number().int().positive(),
        quantityApproved: z.number().nonnegative(),
      }),
    )
    .min(1),
});

const rejectSchema = z.object({
  note: z.string().optional().nullable(),
});

async function findRequestOr404(runner, id) {
  const [rows] = await runner.query(
    "SELECT * FROM branch_requests WHERE id = ?",
    [id],
  );
  if (!rows.length) throw new AppError(404, "ບໍ່ພົບຄຳຂໍເບີກນີ້");
  return rows[0];
}

const listRequests = asyncHandler(async (req, res) => {
  const { status, toWarehouseId, fromWarehouseId } = req.query;
  const conditions = [];
  const params = [];
  if (status) {
    conditions.push("status = ?");
    params.push(status);
  }
  if (toWarehouseId) {
    conditions.push("to_warehouse_id = ?");
    params.push(toWarehouseId);
  }
  if (fromWarehouseId) {
    conditions.push("from_warehouse_id = ?");
    params.push(fromWarehouseId);
  }
  const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";

  const [rows] = await pool.query(
    `SELECT br.*, wf.name AS from_warehouse_name, wt.name AS to_warehouse_name
     FROM branch_requests br
     JOIN warehouses wf ON wf.id = br.from_warehouse_id
     JOIN warehouses wt ON wt.id = br.to_warehouse_id
     ${where}
     ORDER BY br.id DESC`,
    params,
  );
  res.json(rows);
});

const getRequest = asyncHandler(async (req, res) => {
  const request = await findRequestOr404(pool, req.params.id);
  const [items] = await pool.query(
    `SELECT bri.*, p.sku, p.name_lo AS product_name
     FROM branch_request_items bri
     JOIN products p ON p.id = bri.product_id
     WHERE bri.request_id = ?`,
    [req.params.id],
  );
  res.json({ ...request, items });
});

// คำขอเบิกจากสาขาไปยัง HQ — ต้อง from = คลังส่วนกลาง, to = คลังสาขา, และเป็นคลังประเภทเดียวกัน
const createRequest = asyncHandler(async (req, res) => {
  const body = createRequestSchema.parse(req.body);

  const [warehouses] = await pool.query(
    "SELECT id, is_central, warehouse_type_id FROM warehouses WHERE id IN (?, ?)",
    [body.fromWarehouseId, body.toWarehouseId],
  );
  const from = warehouses.find((w) => w.id === body.fromWarehouseId);
  const to = warehouses.find((w) => w.id === body.toWarehouseId);
  if (!from || !to) throw new AppError(404, "ບໍ່ພົບຄັງຕົ້ນທາງ ຫຼືປາຍທາງ");
  if (!from.is_central)
    throw new AppError(400, "ຄັງຕົ້ນທາງຕ້ອງເປັນຄັງສ່ວນກາງ (HQ)");
  if (to.is_central)
    throw new AppError(400, "ຄັງປາຍທາງຕ້ອງເປັນຄັງສາຂາ ບໍ່ແມ່ນຄັງສ່ວນກາງ");
  if (from.warehouse_type_id !== to.warehouse_type_id) {
    throw new AppError(400, "ຄັງຕົ້ນທາງແລະປາຍທາງຕ້ອງເປັນຄັງປະເພດດຽວກັນ");
  }

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const [result] = await conn.query(
      `INSERT INTO branch_requests (from_warehouse_id, to_warehouse_id, requested_by, note)
       VALUES (?, ?, ?, ?)`,
      [
        body.fromWarehouseId,
        body.toWarehouseId,
        req.user.sub,
        body.note ?? null,
      ],
    );
    const requestId = result.insertId;

    for (const item of body.items) {
      await conn.query(
        `INSERT INTO branch_request_items (request_id, product_id, quantity_requested)
         VALUES (?, ?, ?)`,
        [requestId, item.productId, item.quantityRequested],
      );
    }

    await conn.commit();
    const request = await findRequestOr404(pool, requestId);
    res.status(201).json(request);
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
});

// HQ approver พิจารณาจำนวนที่จะให้จริง (quantityApproved อาจน้อยกว่าที่ขอ)
const approveRequest = asyncHandler(async (req, res) => {
  const body = approveSchema.parse(req.body);

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const request = await findRequestOr404(conn, req.params.id);
    if (request.status !== "PENDING") {
      throw new AppError(400, "ຄຳຂໍນີ້ຖືກດຳເນີນການໄປແລ້ວ");
    }

    for (const item of body.items) {
      await conn.query(
        `UPDATE branch_request_items SET quantity_approved = ?
         WHERE id = ? AND request_id = ?`,
        [item.quantityApproved, item.itemId, req.params.id],
      );
    }

    await conn.query(
      `UPDATE branch_requests SET status = 'APPROVED', approved_by = ?, approved_at = NOW()
       WHERE id = ?`,
      [req.user.sub, req.params.id],
    );

    await conn.commit();
    const updated = await findRequestOr404(pool, req.params.id);
    res.json(updated);
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
});

const rejectRequest = asyncHandler(async (req, res) => {
  const body = rejectSchema.parse(req.body);
  const request = await findRequestOr404(pool, req.params.id);
  if (request.status !== "PENDING") {
    throw new AppError(400, "ຄຳຂໍນີ້ຖືກດຳເນີນການໄປແລ້ວ");
  }
  await pool.query(
    `UPDATE branch_requests SET status = 'REJECTED', approved_by = ?, approved_at = NOW(), note = ?
     WHERE id = ?`,
    [req.user.sub, body.note ?? request.note, req.params.id],
  );
  const updated = await findRequestOr404(pool, req.params.id);
  res.json(updated);
});

// ย้ายสต็อกจริง หลังอนุมัติแล้ว: TRANSFER_OUT จาก HQ + TRANSFER_IN เข้าสาขา ด้วยต้นทุนเดียวกัน
const transferRequest = asyncHandler(async (req, res) => {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const request = await findRequestOr404(conn, req.params.id);
    if (request.status !== "APPROVED") {
      throw new AppError(400, "ຕ້ອງອະນຸມັດຄຳຂໍນີ້ກ່ອນຈຶ່ງຈະໂອນສະຕັອກໄດ້");
    }

    const [items] = await conn.query(
      "SELECT * FROM branch_request_items WHERE request_id = ?",
      [req.params.id],
    );

    for (const item of items) {
      const qty = Number(item.quantity_approved);
      if (!qty) continue;

      const { unitValueLak } = await recordMovement(conn, {
        productId: item.product_id,
        warehouseId: request.from_warehouse_id,
        movementType: "TRANSFER_OUT",
        quantity: -qty,
        referenceTable: "branch_requests",
        referenceId: request.id,
        createdBy: req.user.sub,
      });

      await recordMovement(conn, {
        productId: item.product_id,
        warehouseId: request.to_warehouse_id,
        movementType: "TRANSFER_IN",
        quantity: qty,
        unitValueLak,
        referenceTable: "branch_requests",
        referenceId: request.id,
        createdBy: req.user.sub,
      });
    }

    await conn.query(
      `UPDATE branch_requests SET status = 'TRANSFERRED' WHERE id = ?`,
      [req.params.id],
    );

    await conn.commit();
    const updated = await findRequestOr404(pool, req.params.id);
    res.json(updated);
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
});

module.exports = {
  listRequests,
  getRequest,
  createRequest,
  approveRequest,
  rejectRequest,
  transferRequest,
};
