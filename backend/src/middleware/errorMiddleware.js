const { ZodError } = require("zod");
const AppError = require("../utils/AppError");
const logger = require("../utils/logger");

// ไม่เจอ route ไหนเลย -> ส่งต่อเป็น 404 error ให้ errorHandler จัดการ
function notFound(req, res, next) {
  next(new AppError(404, `ไม่พบ route: ${req.method} ${req.originalUrl}`));
}

// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  if (err instanceof AppError) {
    return res
      .status(err.statusCode)
      .json({ error: err.message, details: err.details });
  }

  if (err instanceof ZodError) {
    return res
      .status(400)
      .json({ error: "ข้อมูลไม่ถูกต้อง", details: err.issues });
  }

  // FK constraint ไม่ผ่าน เช่น อ้างอิง id ที่ไม่มีอยู่จริง
  if (
    err.code === "ER_NO_REFERENCED_ROW_2" ||
    err.code === "ER_ROW_IS_REFERENCED_2"
  ) {
    return res
      .status(409)
      .json({ error: "ข้อมูลอ้างอิงไม่ถูกต้องหรือถูกใช้งานอยู่" });
  }

  // ค่าซ้ำใน UNIQUE column เช่น username, sku
  if (err.code === "ER_DUP_ENTRY") {
    return res.status(409).json({ error: "ข้อมูลนี้มีอยู่ในระบบแล้ว" });
  }

  logger.error(err.message, { stack: err.stack });
  return res
    .status(500)
    .json({ error: "เกิดข้อผิดพลาดในระบบ กรุณาลองใหม่อีกครั้ง" });
}

module.exports = { notFound, errorHandler };
