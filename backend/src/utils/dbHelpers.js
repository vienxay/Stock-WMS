const AppError = require('./AppError');

// สร้าง `UPDATE <table> SET col = ?, ... WHERE id = ?` จาก object ที่มีแต่ field ที่ส่งมาจริง (ไม่ใช่ undefined)
// table เป็น literal string ที่กำหนดจากโค้ดเราเองเสมอ ไม่เคยมาจาก user input จึงไม่เสี่ยง SQL injection
async function partialUpdate(runner, table, id, columns) {
  const entries = Object.entries(columns).filter(([, v]) => v !== undefined);
  if (!entries.length) throw new AppError(400, 'ບໍ່ມີຂໍ້ມູນໃຫ້ອັບເດດ');

  const setClause = entries.map(([col]) => `${col} = ?`).join(', ');
  const values = entries.map(([, v]) => v);
  values.push(id);

  await runner.query(`UPDATE ${table} SET ${setClause} WHERE id = ?`, values);
}

module.exports = { partialUpdate };
