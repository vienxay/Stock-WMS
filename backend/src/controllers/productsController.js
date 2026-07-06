const { z } = require("zod");
const fs = require("fs/promises");
const path = require("path");
const { Readable } = require("stream");
const ExcelJS = require("exceljs");
const pool = require("../config/db");
const AppError = require("../utils/AppError");
const asyncHandler = require("../utils/asyncHandler");
const { partialUpdate } = require("../utils/dbHelpers");
const { recordMovement } = require("../services/stockMovementService");

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
            pi.image_url AS primary_image_url,
            COALESCE(
              (SELECT SUM(sb.quantity) FROM stock_balance sb WHERE sb.product_id = p.id),
              0
            ) AS total_quantity
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

// MySQL ห้าม trigger แก้ตารางเดียวกับที่มันผูกอยู่ (ER_CANT_UPDATE_USED_TABLE_IN_SF_OR_TRG)
// เลยบังคับ "มีภาพหลักได้ภาพเดียวต่อสินค้า" ในโค้ดนี้แทน โดยปลดภาพหลักเดิมก่อนแล้วค่อย insert/update ในทรานแซกชันเดียวกัน
const addProductImage = asyncHandler(async (req, res) => {
  await findProductOr404(req.params.id);
  if (!req.file) throw new AppError(400, "ບໍ່ມີໄຟລ໌ຮູບແນບມາ");

  const imageUrl = `/uploads/products/${req.file.filename}`;
  const isPrimary =
    req.body.isPrimary === "true" || req.body.isPrimary === true;

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    if (isPrimary) {
      await conn.query(
        "UPDATE product_images SET is_primary = FALSE WHERE product_id = ?",
        [req.params.id],
      );
    }
    const [result] = await conn.query(
      "INSERT INTO product_images (product_id, image_url, is_primary, uploaded_by) VALUES (?, ?, ?, ?)",
      [req.params.id, imageUrl, isPrimary, req.user.sub],
    );
    await conn.commit();
    const [rows] = await pool.query(
      "SELECT * FROM product_images WHERE id = ?",
      [result.insertId],
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
});

const setPrimaryProductImage = asyncHandler(async (req, res) => {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    await conn.query(
      "UPDATE product_images SET is_primary = FALSE WHERE product_id = ? AND id <> ?",
      [req.params.id, req.params.imageId],
    );
    const [result] = await conn.query(
      "UPDATE product_images SET is_primary = TRUE WHERE id = ? AND product_id = ?",
      [req.params.imageId, req.params.id],
    );
    if (!result.affectedRows) throw new AppError(404, "ບໍ່ພົບຮູບພາບນີ້");
    await conn.commit();
    res.status(204).send();
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
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
  await pool.query("DELETE FROM products WHERE id = ?", [req.params.id]);
  res.status(204).send();
});

const bulkDeleteSchema = z.object({
  ids: z.array(z.number().int().positive()).min(1),
});

// ลบทีละหลายรายการ — แต่ละ id ที่ลบไม่ได้ (มีประวัติผูกอยู่) จะข้ามไปแล้วบันทึกเป็น error
// ไม่ทำให้รายการอื่นที่ลบได้พลอยลบไม่สำเร็จไปด้วย
const bulkDeleteProducts = asyncHandler(async (req, res) => {
  const { ids } = bulkDeleteSchema.parse(req.body);

  const deleted = [];
  const errors = [];
  for (const id of ids) {
    try {
      const [result] = await pool.query("DELETE FROM products WHERE id = ?", [
        id,
      ]);
      if (result.affectedRows) deleted.push(id);
      else errors.push({ id, message: "ບໍ່ພົບສິນຄ້ານີ້" });
    } catch (err) {
      if (err.code === "ER_ROW_IS_REFERENCED_2") {
        errors.push({
          id,
          message: "ລຶບບໍ່ໄດ້ ເນື່ອງຈາກມີປະຫວັດການນຳໃຊ້ຢູ່ແລ້ວ",
        });
      } else {
        errors.push({ id, message: err.message });
      }
    }
  }

  res.json({ deleted, errors });
});

// ---------------------------------------------------------------------
// ນຳເຂົ້າສິນຄ້າຈຳນວນຫຼາຍພ້ອມກັນຈາກໄຟລ໌ Excel
// ---------------------------------------------------------------------

// header ในแถวแรกของไฟล์ Excel -> field key ที่เราใช้ภายใน (รองรับทั้งภาษาลาวและอังกฤษ)
const IMPORT_HEADER_ALIASES = {
  sku: "sku",
  "ຊື່ສິນຄ້າ (ລາວ)": "nameLo",
  "ຊື່ (ລາວ)": "nameLo",
  name: "nameLo",
  "ຊື່ສິນຄ້າ (ຈີນ)": "nameCn",
  "ຊື່ (ຈີນ)": "nameCn",
  ບາໂຄດ: "barcode",
  barcode: "barcode",
  ຮຸ່ນ: "modelNo",
  model: "modelNo",
  ຂະໜາດ: "size",
  size: "size",
  ໝວດໝູ່: "categoryName",
  category: "categoryName",
  ໜ່ວຍ: "unitLo",
  unit: "unitLo",
  ຈຸດສັ່ງຊື້ຂັ້ນຕ່ຳ: "reorderPoint", // ชื่อเดิม เก็บไว้ให้ไฟล์เก่ายังใช้ได้
  ຈຳນວນເຕືອນສິນຄ້າໃກ້ໝົດ: "reorderPoint",
  "reorder point": "reorderPoint",
  ສາງ: "warehouseName",
  warehouse: "warehouseName",
  ຈຳນວນເລີ່ມຕົ້ນ: "initialQuantity",
  "initial quantity": "initialQuantity",
  quantity: "initialQuantity",
};

// normalize รูปแบบ unicode (NFC) + ตัดช่องว่างพิเศษ (non-breaking space, zero-width) ออก
// เพราะไฟล์ที่ผ่าน Excel/WPS มาอาจเก็บตัวอักษรลาว/ช่องว่างคนละรูปแบบกับที่เราพิมพ์ในโค้ด
const INVISIBLE_CODES = [0x00a0, 0x200b, 0x200c, 0x200d, 0xfeff];
const INVISIBLE_CHARS_RE = new RegExp(
  "[" + INVISIBLE_CODES.map((c) => String.fromCharCode(c)).join("") + "]",
  "g",
);

function normalizeHeader(value) {
  return String(value ?? "")
    .normalize("NFC")
    .replace(INVISIBLE_CHARS_RE, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

function cellText(cell) {
  const value = cell.value;
  if (value === null || value === undefined) return "";
  if (typeof value === "object" && "text" in value)
    return String(value.text).trim();
  if (typeof value === "object" && "richText" in value) {
    return value.richText
      .map((r) => r.text)
      .join("")
      .trim();
  }
  return String(value).trim();
}

// ดาวน์โหลดแบบฟอร์ม Excel เปล่าพร้อม header + ตัวอย่าง 1 แถว ให้ผู้ใช้กรอกแล้วนำเข้ากลับมา
const getImportTemplate = asyncHandler(async (req, res) => {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("Products");
  sheet.columns = [
    { header: "SKU", key: "sku", width: 15 },
    { header: "ຊື່ສິນຄ້າ (ລາວ)", key: "nameLo", width: 30 },
    { header: "ຊື່ສິນຄ້າ (ຈີນ)", key: "nameCn", width: 25 },
    { header: "ບາໂຄດ", key: "barcode", width: 15 },
    { header: "ຮຸ່ນ", key: "modelNo", width: 15 },
    { header: "ຂະໜາດ", key: "size", width: 15 },
    { header: "ໝວດໝູ່", key: "categoryName", width: 20 },
    { header: "ໜ່ວຍ", key: "unitLo", width: 10 },
    { header: "ຈຳນວນເຕືອນສິນຄ້າໃກ້ໝົດ", key: "reorderPoint", width: 22 },
    { header: "ຄັງ", key: "warehouseName", width: 25 },
    { header: "ຈຳນວນເລີ່ມຕົ້ນ", key: "initialQuantity", width: 15 },
  ];
  sheet.getRow(1).font = { bold: true };
  sheet.addRow({
    sku: "ABC-001",
    nameLo: "ຕົວຢ່າງສິນຄ້າ",
    nameCn: "示例产品",
    barcode: "",
    modelNo: "",
    size: "",
    categoryName: "",
    unitLo: "ອັນ",
    reorderPoint: 10,
    warehouseName: "",
    initialQuantity: "",
  });

  res.setHeader(
    "Content-Type",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  );
  res.setHeader(
    "Content-Disposition",
    'attachment; filename="product-import-template.xlsx"',
  );
  await workbook.xlsx.write(res);
  res.end();
});

const NORMALIZED_HEADER_ALIASES = Object.fromEntries(
  Object.entries(IMPORT_HEADER_ALIASES).map(([k, v]) => [
    normalizeHeader(k),
    v,
  ]),
);

// นำเข้า/อัปเดตสินค้าจากไฟล์ Excel — จับคู่ด้วย SKU: มีอยู่แล้วอัปเดต ไม่มีสร้างใหม่
const bulkImportProducts = asyncHandler(async (req, res) => {
  if (!req.file) throw new AppError(400, "ບໍ່ມີໄຟລ໌ແນບມາ");

  const ext = path.extname(req.file.originalname).toLowerCase();
  let sheet;
  if (ext === ".csv") {
    const workbook = new ExcelJS.Workbook();
    sheet = await workbook.csv.read(Readable.from(req.file.buffer));
  } else {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(req.file.buffer);
    sheet = workbook.worksheets[0];
  }
  if (!sheet) throw new AppError(400, "ບໍ່ພົບຊີດຂໍ້ມູນໃນໄຟລ໌");

  const columnFieldMap = {};
  const detectedHeaders = [];
  sheet.getRow(1).eachCell((cell, colNumber) => {
    const rawHeader = cellText(cell);
    if (rawHeader) detectedHeaders.push(rawHeader);
    const key = NORMALIZED_HEADER_ALIASES[normalizeHeader(rawHeader)];
    if (key) columnFieldMap[colNumber] = key;
  });

  const mappedFields = new Set(Object.values(columnFieldMap));
  if (!mappedFields.has("sku") || !mappedFields.has("nameLo")) {
    throw new AppError(
      400,
      `ໄຟລ໌ Excel ຕ້ອງມີຄໍລໍາ SKU ແລະ ຊື່ສິນຄ້າ (ລາວ) ຢ່າງໜ້ອຍ — ກະລຸນາໃຊ້ແບບຟອມທີ່ດາວໂຫຼດໄວ້. ຄໍລໍາທີ່ພົບໃນໄຟລ໌: ${detectedHeaders.join(", ") || "(ບໍ່ພົບ header ເລີຍ)"}`,
    );
  }

  const [categories] = await pool.query("SELECT id, name_lo FROM categories");
  const categoryByName = new Map(
    categories.map((c) => [normalizeHeader(c.name_lo), c.id]),
  );
  const [warehouses] = await pool.query("SELECT id, name FROM warehouses");
  const warehouseByName = new Map(
    warehouses.map((w) => [normalizeHeader(w.name), w.id]),
  );

  let created = 0;
  let updated = 0;
  const errors = [];

  for (let rowNumber = 2; rowNumber <= sheet.rowCount; rowNumber++) {
    const row = sheet.getRow(rowNumber);
    if (row.actualCellCount === 0) continue;

    const data = {};
    for (const [colNumber, fieldKey] of Object.entries(columnFieldMap)) {
      data[fieldKey] = cellText(row.getCell(Number(colNumber)));
    }

    if (!data.sku) continue; // แถวว่างเปล่าจริงๆ ข้ามไปเงียบๆ

    if (!data.nameLo || !data.unitLo) {
      errors.push({
        row: rowNumber,
        message: !data.nameLo ? "ບໍ່ມີຊື່ສິນຄ້າ (ລາວ)" : "ບໍ່ມີໜ່ວຍ",
      });
      continue;
    }

    let categoryId = null;
    if (data.categoryName) {
      categoryId =
        categoryByName.get(normalizeHeader(data.categoryName)) ?? null;
      if (!categoryId) {
        errors.push({
          row: rowNumber,
          message: `ບໍ່ພົບໝວດໝູ່ "${data.categoryName}" — ບັນທຶກໂດຍບໍ່ລະບຸໝວດໝູ່`,
        });
      }
    }

    const reorderPoint = data.reorderPoint ? Number(data.reorderPoint) || 0 : 0;
    const initialQuantity = data.initialQuantity
      ? Number(data.initialQuantity) || 0
      : 0;

    let warehouseId = null;
    if (initialQuantity > 0) {
      if (!data.warehouseName) {
        errors.push({
          row: rowNumber,
          message: "ມີຈຳນວນເລີ່ມຕົ້ນແຕ່ບໍ່ໄດ້ລະບຸຄັງ — ຂ້າມການລົງສະຕັອກ",
        });
      } else {
        warehouseId =
          warehouseByName.get(normalizeHeader(data.warehouseName)) ?? null;
        if (!warehouseId) {
          errors.push({
            row: rowNumber,
            message: `ບໍ່ພົບຄັງ "${data.warehouseName}" — ຂ້າມການລົງສະຕັອກ`,
          });
        }
      }
    }

    try {
      const [existing] = await pool.query(
        "SELECT id FROM products WHERE sku = ?",
        [data.sku],
      );
      const [result] = await pool.query(
        `INSERT INTO products
          (sku, barcode, name_lo, name_cn, model_no, size, category_id, unit_lo, reorder_point)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE
           barcode = VALUES(barcode),
           name_lo = VALUES(name_lo),
           name_cn = VALUES(name_cn),
           model_no = VALUES(model_no),
           size = VALUES(size),
           category_id = VALUES(category_id),
           unit_lo = VALUES(unit_lo),
           reorder_point = VALUES(reorder_point)`,
        [
          data.sku,
          data.barcode || null,
          data.nameLo,
          data.nameCn || null,
          data.modelNo || null,
          data.size || null,
          categoryId,
          data.unitLo,
          reorderPoint,
        ],
      );
      const productId = existing.length ? existing[0].id : result.insertId;
      if (existing.length) updated++;
      else created++;

      if (warehouseId) {
        try {
          const conn = await pool.getConnection();
          try {
            await conn.beginTransaction();
            await recordMovement(conn, {
              productId,
              warehouseId,
              movementType: "ADJUSTMENT",
              quantity: initialQuantity,
              unitValueLak: 0,
              referenceTable: "products",
              referenceId: productId,
              note: "ນຳເຂົ້າຈຳນວນເລີ່ມຕົ້ນຈາກໄຟລ໌ Excel/CSV",
              createdBy: req.user.sub,
            });
            await conn.commit();
          } catch (err) {
            await conn.rollback();
            throw err;
          } finally {
            conn.release();
          }
        } catch (err) {
          errors.push({
            row: rowNumber,
            message: `ລົງສະຕັອກເລີ່ມຕົ້ນບໍ່ໄດ້: ${err.message}`,
          });
        }
      }
    } catch (err) {
      errors.push({ row: rowNumber, message: err.message });
    }
  }

  res.json({ created, updated, errors });
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
  getImportTemplate,
  bulkImportProducts,
  bulkDeleteProducts,
};
