// สคริปต์ตั้งต้นระบบ: seed ตาราง roles (ข้อมูลอ้างอิงคงที่ที่ schemaMySQL.sql ไม่ได้ insert ไว้)
// และสร้างบัญชี SYSTEM_ADMIN คนแรกไว้ล็อกอินเข้าใช้งานครั้งแรก
// รัน: npm run seed:admin (ต้องรัน schemaMySQL.sql ให้ตารางครบก่อน)
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../../.env'), quiet: true });

const bcrypt = require('bcrypt');
const pool = require('../config/db');

const ROLES = [
  { code: 'SYSTEM_ADMIN', name: 'ผู้ดูแลระบบ' },
  { code: 'HQ_STORE_KEEPER', name: 'เจ้าหน้าที่คลังส่วนกลาง' },
  { code: 'BRANCH_STORE_KEEPER', name: 'เจ้าหน้าที่คลังสาขา' },
  { code: 'DEPT_APPROVER', name: 'ผู้อนุมัติระดับแผนก' },
  { code: 'HQ_APPROVER', name: 'ผู้อนุมัติระดับ HQ' },
  { code: 'EMPLOYEE', name: 'พนักงานทั่วไป' },
];

const ADMIN_USERNAME = process.env.ADMIN_USERNAME || 'admin';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'Admin@12345';

async function seedRoles() {
  for (const role of ROLES) {
    await pool.query(
      'INSERT INTO roles (code, name) VALUES (?, ?) ON DUPLICATE KEY UPDATE name = VALUES(name)',
      [role.code, role.name]
    );
  }
  console.log(`seed roles: ${ROLES.length} รายการ`);
}

async function seedAdminUser() {
  const [branches] = await pool.query(
    "SELECT id FROM branches WHERE branch_type = 'HEAD_OFFICE' LIMIT 1"
  );
  if (!branches.length) {
    throw new Error('ไม่พบสาขา HEAD_OFFICE — รัน schemaMySQL.sql ให้ครบก่อน');
  }
  const headOfficeId = branches[0].id;

  let [employees] = await pool.query('SELECT id FROM employees WHERE employee_code = ?', ['ADMIN000']);
  let employeeId;
  if (employees.length) {
    employeeId = employees[0].id;
  } else {
    const [result] = await pool.query(
      `INSERT INTO employees (employee_code, full_name, branch_id, is_active)
       VALUES (?, ?, ?, TRUE)`,
      ['ADMIN000', 'System Administrator', headOfficeId]
    );
    employeeId = result.insertId;
    console.log(`สร้าง employee ADMIN000 (id=${employeeId})`);
  }

  const [users] = await pool.query('SELECT id FROM users WHERE username = ?', [ADMIN_USERNAME]);
  let userId;
  if (users.length) {
    userId = users[0].id;
    console.log(`บัญชี ${ADMIN_USERNAME} มีอยู่แล้ว (id=${userId}) ข้ามการสร้างใหม่`);
  } else {
    const passwordHash = await bcrypt.hash(ADMIN_PASSWORD, 10);
    const [result] = await pool.query(
      `INSERT INTO users (employee_id, username, password_hash, is_active) VALUES (?, ?, ?, TRUE)`,
      [employeeId, ADMIN_USERNAME, passwordHash]
    );
    userId = result.insertId;
    console.log(`สร้างบัญชีผู้ใช้ ${ADMIN_USERNAME} (id=${userId}) — รหัสผ่านเริ่มต้น: ${ADMIN_PASSWORD}`);
    console.log('*** กรุณาเปลี่ยนรหัสผ่านทันทีหลังล็อกอินครั้งแรก ***');
  }

  const [roleRows] = await pool.query('SELECT id FROM roles WHERE code = ?', ['SYSTEM_ADMIN']);
  const systemAdminRoleId = roleRows[0].id;

  // warehouseId = NULL (สิทธิ์ทั่วทั้งระบบ) — UNIQUE KEY ไม่กันซ้ำกรณี NULL จึงต้องเช็คเองก่อน insert
  const [existingRole] = await pool.query(
    'SELECT id FROM user_roles WHERE user_id = ? AND role_id = ? AND warehouse_id IS NULL',
    [userId, systemAdminRoleId]
  );
  if (!existingRole.length) {
    await pool.query(
      'INSERT INTO user_roles (user_id, role_id, warehouse_id) VALUES (?, ?, NULL)',
      [userId, systemAdminRoleId]
    );
    console.log('มอบสิทธิ์ SYSTEM_ADMIN ให้บัญชีนี้แล้ว');
  }
}

async function main() {
  try {
    await seedRoles();
    await seedAdminUser();
  } finally {
    await pool.end();
  }
}

main().catch((err) => {
  console.error('seedAdmin ล้มเหลว:', err.message);
  process.exit(1);
});
