const { z } = require("zod");
const pool = require("../config/db");
const AppError = require("../utils/AppError");
const asyncHandler = require("../utils/asyncHandler");
const { partialUpdate } = require("../utils/dbHelpers");

// ---------------------------------------------------------------------
// Groups (กลุ่มใหญ่ เช่น 'อุปกรณ์ก่อสร้าง') — ตาราง groups_ เพราะ GROUPS สงวนใน MySQL 8
// ---------------------------------------------------------------------

const groupSchema = z.object({
  nameLo: z.string().min(1),
  nameCn: z.string().optional().nullable(),
  warehouseTypeId: z.number().int().positive().optional().nullable(),
});

const listGroups = asyncHandler(async (req, res) => {
  const [rows] = await pool.query("SELECT * FROM groups_ ORDER BY id");
  res.json(rows);
});

const createGroup = asyncHandler(async (req, res) => {
  const body = groupSchema.parse(req.body);
  const [result] = await pool.query(
    "INSERT INTO groups_ (name_lo, name_cn, warehouse_type_id) VALUES (?, ?, ?)",
    [body.nameLo, body.nameCn ?? null, body.warehouseTypeId ?? null],
  );
  const [rows] = await pool.query("SELECT * FROM groups_ WHERE id = ?", [
    result.insertId,
  ]);
  res.status(201).json(rows[0]);
});

const updateGroup = asyncHandler(async (req, res) => {
  const body = groupSchema.partial().parse(req.body);
  await partialUpdate(pool, "groups_", req.params.id, {
    name_lo: body.nameLo,
    name_cn: body.nameCn,
    warehouse_type_id: body.warehouseTypeId,
  });
  const [rows] = await pool.query("SELECT * FROM groups_ WHERE id = ?", [
    req.params.id,
  ]);
  if (!rows.length) throw new AppError(404, "ບໍ່ພົບກຸ່ມສິນຄ້ານີ້");
  res.json(rows[0]);
});

// ---------------------------------------------------------------------
// Categories (หมวดย่อยภายใต้ group)
// ---------------------------------------------------------------------

const categorySchema = z.object({
  groupId: z.number().int().positive(),
  nameLo: z.string().min(1),
  nameCn: z.string().optional().nullable(),
  warehouseTypeId: z.number().int().positive().optional().nullable(),
});

const listCategories = asyncHandler(async (req, res) => {
  const { groupId } = req.query;
  const where = groupId ? "WHERE group_id = ?" : "";
  const params = groupId ? [groupId] : [];
  const [rows] = await pool.query(
    `SELECT * FROM categories ${where} ORDER BY id`,
    params,
  );
  res.json(rows);
});

const createCategory = asyncHandler(async (req, res) => {
  const body = categorySchema.parse(req.body);
  const [result] = await pool.query(
    "INSERT INTO categories (group_id, name_lo, name_cn, warehouse_type_id) VALUES (?, ?, ?, ?)",
    [
      body.groupId,
      body.nameLo,
      body.nameCn ?? null,
      body.warehouseTypeId ?? null,
    ],
  );
  const [rows] = await pool.query("SELECT * FROM categories WHERE id = ?", [
    result.insertId,
  ]);
  res.status(201).json(rows[0]);
});

const updateCategory = asyncHandler(async (req, res) => {
  const body = categorySchema.partial().parse(req.body);
  await partialUpdate(pool, "categories", req.params.id, {
    group_id: body.groupId,
    name_lo: body.nameLo,
    name_cn: body.nameCn,
    warehouse_type_id: body.warehouseTypeId,
  });
  const [rows] = await pool.query("SELECT * FROM categories WHERE id = ?", [
    req.params.id,
  ]);
  if (!rows.length) throw new AppError(404, "ບໍ່ພົບໝວດໝູ່ນີ້");
  res.json(rows[0]);
});

// ---------------------------------------------------------------------
// Usage areas (พื้นที่/จุดใช้งาน เช่น 'ไลน์ผลิต A')
// ---------------------------------------------------------------------

const usageAreaSchema = z.object({
  branchId: z.number().int().positive(),
  nameLo: z.string().min(1),
  nameCn: z.string().optional().nullable(),
});

const listUsageAreas = asyncHandler(async (req, res) => {
  const { branchId } = req.query;
  const where = branchId ? "WHERE branch_id = ?" : "";
  const params = branchId ? [branchId] : [];
  const [rows] = await pool.query(
    `SELECT * FROM usage_areas ${where} ORDER BY id`,
    params,
  );
  res.json(rows);
});

const createUsageArea = asyncHandler(async (req, res) => {
  const body = usageAreaSchema.parse(req.body);
  const [result] = await pool.query(
    "INSERT INTO usage_areas (branch_id, name_lo, name_cn) VALUES (?, ?, ?)",
    [body.branchId, body.nameLo, body.nameCn ?? null],
  );
  const [rows] = await pool.query("SELECT * FROM usage_areas WHERE id = ?", [
    result.insertId,
  ]);
  res.status(201).json(rows[0]);
});

const updateUsageArea = asyncHandler(async (req, res) => {
  const body = usageAreaSchema.partial().parse(req.body);
  await partialUpdate(pool, "usage_areas", req.params.id, {
    branch_id: body.branchId,
    name_lo: body.nameLo,
    name_cn: body.nameCn,
  });
  const [rows] = await pool.query("SELECT * FROM usage_areas WHERE id = ?", [
    req.params.id,
  ]);
  if (!rows.length) throw new AppError(404, "ບໍ່ພົບພື້ນທີ່ໃຊ້ງານນີ້");
  res.json(rows[0]);
});

module.exports = {
  listGroups,
  createGroup,
  updateGroup,
  listCategories,
  createCategory,
  updateCategory,
  listUsageAreas,
  createUsageArea,
  updateUsageArea,
};
