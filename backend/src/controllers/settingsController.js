const { z } = require("zod");
const fs = require("fs/promises");
const path = require("path");
const pool = require("../config/db");
const AppError = require("../utils/AppError");
const asyncHandler = require("../utils/asyncHandler");

const updateSettingsSchema = z.object({
  companyName: z.string().min(1).max(200),
  companyNameLo: z.string().max(200).optional().nullable(),
});

async function getSettingsRow() {
  const [rows] = await pool.query("SELECT * FROM app_settings WHERE id = 1");
  return rows[0];
}

async function deleteOldBrandingFile(imageUrl) {
  if (!imageUrl) return;
  const filePath = path.resolve(
    process.cwd(),
    process.env.UPLOAD_DIR || "uploads",
    "branding",
    path.basename(imageUrl),
  );
  await fs.unlink(filePath).catch(() => {}); // ไฟล์อาจถูกลบไปแล้วหรือย้ายที่ ไม่ถือเป็น error ของ request นี้
}

// เปิดสาธารณะ (ไม่ต้อง login) เพราะหน้า login ต้องดึงชื่อ/โลโก้/ภาพพื้นหลังมาแสดงก่อนเข้าสู่ระบบ
const getSettings = asyncHandler(async (req, res) => {
  const settings = await getSettingsRow();
  res.json(settings);
});

const updateSettings = asyncHandler(async (req, res) => {
  const body = updateSettingsSchema.parse(req.body);
  await pool.query(
    "UPDATE app_settings SET company_name = ?, company_name_lo = ?, updated_by = ? WHERE id = 1",
    [body.companyName, body.companyNameLo || null, req.user.sub],
  );
  res.json(await getSettingsRow());
});

const uploadLogo = asyncHandler(async (req, res) => {
  if (!req.file) throw new AppError(400, "ບໍ່ມີໄຟລ໌ຮູບແນບມາ");

  const current = await getSettingsRow();
  const logoUrl = `/uploads/branding/${req.file.filename}`;
  await pool.query(
    "UPDATE app_settings SET logo_url = ?, updated_by = ? WHERE id = 1",
    [logoUrl, req.user.sub],
  );
  await deleteOldBrandingFile(current.logo_url);
  res.json(await getSettingsRow());
});

const uploadLoginBackground = asyncHandler(async (req, res) => {
  if (!req.file) throw new AppError(400, "ບໍ່ມີໄຟລ໌ຮູບແນບມາ");

  const current = await getSettingsRow();
  const backgroundUrl = `/uploads/branding/${req.file.filename}`;
  await pool.query(
    "UPDATE app_settings SET login_background_url = ?, updated_by = ? WHERE id = 1",
    [backgroundUrl, req.user.sub],
  );
  await deleteOldBrandingFile(current.login_background_url);
  res.json(await getSettingsRow());
});

module.exports = { getSettings, updateSettings, uploadLogo, uploadLoginBackground };
