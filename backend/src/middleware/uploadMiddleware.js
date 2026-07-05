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

module.exports = { uploadProductImage };
