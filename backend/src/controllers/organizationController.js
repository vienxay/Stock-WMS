const { z } = require("zod");
const bcrypt = require("bcrypt");
const pool = require("../config/db");
const AppError = require("../utils/AppError");
const asyncHandler = require("../utils/asyncHandler");
const { partialUpdate } = require("../utils/dbHelpers");
const {
  isSuperAdmin,
  branchAdminBranchId,
  userCanAccessWarehouse,
} = require("../middleware/roleMiddleware");

// ---------------------------------------------------------------------
// Branches
// ---------------------------------------------------------------------

const branchSchema = z.object({
  name: z.string().min(1),
  branchType: z.enum(["HEAD_OFFICE", "FACTORY"]),
  address: z.string().optional().nullable(),
  isActive: z.boolean().optional(),
});

const listBranches = asyncHandler(async (req, res) => {
  const [rows] = await pool.query("SELECT * FROM branches ORDER BY id");
  res.json(rows);
});

const createBranch = asyncHandler(async (req, res) => {
  const body = branchSchema.parse(req.body);
  const [result] = await pool.query(
    "INSERT INTO branches (name, branch_type, address, is_active) VALUES (?, ?, ?, ?)",
    [body.name, body.branchType, body.address ?? null, body.isActive ?? true],
  );
  const [rows] = await pool.query("SELECT * FROM branches WHERE id = ?", [
    result.insertId,
  ]);
  res.status(201).json(rows[0]);
});

const updateBranch = asyncHandler(async (req, res) => {
  const body = branchSchema.partial().parse(req.body);
  await partialUpdate(pool, "branches", req.params.id, {
    name: body.name,
    branch_type: body.branchType,
    address: body.address,
    is_active: body.isActive,
  });
  const [rows] = await pool.query("SELECT * FROM branches WHERE id = ?", [
    req.params.id,
  ]);
  if (!rows.length) throw new AppError(404, "ບໍ່ພົບສາຂານີ້");
  res.json(rows[0]);
});

// ---------------------------------------------------------------------
// Warehouse types (ข้อมูลอ้างอิงคงที่ เช่น HR, FOOD, SPARE_PARTS)
// ---------------------------------------------------------------------

const warehouseTypeSchema = z.object({
  code: z.string().min(1).max(30),
  name: z.string().min(1),
});

const listWarehouseTypes = asyncHandler(async (req, res) => {
  const [rows] = await pool.query("SELECT * FROM warehouse_types ORDER BY id");
  res.json(rows);
});

const createWarehouseType = asyncHandler(async (req, res) => {
  const body = warehouseTypeSchema.parse(req.body);
  const [result] = await pool.query(
    "INSERT INTO warehouse_types (code, name) VALUES (?, ?)",
    [body.code, body.name],
  );
  const [rows] = await pool.query(
    "SELECT * FROM warehouse_types WHERE id = ?",
    [result.insertId],
  );
  res.status(201).json(rows[0]);
});

// ---------------------------------------------------------------------
// Warehouses
// ---------------------------------------------------------------------

const warehouseSchema = z.object({
  branchId: z.number().int().positive(),
  warehouseTypeId: z.number().int().positive(),
  name: z.string().min(1),
  isCentral: z.boolean().optional(),
  isActive: z.boolean().optional(),
});

const listWarehouses = asyncHandler(async (req, res) => {
  const { branchId } = req.query;
  const where = branchId ? "WHERE branch_id = ?" : "";
  const params = branchId ? [branchId] : [];
  const [rows] = await pool.query(
    `SELECT w.*, b.name AS branch_name, wt.code AS warehouse_type_code, wt.name AS warehouse_type_name
     FROM warehouses w
     JOIN branches b ON b.id = w.branch_id
     JOIN warehouse_types wt ON wt.id = w.warehouse_type_id
     ${where}
     ORDER BY w.id`,
    params,
  );
  res.json(rows);
});

const createWarehouse = asyncHandler(async (req, res) => {
  const body = warehouseSchema.parse(req.body);
  const [result] = await pool.query(
    `INSERT INTO warehouses (branch_id, warehouse_type_id, name, is_central, is_active)
     VALUES (?, ?, ?, ?, ?)`,
    [
      body.branchId,
      body.warehouseTypeId,
      body.name,
      body.isCentral ?? false,
      body.isActive ?? true,
    ],
  );
  const [rows] = await pool.query("SELECT * FROM warehouses WHERE id = ?", [
    result.insertId,
  ]);
  res.status(201).json(rows[0]);
});

const updateWarehouse = asyncHandler(async (req, res) => {
  const body = warehouseSchema.partial().parse(req.body);
  await partialUpdate(pool, "warehouses", req.params.id, {
    name: body.name,
    is_central: body.isCentral,
    is_active: body.isActive,
  });
  const [rows] = await pool.query("SELECT * FROM warehouses WHERE id = ?", [
    req.params.id,
  ]);
  if (!rows.length) throw new AppError(404, "ບໍ່ພົບຄັງນີ້");
  res.json(rows[0]);
});

// ---------------------------------------------------------------------
// Locations (zone/shelf/bin ภายในคลัง)
// ---------------------------------------------------------------------

const locationSchema = z.object({
  warehouseId: z.number().int().positive(),
  zone: z.string().optional().nullable(),
  shelf: z.string().optional().nullable(),
  bin: z.string().optional().nullable(),
});

const listLocations = asyncHandler(async (req, res) => {
  const { warehouseId } = req.query;
  const where = warehouseId ? "WHERE l.warehouse_id = ?" : "";
  const params = warehouseId ? [warehouseId] : [];
  const [rows] = await pool.query(
    `SELECT l.*, w.name AS warehouse_name
     FROM locations l
     JOIN warehouses w ON w.id = l.warehouse_id
     ${where}
     ORDER BY l.id`,
    params,
  );
  res.json(rows);
});

const createLocation = asyncHandler(async (req, res) => {
  const body = locationSchema.parse(req.body);
  const [result] = await pool.query(
    "INSERT INTO locations (warehouse_id, zone, shelf, bin) VALUES (?, ?, ?, ?)",
    [body.warehouseId, body.zone ?? null, body.shelf ?? null, body.bin ?? null],
  );
  const [rows] = await pool.query("SELECT * FROM locations WHERE id = ?", [
    result.insertId,
  ]);
  res.status(201).json(rows[0]);
});

const updateLocation = asyncHandler(async (req, res) => {
  const body = locationSchema.partial().parse(req.body);
  await partialUpdate(pool, "locations", req.params.id, {
    warehouse_id: body.warehouseId,
    zone: body.zone,
    shelf: body.shelf,
    bin: body.bin,
  });
  const [rows] = await pool.query("SELECT * FROM locations WHERE id = ?", [
    req.params.id,
  ]);
  if (!rows.length) throw new AppError(404, "ບໍ່ພົບຕໍາແໜ່ງເກັບມ້ຽນນີ້");
  res.json(rows[0]);
});

const deleteLocation = asyncHandler(async (req, res) => {
  const [result] = await pool.query("DELETE FROM locations WHERE id = ?", [
    req.params.id,
  ]);
  if (!result.affectedRows) throw new AppError(404, "ບໍ່ພົບຕໍາແໜ່ງເກັບມ້ຽນນີ້");
  res.status(204).send();
});

// ---------------------------------------------------------------------
// Departments
// ---------------------------------------------------------------------

const departmentSchema = z.object({
  branchId: z.number().int().positive(),
  name: z.string().min(1),
});

const listDepartments = asyncHandler(async (req, res) => {
  const { branchId } = req.query;
  const where = branchId ? "WHERE branch_id = ?" : "";
  const params = branchId ? [branchId] : [];
  const [rows] = await pool.query(
    `SELECT * FROM departments ${where} ORDER BY id`,
    params,
  );
  res.json(rows);
});

const createDepartment = asyncHandler(async (req, res) => {
  const body = departmentSchema.parse(req.body);
  const [result] = await pool.query(
    "INSERT INTO departments (branch_id, name) VALUES (?, ?)",
    [body.branchId, body.name],
  );
  const [rows] = await pool.query("SELECT * FROM departments WHERE id = ?", [
    result.insertId,
  ]);
  res.status(201).json(rows[0]);
});

// ---------------------------------------------------------------------
// Employees
// ---------------------------------------------------------------------

const employeeSchema = z.object({
  employeeCode: z.string().min(1).max(30),
  fullName: z.string().min(1),
  departmentId: z.number().int().positive().optional().nullable(),
  branchId: z.number().int().positive(),
  isActive: z.boolean().optional(),
});

const listEmployees = asyncHandler(async (req, res) => {
  const ownBranchId = isSuperAdmin(req.user)
    ? null
    : branchAdminBranchId(req.user);
  // BRANCH_ADMIN เห็นได้เฉพาะพนักงานในสาขาตัวเอง — บังคับ override query param กันเผลอขอสาขาอื่น
  const branchId = ownBranchId ?? req.query.branchId;
  const where = branchId ? "WHERE e.branch_id = ?" : "";
  const params = branchId ? [branchId] : [];
  const [rows] = await pool.query(
    `SELECT e.*, d.name AS department_name, b.name AS branch_name
     FROM employees e
     LEFT JOIN departments d ON d.id = e.department_id
     JOIN branches b ON b.id = e.branch_id
     ${where}
     ORDER BY e.id`,
    params,
  );
  res.json(rows);
});

const createEmployee = asyncHandler(async (req, res) => {
  const body = employeeSchema.parse(req.body);
  if (!isSuperAdmin(req.user)) {
    const ownBranchId = branchAdminBranchId(req.user);
    if (body.branchId !== ownBranchId) {
      throw new AppError(403, "ສ້າງພະນັກງານໄດ້ສະເພາະສາຂາຂອງຕົນເອງ");
    }
  }
  const [result] = await pool.query(
    `INSERT INTO employees (employee_code, full_name, department_id, branch_id, is_active)
     VALUES (?, ?, ?, ?, ?)`,
    [
      body.employeeCode,
      body.fullName,
      body.departmentId ?? null,
      body.branchId,
      body.isActive ?? true,
    ],
  );
  const [rows] = await pool.query("SELECT * FROM employees WHERE id = ?", [
    result.insertId,
  ]);
  res.status(201).json(rows[0]);
});

const updateEmployee = asyncHandler(async (req, res) => {
  const body = employeeSchema.partial().parse(req.body);
  if (!isSuperAdmin(req.user)) {
    const ownBranchId = branchAdminBranchId(req.user);
    const [existing] = await pool.query(
      "SELECT branch_id FROM employees WHERE id = ?",
      [req.params.id],
    );
    if (!existing.length) throw new AppError(404, "ບໍ່ພົບພະນັກງານນີ້");
    if (existing[0].branch_id !== ownBranchId) {
      throw new AppError(403, "ແກ້ໄຂໄດ້ສະເພາະພະນັກງານໃນສາຂາຂອງຕົນເອງ");
    }
    if (body.branchId !== undefined && body.branchId !== ownBranchId) {
      throw new AppError(403, "ຍ້າຍພະນັກງານຂ້າມສາຂາໄດ້ສະເພາະ Super Admin");
    }
  }
  await partialUpdate(pool, "employees", req.params.id, {
    employee_code: body.employeeCode,
    full_name: body.fullName,
    department_id: body.departmentId,
    branch_id: body.branchId,
    is_active: body.isActive,
  });
  const [rows] = await pool.query("SELECT * FROM employees WHERE id = ?", [
    req.params.id,
  ]);
  if (!rows.length) throw new AppError(404, "ບໍ່ພົບພະນັກງານນີ້");
  res.json(rows[0]);
});

// ---------------------------------------------------------------------
// Users (บัญชีเข้าสู่ระบบ ผูกกับ employee 1:1)
// ---------------------------------------------------------------------

const userSchema = z.object({
  employeeId: z.number().int().positive(),
  username: z.string().min(3).max(50),
  password: z.string().min(8),
  isActive: z.boolean().optional(),
});

const listUsers = asyncHandler(async (req, res) => {
  const ownBranchId = isSuperAdmin(req.user)
    ? null
    : branchAdminBranchId(req.user);
  const where = ownBranchId ? "WHERE e.branch_id = ?" : "";
  const params = ownBranchId ? [ownBranchId] : [];
  const [rows] = await pool.query(
    `SELECT u.id, u.username, u.is_active, u.created_at,
            e.id AS employee_id, e.full_name, e.employee_code, e.branch_id
     FROM users u JOIN employees e ON e.id = u.employee_id
     ${where}
     ORDER BY u.id`,
    params,
  );
  res.json(rows);
});

async function assertEmployeeInOwnBranch(req, employeeId) {
  if (isSuperAdmin(req.user)) return;
  const ownBranchId = branchAdminBranchId(req.user);
  const [rows] = await pool.query(
    "SELECT branch_id FROM employees WHERE id = ?",
    [employeeId],
  );
  if (!rows.length) throw new AppError(404, "ບໍ່ພົບພະນັກງານນີ້");
  if (rows[0].branch_id !== ownBranchId) {
    throw new AppError(403, "ຈັດການຜູ້ໃຊ້ໄດ້ສະເພາະພະນັກງານໃນສາຂາຂອງຕົນເອງ");
  }
}

const createUser = asyncHandler(async (req, res) => {
  const body = userSchema.parse(req.body);
  await assertEmployeeInOwnBranch(req, body.employeeId);
  const passwordHash = await bcrypt.hash(body.password, 10);
  const [result] = await pool.query(
    `INSERT INTO users (employee_id, username, password_hash, is_active)
     VALUES (?, ?, ?, ?)`,
    [body.employeeId, body.username, passwordHash, body.isActive ?? true],
  );
  const [rows] = await pool.query(
    "SELECT id, employee_id, username, is_active, created_at FROM users WHERE id = ?",
    [result.insertId],
  );
  res.status(201).json(rows[0]);
});

const updateUserSchema = z.object({
  password: z.string().min(8).optional(),
  isActive: z.boolean().optional(),
});

const updateUser = asyncHandler(async (req, res) => {
  const body = updateUserSchema.parse(req.body);
  if (!isSuperAdmin(req.user)) {
    const [existing] = await pool.query(
      `SELECT e.branch_id FROM users u
       JOIN employees e ON e.id = u.employee_id
       WHERE u.id = ?`,
      [req.params.id],
    );
    if (!existing.length) throw new AppError(404, "ບໍ່ພົບຜູ້ໃຊ້ນີ້");
    if (existing[0].branch_id !== branchAdminBranchId(req.user)) {
      throw new AppError(403, "ຈັດການຜູ້ໃຊ້ໄດ້ສະເພາະຄົນໃນສາຂາຂອງຕົນເອງ");
    }
  }
  const passwordHash = body.password
    ? await bcrypt.hash(body.password, 10)
    : undefined;
  await partialUpdate(pool, "users", req.params.id, {
    password_hash: passwordHash,
    is_active: body.isActive,
  });
  const [rows] = await pool.query(
    "SELECT id, employee_id, username, is_active, created_at FROM users WHERE id = ?",
    [req.params.id],
  );
  if (!rows.length) throw new AppError(404, "ບໍ່ພົບຜູ້ໃຊ້ນີ້");
  res.json(rows[0]);
});

// ---------------------------------------------------------------------
// Roles (ข้อมูลอ้างอิงคงที่ seed มาจาก scripts/seedAdmin.js เท่านั้น อ่านอย่างเดียว)
// ---------------------------------------------------------------------

const listRoles = asyncHandler(async (req, res) => {
  const [rows] = await pool.query("SELECT * FROM roles ORDER BY id");
  res.json(rows);
});

// ---------------------------------------------------------------------
// User roles (มอบ/ถอนสิทธิ์ — warehouseId เป็น null แปลว่าสิทธิ์ทั่วทั้งระบบ)
// ---------------------------------------------------------------------

const userRoleSchema = z.object({
  userId: z.number().int().positive(),
  roleId: z.number().int().positive(),
  branchId: z.number().int().positive().optional().nullable(),
  warehouseId: z.number().int().positive().optional().nullable(),
});

const listUserRoles = asyncHandler(async (req, res) => {
  const { userId } = req.query;
  const conditions = [];
  const params = [];
  if (userId) {
    conditions.push("ur.user_id = ?");
    params.push(userId);
  }
  const ownBranchId = isSuperAdmin(req.user)
    ? null
    : branchAdminBranchId(req.user);
  if (ownBranchId) {
    conditions.push("e.branch_id = ?");
    params.push(ownBranchId);
  }
  const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
  const [rows] = await pool.query(
    `SELECT ur.id, ur.user_id, ur.branch_id, ur.warehouse_id,
            b.name AS branch_name, w.name AS warehouse_name,
            r.code AS role_code, r.name AS role_name
     FROM user_roles ur
     JOIN roles r ON r.id = ur.role_id
     JOIN users u ON u.id = ur.user_id
     JOIN employees e ON e.id = u.employee_id
     LEFT JOIN branches b ON b.id = ur.branch_id
     LEFT JOIN warehouses w ON w.id = ur.warehouse_id
     ${where}
     ORDER BY ur.id`,
    params,
  );
  res.json(rows);
});

// UNIQUE KEY ของ user_roles ไม่กันซ้ำเวลา branch_id/warehouse_id เป็น NULL (MySQL ไม่เทียบ NULL กับ NULL)
// จึงต้องเช็คซ้ำเองก่อน insert สำหรับกรณีสิทธิ์ทั่วทั้งระบบ
const assignUserRole = asyncHandler(async (req, res) => {
  const body = userRoleSchema.parse(req.body);
  const branchId = body.branchId ?? null;
  const warehouseId = body.warehouseId ?? null;

  if (!isSuperAdmin(req.user)) {
    // BRANCH_ADMIN มอบสิทธิ์ได้เฉพาะ WAREHOUSE_STAFF ในสาขาตัวเองเท่านั้น (ไม่ให้ตั้ง Branch Admin/Super Admin คนอื่น)
    const [roleRows] = await pool.query("SELECT code FROM roles WHERE id = ?", [
      body.roleId,
    ]);
    if (!roleRows.length) throw new AppError(404, "ບໍ່ພົບສິດທິນີ້");
    if (roleRows[0].code !== "WAREHOUSE_STAFF" || branchId !== null) {
      throw new AppError(403, "ມອບໄດ້ສະເພາະສິດທິ Warehouse Staff ເທົ່ານັ້ນ");
    }
    if (!warehouseId || !(await userCanAccessWarehouse(req.user, warehouseId))) {
      throw new AppError(403, "ມອບສິດທິໄດ້ສະເພາະຄັງໃນສາຂາຂອງຕົນເອງ");
    }
    const [targetUserRows] = await pool.query(
      "SELECT employee_id FROM users WHERE id = ?",
      [body.userId],
    );
    if (!targetUserRows.length) throw new AppError(404, "ບໍ່ພົບຜູ້ໃຊ້ນີ້");
    await assertEmployeeInOwnBranch(req, targetUserRows[0].employee_id);
  }

  const [existing] = await pool.query(
    `SELECT id FROM user_roles
     WHERE user_id = ? AND role_id = ?
       AND (branch_id <=> ?) AND (warehouse_id <=> ?)`,
    [body.userId, body.roleId, branchId, warehouseId],
  );
  if (existing.length) {
    throw new AppError(409, "ຜູ້ໃຊ້ນີ້ມີສິດທິນີ້ຢູ່ແລ້ວ");
  }

  const [result] = await pool.query(
    "INSERT INTO user_roles (user_id, role_id, branch_id, warehouse_id) VALUES (?, ?, ?, ?)",
    [body.userId, body.roleId, branchId, warehouseId],
  );
  const [rows] = await pool.query("SELECT * FROM user_roles WHERE id = ?", [
    result.insertId,
  ]);
  res.status(201).json(rows[0]);
});

const revokeUserRole = asyncHandler(async (req, res) => {
  if (!isSuperAdmin(req.user)) {
    const [rows] = await pool.query(
      `SELECT ur.warehouse_id, r.code AS role_code
       FROM user_roles ur
       JOIN roles r ON r.id = ur.role_id
       WHERE ur.id = ?`,
      [req.params.id],
    );
    if (!rows.length) throw new AppError(404, "ບໍ່ພົບສິດທິນີ້");
    if (
      rows[0].role_code !== "WAREHOUSE_STAFF" ||
      !(await userCanAccessWarehouse(req.user, rows[0].warehouse_id))
    ) {
      throw new AppError(403, "ຖອນສິດທິໄດ້ສະເພາະ Warehouse Staff ໃນສາຂາຂອງຕົນເອງ");
    }
  }
  const [result] = await pool.query("DELETE FROM user_roles WHERE id = ?", [
    req.params.id,
  ]);
  if (!result.affectedRows) throw new AppError(404, "ບໍ່ພົບສິດທິນີ້");
  res.status(204).send();
});

module.exports = {
  listBranches,
  createBranch,
  updateBranch,
  listWarehouseTypes,
  createWarehouseType,
  listWarehouses,
  createWarehouse,
  updateWarehouse,
  listLocations,
  createLocation,
  updateLocation,
  deleteLocation,
  listDepartments,
  createDepartment,
  listEmployees,
  createEmployee,
  updateEmployee,
  listUsers,
  createUser,
  updateUser,
  listRoles,
  listUserRoles,
  assignUserRole,
  revokeUserRole,
};
