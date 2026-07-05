const { z } = require("zod");
const fs = require("fs/promises");
const path = require("path");
const pool = require("../config/db");
const AppError = require("../utils/AppError");
const asyncHandler = require("../utils/asyncHandler");
const { partialUpdate } = require("../utils/dbHelpers");

const productSchema = z.object({
  sku: z.string().min(1).max(50),
  barcode: z.string().optional().nullable(),
  nameLo: z.string().min(1),
  nameCn: z.string().optional().nullable(),
  modelNo: z.string().optional().nullable(),
  size: z.string().optional().nullable(),
  categoryId: z.number().int().positive().optional().nullable(),
  unitLo: z.string().min(1),
  defaultUsageAreaId: z.number().int().positive().optional().nullable(),
  defaultBranchId: z.number().int().positive().optional().nullable(),
  responsibleEmployeeId: z.number().int().positive().optional().nullable(),
  reorderPoint: z.number().nonnegative().optional(),
  isActive: z.boolean().optional(),
});

async function findProductOr404(id) {
  const [rows] = await pool.query("SELECT * FROM products WHERE id = ?", [id]);
  if (!rows.length) throw new AppError(404, "ບໍ່ພົບສິນຄ້ານີ້");
  return rows[0];
}

// รายการสินค้า รองรับค้นหาชื่อ/รหัส และแบ่งหน้า
const listProducts = asyncHandler(async (req, res) => {
  const { q, categoryId, isActive, limit = "50", offset = "0" } = req.query;

  const conditions = [];
  const params = [];

  if (q) {
    conditions.push(
      "(p.sku LIKE ? OR p.name_lo LIKE ? OR p.name_cn LIKE ? OR p.barcode LIKE ?)",
    );
    const term = `%${q}%`;
    params.push(term, term, term, term);
  }
  if (categoryId) {
    conditions.push("p.category_id = ?");
    params.push(categoryId);
  }
  if (isActive !== undefined) {
    conditions.push("p.is_active = ?");
    params.push(isActive === "true" ? 1 : 0);
  }

  const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
  const safeLimit = Math.min(Number(limit) || 50, 200);
  const safeOffset = Number(offset) || 0;

  const [rows] = await pool.query(
    `SELECT p.*, c.name_lo AS category_name,
            pi.image_url AS primary_image_url
     FROM products p
     LEFT JOIN categories c ON c.id = p.category_id
     LEFT JOIN product_images pi ON pi.product_id = p.id AND pi.is_primary = TRUE
     ${where}
     ORDER BY p.id DESC
     LIMIT ? OFFSET ?`,
    [...params, safeLimit, safeOffset],
  );
  res.json(rows);
});

const getProduct = asyncHandler(async (req, res) => {
  const product = await findProductOr404(req.params.id);
  const [images] = await pool.query(
    "SELECT * FROM product_images WHERE product_id = ? ORDER BY is_primary DESC, id",
    [req.params.id],
  );
  res.json({ ...product, images });
});

// สต็อกคงเหลือของสินค้านี้ แยกตามคลัง
const getProductStock = asyncHandler(async (req, res) => {
  await findProductOr404(req.params.id);
  const [rows] = await pool.query(
    `SELECT sb.warehouse_id, w.name AS warehouse_name, sb.quantity, sb.avg_unit_value_lak
     FROM stock_balance sb
     JOIN warehouses w ON w.id = sb.warehouse_id
     WHERE sb.product_id = ?
     ORDER BY w.name`,
    [req.params.id],
  );
  res.json(rows);
});

const createProduct = asyncHandler(async (req, res) => {
  const body = productSchema.parse(req.body);
  const [result] = await pool.query(
    `INSERT INTO products
      (sku, barcode, name_lo, name_cn, model_no, size, category_id, unit_lo,
       default_usage_area_id, default_branch_id, responsible_employee_id, reorder_point, is_active)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      body.sku,
      body.barcode ?? null,
      body.nameLo,
      body.nameCn ?? null,
      body.modelNo ?? null,
      body.size ?? null,
      body.categoryId ?? null,
      body.unitLo,
      body.defaultUsageAreaId ?? null,
      body.defaultBranchId ?? null,
      body.responsibleEmployeeId ?? null,
      body.reorderPoint ?? 0,
      body.isActive ?? true,
    ],
  );
  const product = await findProductOr404(result.insertId);
  res.status(201).json(product);
});

const updateProduct = asyncHandler(async (req, res) => {
  const body = productSchema.partial().parse(req.body);
  await partialUpdate(pool, "products", req.params.id, {
    sku: body.sku,
    barcode: body.barcode,
    name_lo: body.nameLo,
    name_cn: body.nameCn,
    model_no: body.modelNo,
    size: body.size,
    category_id: body.categoryId,
    unit_lo: body.unitLo,
    default_usage_area_id: body.defaultUsageAreaId,
    default_branch_id: body.defaultBranchId,
    responsible_employee_id: body.responsibleEmployeeId,
    reorder_point: body.reorderPoint,
    is_active: body.isActive,
  });
  const product = await findProductOr404(req.params.id);
  res.json(product);
});

// ---------------------------------------------------------------------
// รูปภาพสินค้า
// ---------------------------------------------------------------------

const addProductImage = asyncHandler(async (req, res) => {
  await findProductOr404(req.params.id);
  if (!req.file) throw new AppError(400, "ບໍ່ມີໄຟລ໌ຮູບແນບມາ");

  const imageUrl = `/uploads/products/${req.file.filename}`;
  const isPrimary =
    req.body.isPrimary === "true" || req.body.isPrimary === true;

  const [result] = await pool.query(
    "INSERT INTO product_images (product_id, image_url, is_primary, uploaded_by) VALUES (?, ?, ?, ?)",
    [req.params.id, imageUrl, isPrimary, req.user.sub],
  );
  const [rows] = await pool.query("SELECT * FROM product_images WHERE id = ?", [
    result.insertId,
  ]);
  res.status(201).json(rows[0]);
});

const setPrimaryProductImage = asyncHandler(async (req, res) => {
  // trigger trg_one_primary_image_update จัดการปลดภาพหลักเดิมให้อัตโนมัติ
  const [result] = await pool.query(
    "UPDATE product_images SET is_primary = TRUE WHERE id = ? AND product_id = ?",
    [req.params.imageId, req.params.id],
  );
  if (!result.affectedRows) throw new AppError(404, "ບໍ່ພົບຮູບພາບນີ້");
  res.status(204).send();
});

const deleteProductImage = asyncHandler(async (req, res) => {
  const [rows] = await pool.query(
    "SELECT * FROM product_images WHERE id = ? AND product_id = ?",
    [req.params.imageId, req.params.id],
  );
  const image = rows[0];
  if (!image) throw new AppError(404, "ບໍ່ພົບຮູບພາບນີ້");

  await pool.query("DELETE FROM product_images WHERE id = ?", [image.id]);

  const filePath = path.resolve(
    process.cwd(),
    process.env.UPLOAD_DIR || "uploads",
    "products",
    path.basename(image.image_url),
  );
  await fs.unlink(filePath).catch(() => {}); // ไฟล์อาจถูกลบไปแล้วหรือย้ายที่ ไม่ถือเป็น error ของ request นี้

  res.status(204).send();
});

// ลบสินค้าได้เฉพาะที่ยังไม่เคยมีประวัติเคลื่อนไหวสต็อกเลย
// ถ้าเคยรับเข้า/เบิกจ่าย/โอน/ตรวจนับไปแล้ว foreign key constraint จะกันไว้เอง
// (แปลงเป็น 409 ให้อัตโนมัติที่ errorMiddleware) เพื่อไม่ให้ audit trail ขาดหาย
const deleteProduct = asyncHandler(async (req, res) => {
  await findProductOr404(req.params.id);
  await pool.query('DELETE FROM products WHERE id = ?', [req.params.id]);
  res.status(204).send();
});

module.exports = {
  listProducts,
  getProduct,
  getProductStock,
  createProduct,
  updateProduct,
  deleteProduct,
  addProductImage,
  setPrimaryProductImage,
  deleteProductImage,
};
