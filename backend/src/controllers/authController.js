const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const { z } = require("zod");
const pool = require("../config/db");
const AppError = require("../utils/AppError");
const asyncHandler = require("../utils/asyncHandler");

const loginSchema = z.object({
  username: z.string().min(1),
  password: z.string().min(1),
});

async function fetchRoles(runner, userId) {
  const [rows] = await runner.query(
    `SELECT r.code, ur.warehouse_id AS warehouseId
     FROM user_roles ur JOIN roles r ON r.id = ur.role_id
     WHERE ur.user_id = ?`,
    [userId],
  );
  return rows;
}

// roles ถูกฝังลงใน JWT ตอน login เพื่อไม่ต้อง query DB ซ้ำทุก request
// ถ้าสิทธิ์ของ user ถูกแก้ไข จะมีผลตอน login ครั้งถัดไป (ไม่ใช่ทันที)
const login = asyncHandler(async (req, res) => {
  const { username, password } = loginSchema.parse(req.body);

  const [users] = await pool.query(
    `SELECT u.id, u.username, u.password_hash, u.is_active,
            e.id AS employee_id, e.full_name, e.branch_id
     FROM users u JOIN employees e ON e.id = u.employee_id
     WHERE u.username = ?`,
    [username],
  );

  const user = users[0];
  if (!user || !user.is_active) {
    throw new AppError(401, "ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง");
  }

  const match = await bcrypt.compare(password, user.password_hash);
  if (!match) {
    throw new AppError(401, "ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง");
  }

  const roles = await fetchRoles(pool, user.id);

  const payload = {
    sub: user.id,
    username: user.username,
    employeeId: user.employee_id,
    fullName: user.full_name,
    branchId: user.branch_id,
    roles: roles.map((r) => ({ code: r.code, warehouseId: r.warehouseId })),
  };

  const token = jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || "8h",
  });

  res.json({ token, user: payload });
});

const me = asyncHandler(async (req, res) => {
  res.json({ user: req.user });
});

module.exports = { login, me };
