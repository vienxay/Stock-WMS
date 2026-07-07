const { z } = require("zod");
const pool = require("../config/db");
const AppError = require("../utils/AppError");
const asyncHandler = require("../utils/asyncHandler");
const { recordMovement } = require("../services/stockMovementService");
const {
  userCanAccessWarehouse,
  warehouseStaffWarehouseId,
} = require("../middleware/roleMiddleware");

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

async function findRequisitionOr404(runner, id) {
  const [rows] = await runner.query("SELECT * FROM requisitions WHERE id = ?", [
    id,
  ]);
  if (!rows.length) throw new AppError(404, "ບໍ່ພົບໃບຂໍເບີກນີ້");
  return rows[0];
}

const listRequisitions = asyncHandler(async (req, res) => {
  const ownWarehouseId = warehouseStaffWarehouseId(req.user);
  const { status, employeeId } = req.query;
  const warehouseId = ownWarehouseId ?? req.query.warehouseId;
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

  if (!(await userCanAccessWarehouse(req.user, body.warehouseId))) {
    throw new AppError(403, "ບໍ່ມີສິດທິສ້າງໃບຂໍເບີກໃຫ້ຄັງນີ້");
  }

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

// Branch Admin ອະນຸມັດ = ຈ່າຍເຄື່ອງທັນທີໃນຂັ້ນຕອນດຽວ ໂດຍໃຊ້ຈຳນວນທີ່ຂໍເບີກມາເປັ໊ະໆ (ບໍ່ມີການແກ້ໄຂຈຳນວນ)
// ບໍ່ຕ້ອງກົດ "ຈ່າຍເຄື່ອງ" ແຍກອີກຂັ້ນຕອນຄືເກົ່າ — ອະນຸມັດແລ້ວ ສະຕັອກຫຼຸດທັນທີ, ຈາກນັ້ນລໍ Warehouse Staff ກົດຢືນຢັນຮັບເຄື່ອງ
const approveRequisition = asyncHandler(async (req, res) => {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const requisition = await findRequisitionOr404(conn, req.params.id);
    if (requisition.status !== "PENDING") {
      throw new AppError(400, "ໃບຂໍເບີກນີ້ຖືກດຳເນີນການໄປແລ້ວ");
    }
    if (!(await userCanAccessWarehouse(req.user, requisition.warehouse_id))) {
      throw new AppError(403, "ບໍ່ມີສິດທິອະນຸມັດໃບຂໍເບີກນີ້");
    }

    const [items] = await conn.query(
      "SELECT * FROM requisition_items WHERE requisition_id = ?",
      [req.params.id],
    );

    for (const item of items) {
      await conn.query(
        "UPDATE requisition_items SET quantity_issued = quantity_requested WHERE id = ?",
        [item.id],
      );

      await recordMovement(conn, {
        productId: item.product_id,
        warehouseId: requisition.warehouse_id,
        movementType: "ISSUE",
        quantity: -Number(item.quantity_requested),
        referenceTable: "requisitions",
        referenceId: requisition.id,
        createdBy: req.user.sub,
      });
    }

    await conn.query(
      `UPDATE requisitions SET status = 'ISSUED', approved_by = ?, approved_at = NOW() WHERE id = ?`,
      [req.user.sub, req.params.id],
    );

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

const rejectRequisition = asyncHandler(async (req, res) => {
  const requisition = await findRequisitionOr404(pool, req.params.id);
  if (requisition.status !== "PENDING") {
    throw new AppError(400, "ໃບຂໍເບີກນີ້ຖືກດຳເນີນການໄປແລ້ວ");
  }
  if (!(await userCanAccessWarehouse(req.user, requisition.warehouse_id))) {
    throw new AppError(403, "ບໍ່ມີສິດທິປະຕິເສດໃບຂໍເບີກນີ້");
  }
  await pool.query(
    `UPDATE requisitions SET status = 'REJECTED', approved_by = ?, approved_at = NOW() WHERE id = ?`,
    [req.user.sub, req.params.id],
  );
  const updated = await findRequisitionOr404(pool, req.params.id);
  res.json(updated);
});

// Warehouse Staff ຢືນຢັນວ່າໄດ້ຮັບເຄື່ອງແລ້ວ — ບໍ່ກະທົບສະຕັອກ (ຕັດໄປແລ້ວຕອນອະນຸມັດ) ແຄ່ປິດວຽກ/ບັນທຶກຜູ້ຮັບ
const confirmReceipt = asyncHandler(async (req, res) => {
  const requisition = await findRequisitionOr404(pool, req.params.id);
  if (requisition.status !== "ISSUED") {
    throw new AppError(400, "ຕ້ອງຈ່າຍເຄື່ອງກ່ອນຈຶ່ງຈະຢືນຢັນຮັບເຄື່ອງໄດ້");
  }
  if (!(await userCanAccessWarehouse(req.user, requisition.warehouse_id))) {
    throw new AppError(403, "ບໍ່ມີສິດທິຢືນຢັນຮັບເຄື່ອງໃບຂໍເບີກນີ້");
  }
  await pool.query(
    `UPDATE requisitions SET status = 'RECEIVED', received_by = ?, received_at = NOW() WHERE id = ?`,
    [req.user.sub, req.params.id],
  );
  const updated = await findRequisitionOr404(pool, req.params.id);
  res.json(updated);
});

module.exports = {
  listRequisitions,
  getRequisition,
  createRequisition,
  approveRequisition,
  rejectRequisition,
  confirmReceipt,
};
