// สคริปต์ตั้งต้นระบบ: seed ตาราง roles (ข้อมูลอ้างอิงคงที่ที่ schemaMySQL.sql ไม่ได้ insert ไว้)
// และสร้างบัญชี SYSTEM_ADMIN คนแรกไว้ล็อกอินเข้าใช้งานครั้งแรก
// รัน: npm run seed:admin (ต้องรัน schemaMySQL.sql ให้ตารางครบก่อน)
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env'), quiet: true });

const bcrypt = require('bcrypt');
const pool = require('../config/db');

const ROLES = [
  { code: 'SYSTEM_ADMIN', name: 'ຜູ້ບໍລິຫານລະບົບ' },
  { code: 'HQ_STORE_KEEPER', name: 'ພະນັກງານຄັງສ່ວນກາງ' },
  { code: 'BRANCH_STORE_KEEPER', name: 'ພະນັກງານຄັງສາຂາ' },
  { code: 'DEPT_APPROVER', name: 'ຜູ້ອະນຸມັດລະດັບພະແນກ' },
  { code: 'HQ_APPROVER', name: 'ຜູ້ອະນຸມັດລະດັບ HQ' },
  { code: 'EMPLOYEE', name: 'ພະນັກງານທົ່ວໄປ' },
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
  console.log(`seed roles: ${ROLES.length} ລາຍການ`);
}

async function seedAdminUser() {
  const [branches] = await pool.query(
    "SELECT id FROM branches WHERE branch_type = 'HEAD_OFFICE' LIMIT 1"
  );
  if (!branches.length) {
    throw new Error('ບໍ່ພົບສາຂາ HEAD_OFFICE — ແລ່ນ schemaMySQL.sql ໃຫ້ຄົບກ່ອນ');
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
    console.log(`ສ້າງ employee ADMIN000 (id=${employeeId})`);
  }

  const [users] = await pool.query('SELECT id FROM users WHERE username = ?', [ADMIN_USERNAME]);
  let userId;
  if (users.length) {
    userId = users[0].id;
    console.log(`ບັນຊີ ${ADMIN_USERNAME} ມີຢູ່ແລ້ວ (id=${userId}) ຂ້າມການສ້າງໃໝ່`);
  } else {
    const passwordHash = await bcrypt.hash(ADMIN_PASSWORD, 10);
    const [result] = await pool.query(
      `INSERT INTO users (employee_id, username, password_hash, is_active) VALUES (?, ?, ?, TRUE)`,
      [employeeId, ADMIN_USERNAME, passwordHash]
    );
    userId = result.insertId;
    console.log(`ສ້າງບັນຊີຜູ້ໃຊ້ ${ADMIN_USERNAME} (id=${userId}) — ລະຫັດຜ່ານເລີ່ມຕົ້ນ: ${ADMIN_PASSWORD}`);
    console.log('*** ກະລຸນາປ່ຽນລະຫັດຜ່ານທັນທີຫຼັງລ໊ອກອິນຄັ້ງທຳອິດ ***');
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
    console.log('ມອບສິດທິ SYSTEM_ADMIN ໃຫ້ບັນຊີນີ້ແລ້ວ');
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
  console.error('seedAdmin ລົ້ມເຫຼວ:', err.message);
  process.exit(1);
});
