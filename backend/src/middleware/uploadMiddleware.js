const multer = require("multer");
const path = require("path");
const crypto = require("crypto");
const AppError = require("../utils/AppError");

const PRODUCTS_DIR = path.resolve(
  process.cwd(),
  process.env.UPLOAD_DIR || "uploads",
  "products",
);
const ALLOWED_MIME = ["image/jpeg", "image/png", "image/webp"];

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, PRODUCTS_DIR),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${Date.now()}-${crypto.randomBytes(6).toString("hex")}${ext}`);
  },
});

function fileFilter(req, file, cb) {
  if (!ALLOWED_MIME.includes(file.mimetype)) {
    return cb(new AppError(400, "ຮອງຮັບສະເພາະໄຟລ໌ຮູບພາບ JPEG, PNG, WEBP"));
  }
  cb(null, true);
}

const uploadProductImage = multer({
  storage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
});

// ຮູບໂລໂກ້/ພາບພື້ນຫຼັງໜ້າ login — ຮອງຮັບ SVG ເພີ່ມເພາະໂລໂກ້ບໍລິສັດສ່ວນຫຼາຍເປັນ SVG
const BRANDING_DIR = path.resolve(
  process.cwd(),
  process.env.UPLOAD_DIR || "uploads",
  "branding",
);
const BRANDING_MIME = ["image/jpeg", "image/png", "image/webp", "image/svg+xml"];

const brandingStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, BRANDING_DIR),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${Date.now()}-${crypto.randomBytes(6).toString("hex")}${ext}`);
  },
});

const uploadBrandingImage = multer({
  storage: brandingStorage,
  fileFilter: (req, file, cb) => {
    if (!BRANDING_MIME.includes(file.mimetype)) {
      return cb(new AppError(400, "ຮອງຮັບສະເພາະໄຟລ໌ຮູບພາບ JPEG, PNG, WEBP, SVG"));
    }
    cb(null, true);
  },
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
});

// ไฟล์ Excel/CSV นำเข้าข้อมูล — เก็บใน memory เพราะแค่ parse แล้วทิ้ง ไม่ต้องเก็บไฟล์ดิบไว้
// เช็คทั้ง mimetype และนามสกุลไฟล์ เพราะเบราว์เซอร์/OS แต่ละเครื่องส่ง mimetype ของ .csv มาไม่ตรงกัน
// (บางทีเป็น text/csv, บางทีเป็น application/vnd.ms-excel เหมือน .xls)
const EXCEL_MIME = [
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-excel",
  "text/csv",
  "application/csv",
  "text/plain",
];
const ALLOWED_IMPORT_EXT = [".xlsx", ".xls", ".csv"];

const uploadExcelFile = multer({
  storage: multer.memoryStorage(),
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (!ALLOWED_IMPORT_EXT.includes(ext) && !EXCEL_MIME.includes(file.mimetype)) {
      return cb(new AppError(400, "ຮອງຮັບສະເພາະໄຟລ໌ Excel (.xlsx) ຫຼື CSV (.csv)"));
    }
    cb(null, true);
  },
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
});

module.exports = { uploadProductImage, uploadExcelFile, uploadBrandingImage };
