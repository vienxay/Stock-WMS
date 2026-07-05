const AppError = require('../utils/AppError');

// บันทึกการเคลื่อนไหวสต็อก 1 รายการ + sync stock_balance (ต้นทุนเฉลี่ยถ่วงน้ำหนัก)
// runner ต้องเป็น connection ที่อยู่ใน transaction เดียวกับ caller (ไม่ใช่ pool เฉยๆ)
// เพราะ TRANSFER/ISSUE ต้องมีหลาย movement สำเร็จพร้อมกันทั้งหมดหรือไม่สำเร็จเลย
//
// quantity: ค่าบวก = เข้าคลัง, ค่าลบ = ออกจากคลัง (ตาม convention ใน schema)
// unitValueLak: บังคับสำหรับขาเข้า (ต้นทุนของสิ่งที่เข้ามา) ส่วนขาออกจะคำนวณจาก avg cost ปัจจุบันเอง
async function recordMovement(runner, params) {
  const {
    productId,
    warehouseId,
    movementType,
    quantity,
    unitValueLak,
    referenceTable,
    referenceId,
    note,
    createdBy,
  } = params;

  if (!quantity) {
    throw new AppError(500, 'quantity ຂອງ stock movement ຕ້ອງບໍ່ເປັນ 0');
  }

  await runner.query(
    `INSERT INTO stock_balance (product_id, warehouse_id, quantity, avg_unit_value_lak)
     VALUES (?, ?, 0, 0)
     ON DUPLICATE KEY UPDATE product_id = product_id`,
    [productId, warehouseId]
  );

  const [balanceRows] = await runner.query(
    `SELECT quantity, avg_unit_value_lak FROM stock_balance
     WHERE product_id = ? AND warehouse_id = ? FOR UPDATE`,
    [productId, warehouseId]
  );
  const balance = balanceRows[0];

  let effectiveUnitValue = unitValueLak;

  if (quantity > 0) {
    if (unitValueLak === undefined || unitValueLak === null) {
      throw new AppError(500, 'ຕ້ອງລະບຸ unitValueLak ສຳລັບການເຄື່ອນໄຫວຂາເຂົ້າ');
    }
    const newQty = Number(balance.quantity) + Number(quantity);
    const newAvgValue =
      newQty === 0
        ? 0
        : (Number(balance.quantity) * Number(balance.avg_unit_value_lak) +
            Number(quantity) * Number(unitValueLak)) /
          newQty;

    await runner.query(
      `UPDATE stock_balance SET quantity = ?, avg_unit_value_lak = ?
       WHERE product_id = ? AND warehouse_id = ?`,
      [newQty, newAvgValue, productId, warehouseId]
    );
  } else {
    effectiveUnitValue = Number(balance.avg_unit_value_lak);
    const newQty = Number(balance.quantity) + Number(quantity);
    if (newQty < 0) {
      throw new AppError(400, 'ສະຕັອກຄົງເຫຼືອບໍ່ພໍສຳລັບລາຍການນີ້');
    }
    await runner.query(
      `UPDATE stock_balance SET quantity = ? WHERE product_id = ? AND warehouse_id = ?`,
      [newQty, productId, warehouseId]
    );
  }

  const totalValueLak = Number(quantity) * Number(effectiveUnitValue);

  const [result] = await runner.query(
    `INSERT INTO stock_movements
      (product_id, warehouse_id, movement_type, quantity, unit_value_lak, total_value_lak,
       reference_table, reference_id, note, created_by)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      productId,
      warehouseId,
      movementType,
      quantity,
      effectiveUnitValue,
      totalValueLak,
      referenceTable,
      referenceId,
      note || null,
      createdBy,
    ]
  );

  return { movementId: result.insertId, unitValueLak: effectiveUnitValue, totalValueLak };
}

async function getBalance(runner, productId, warehouseId) {
  const [rows] = await runner.query(
    `SELECT quantity, avg_unit_value_lak FROM stock_balance
     WHERE product_id = ? AND warehouse_id = ?`,
    [productId, warehouseId]
  );
  return rows[0] || { quantity: 0, avg_unit_value_lak: 0 };
}

module.exports = { recordMovement, getBalance };
