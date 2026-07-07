const { z } = require("zod");
const pool = require("../config/db");
const AppError = require("../utils/AppError");
const asyncHandler = require("../utils/asyncHandler");
const { recordMovement } = require("../services/stockMovementService");
const {
  userCanAccessWarehouse,
  warehouseStaffWarehouseId,
} = require("../middleware/roleMiddleware");

const createUsageSchema = z.object({
  warehouseId: z.number().int().positive(),
  productId: z.number().int().positive(),
  quantity: z.number().positive(),
  note: z.string().optional().nullable(),
});

// ບັນທຶກການນຳໃຊ້ອຸປະກອນພາຍໃນສາງຕົນເອງ — ຕັດສະຕັອກທັນທີ ບໍ່ຕ້ອງຜ່ານການອະນຸມັດ (ຄົນລະຟີເຈີກັບໃບເບີກ)
const createUsage = asyncHandler(async (req, res) => {
  const body = createUsageSchema.parse(req.body);

  if (!(await userCanAccessWarehouse(req.user, body.warehouseId))) {
    throw new AppError(403, "ບໍ່ມີສິດທິບັນທຶກການນຳໃຊ້ຢູ່ຄັງນີ້");
  }

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const { movementId } = await recordMovement(conn, {
      productId: body.productId,
      warehouseId: body.warehouseId,
      movementType: "USAGE",
      quantity: -body.quantity,
      referenceTable: null,
      referenceId: null,
      note: body.note ?? null,
      createdBy: req.user.sub,
    });

    await conn.commit();

    const [rows] = await pool.query(
      `SELECT sm.*, p.sku, p.name_lo AS product_name, w.name AS warehouse_name,
              u.username AS created_by_username
       FROM stock_movements sm
       JOIN products p ON p.id = sm.product_id
       JOIN warehouses w ON w.id = sm.warehouse_id
       JOIN users u ON u.id = sm.created_by
       WHERE sm.id = ?`,
      [movementId],
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
});

const listUsages = asyncHandler(async (req, res) => {
  const ownWarehouseId = warehouseStaffWarehouseId(req.user);
  const warehouseId = ownWarehouseId ?? req.query.warehouseId;

  const conditions = ["sm.movement_type = 'USAGE'"];
  const params = [];
  if (warehouseId) {
    conditions.push("sm.warehouse_id = ?");
    params.push(warehouseId);
  }

  const [rows] = await pool.query(
    `SELECT sm.*, p.sku, p.name_lo AS product_name, w.name AS warehouse_name,
            u.username AS created_by_username
     FROM stock_movements sm
     JOIN products p ON p.id = sm.product_id
     JOIN warehouses w ON w.id = sm.warehouse_id
     JOIN users u ON u.id = sm.created_by
     WHERE ${conditions.join(" AND ")}
     ORDER BY sm.id DESC`,
    params,
  );
  res.json(rows);
});

module.exports = { createUsage, listUsages };
