const AppError = require("../utils/AppError");

// req.user.roles = [{ code, warehouseId }] ฝังมาจาก JWT ตอน login
// SYSTEM_ADMIN ผ่านได้ทุกที่โดยไม่ต้องเช็ค code ที่ระบุ
function requireRole(...allowedCodes) {
  return function (req, res, next) {
    const roles = req.user?.roles || [];
    const ok = roles.some(
      (r) => r.code === "SYSTEM_ADMIN" || allowedCodes.includes(r.code),
    );
    if (!ok) return next(new AppError(403, "ບໍ່ມີສິດທິເຂົ້າເຖິງສ່ວນນີ້"));
    next();
  };
}

// เช็คว่า user มี role ที่ระบุ "และ" สิทธิ์นั้นครอบคลุม warehouseId นี้ด้วย
// warehouseId ของ role เป็น NULL แปลว่าสิทธิ์ทั่วทั้งระบบ (ทุกคลัง)
function hasWarehouseAccess(user, warehouseId, allowedCodes) {
  const roles = user?.roles || [];
  return roles.some((r) => {
    if (r.code === "SYSTEM_ADMIN") return true;
    if (!allowedCodes.includes(r.code)) return false;
    return (
      r.warehouseId === null || Number(r.warehouseId) === Number(warehouseId)
    );
  });
}

function requireWarehouseAccess(allowedCodes, getWarehouseId) {
  return function (req, res, next) {
    const warehouseId = getWarehouseId(req);
    if (!hasWarehouseAccess(req.user, warehouseId, allowedCodes)) {
      return next(new AppError(403, "ບໍ່ມີສິດທິເຂົ້າເຖິງຄັງນີ້"));
    }
    next();
  };
}

module.exports = { requireRole, requireWarehouseAccess, hasWarehouseAccess };
