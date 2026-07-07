const AppError = require("../utils/AppError");
const pool = require("../config/db");

// req.user.roles = [{ code, branchId, warehouseId }] ฝังมาจาก JWT ตอน login
// SUPER_ADMIN ผ่านได้ทุกที่โดยไม่ต้องเช็ค code ที่ระบุ
function requireRole(...allowedCodes) {
  return function (req, res, next) {
    const roles = req.user?.roles || [];
    const ok = roles.some(
      (r) => r.code === "SUPER_ADMIN" || allowedCodes.includes(r.code),
    );
    if (!ok) return next(new AppError(403, "ບໍ່ມີສິດທິເຂົ້າເຖິງສ່ວນນີ້"));
    next();
  };
}

// เช็คว่า user มีสิทธิ์ดำเนินการกับคลัง (warehouseId) นี้หรือไม่ ตามลำดับชั้น 3 ระดับ:
// SUPER_ADMIN ทำได้ทุกคลัง, BRANCH_ADMIN ทำได้ทุกคลังในสาขาตัวเอง, WAREHOUSE_STAFF ทำได้เฉพาะคลังที่ตัวเองประจำ
// ต้อง query หา branch_id ของคลังเป้าหมายก่อน เพราะ JWT ไม่ได้ฝังข้อมูลนี้ของ "คลังที่จะเข้าถึง" ไว้ (ฝังแค่ของ role ตัวเอง)
async function userCanAccessWarehouse(user, warehouseId) {
  const roles = user?.roles || [];
  if (roles.some((r) => r.code === "SUPER_ADMIN")) return true;

  const branchAdminBranchIds = roles
    .filter((r) => r.code === "BRANCH_ADMIN")
    .map((r) => Number(r.branchId));
  const warehouseStaffWarehouseIds = roles
    .filter((r) => r.code === "WAREHOUSE_STAFF")
    .map((r) => Number(r.warehouseId));

  if (warehouseStaffWarehouseIds.includes(Number(warehouseId))) return true;
  if (!branchAdminBranchIds.length) return false;

  const [rows] = await pool.query(
    "SELECT branch_id FROM warehouses WHERE id = ?",
    [warehouseId],
  );
  if (!rows.length) return false;
  return branchAdminBranchIds.includes(Number(rows[0].branch_id));
}

// middleware เวอร์ชันสำหรับใช้ตรง route: getWarehouseId(req) ดึง warehouseId เป้าหมายจาก req (params/body/query)
function requireWarehouseAccess(getWarehouseId) {
  return async function (req, res, next) {
    const warehouseId = getWarehouseId(req);
    const ok = await userCanAccessWarehouse(req.user, warehouseId);
    if (!ok) return next(new AppError(403, "ບໍ່ມີສິດທິເຂົ້າເຖິງຄັງນີ້"));
    next();
  };
}

module.exports = { requireRole, requireWarehouseAccess, userCanAccessWarehouse };
