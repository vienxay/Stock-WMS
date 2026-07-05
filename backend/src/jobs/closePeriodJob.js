const cron = require("node-cron");
const pool = require("../config/db");
const logger = require("../utils/logger");

// ตกลงกับผู้ใช้ว่าจะไม่ "ล็อก" ยอดทุกเดือน (closed_at) เพราะต้องการสรุปและปิดยอดเป็นรายปีแทน
// งานนี้จึงยังคง generate snapshot รายเดือนไว้เหมือนเดิม (ให้ query เร็ว + เทียบ audit ได้)
// แต่ปล่อยให้แก้ไขได้ตลอดปี แล้วค่อยล็อกทีเดียวตอนขึ้นปีใหม่ (ดู closeYear ด้านล่าง)

function formatPeriod(year, month) {
  // month: 1-12
  return `${year}-${String(month).padStart(2, "0")}-01`;
}

function shiftMonth(year, month, delta) {
  const total = year * 12 + (month - 1) + delta;
  return { year: Math.floor(total / 12), month: (total % 12) + 1 };
}

// สร้าง/อัปเดต snapshot ของเดือนที่ระบุ (year, month: 1-12) จาก stock_movements ในเดือนนั้น
async function generateMonthlySummary(year, month) {
  const period = formatPeriod(year, month);
  const next = shiftMonth(year, month, 1);
  const prev = shiftMonth(year, month, -1);
  const nextPeriod = formatPeriod(next.year, next.month);
  const prevPeriod = formatPeriod(prev.year, prev.month);

  const [deltaRows] = await pool.query(
    `SELECT product_id, warehouse_id,
        SUM(CASE WHEN movement_type = 'RECEIPT' THEN quantity ELSE 0 END) AS received_qty,
        SUM(CASE WHEN movement_type = 'ISSUE' THEN -quantity ELSE 0 END) AS issued_qty,
        SUM(CASE WHEN movement_type = 'ADJUSTMENT' AND quantity > 0 THEN quantity ELSE 0 END) AS adjust_in_qty,
        SUM(CASE WHEN movement_type = 'ADJUSTMENT' AND quantity < 0 THEN -quantity ELSE 0 END) AS adjust_out_qty,
        SUM(CASE WHEN movement_type = 'TRANSFER_IN' THEN quantity ELSE 0 END) AS transfer_in_qty,
        SUM(CASE WHEN movement_type = 'TRANSFER_OUT' THEN -quantity ELSE 0 END) AS transfer_out_qty
     FROM stock_movements
     WHERE created_at >= ? AND created_at < ?
     GROUP BY product_id, warehouse_id`,
    [period, nextPeriod],
  );
  const deltaMap = new Map(
    deltaRows.map((r) => [`${r.product_id}-${r.warehouse_id}`, r]),
  );

  const [prevRows] = await pool.query(
    `SELECT product_id, warehouse_id, closing_qty FROM stock_period_summary WHERE period = ?`,
    [prevPeriod],
  );
  const prevMap = new Map(
    prevRows.map((r) => [`${r.product_id}-${r.warehouse_id}`, r.closing_qty]),
  );

  const [existingRows] = await pool.query(
    `SELECT product_id, warehouse_id, closed_at FROM stock_period_summary WHERE period = ?`,
    [period],
  );
  const existingMap = new Map(
    existingRows.map((r) => [`${r.product_id}-${r.warehouse_id}`, r.closed_at]),
  );

  const pairKeys = new Set([...deltaMap.keys(), ...prevMap.keys()]);

  for (const key of pairKeys) {
    if (existingMap.has(key) && existingMap.get(key) !== null) {
      // งวดนี้ถูกล็อกไปแล้ว (ปิดปีไปแล้ว) ห้ามเขียนทับ
      continue;
    }

    const [productId, warehouseId] = key.split("-").map(Number);
    const delta = deltaMap.get(key) || {
      received_qty: 0,
      issued_qty: 0,
      adjust_in_qty: 0,
      adjust_out_qty: 0,
      transfer_in_qty: 0,
      transfer_out_qty: 0,
    };
    const opening = Number(prevMap.get(key) || 0);
    const closing =
      opening +
      Number(delta.received_qty) -
      Number(delta.issued_qty) +
      Number(delta.adjust_in_qty) -
      Number(delta.adjust_out_qty) +
      Number(delta.transfer_in_qty) -
      Number(delta.transfer_out_qty);

    const [balanceRows] = await pool.query(
      "SELECT avg_unit_value_lak FROM stock_balance WHERE product_id = ? AND warehouse_id = ?",
      [productId, warehouseId],
    );
    const avgCost = balanceRows.length
      ? Number(balanceRows[0].avg_unit_value_lak)
      : 0;
    const closingValue = closing * avgCost;

    await pool.query(
      `INSERT INTO stock_period_summary
        (product_id, warehouse_id, period, opening_qty, received_qty, issued_qty,
         adjust_in_qty, adjust_out_qty, transfer_in_qty, transfer_out_qty, closing_qty, closing_value_lak)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         opening_qty = VALUES(opening_qty),
         received_qty = VALUES(received_qty),
         issued_qty = VALUES(issued_qty),
         adjust_in_qty = VALUES(adjust_in_qty),
         adjust_out_qty = VALUES(adjust_out_qty),
         transfer_in_qty = VALUES(transfer_in_qty),
         transfer_out_qty = VALUES(transfer_out_qty),
         closing_qty = VALUES(closing_qty),
         closing_value_lak = VALUES(closing_value_lak)`,
      [
        productId,
        warehouseId,
        period,
        opening,
        delta.received_qty,
        delta.issued_qty,
        delta.adjust_in_qty,
        delta.adjust_out_qty,
        delta.transfer_in_qty,
        delta.transfer_out_qty,
        closing,
        closingValue,
      ],
    );
  }

  logger.info(`generateMonthlySummary: ${period} (${pairKeys.size} รายการ)`);
}

// ล็อกยอดทั้งปีไม่ให้แก้ไขย้อนหลังอีก (เรียกตอนขึ้นปีใหม่ เพื่อปิดปีที่ผ่านมา)
async function closeYear(year) {
  const [result] = await pool.query(
    `UPDATE stock_period_summary SET closed_at = NOW()
     WHERE period BETWEEN ? AND ? AND closed_at IS NULL`,
    [formatPeriod(year, 1), formatPeriod(year, 12)],
  );
  logger.info(`closeYear: ${year} ล็อกไป ${result.affectedRows} แถว`);
}

function start() {
  // เที่ยงคืนวันที่ 1 ของทุกเดือน เวลา 01:00 -> สรุปยอดของเดือนก่อนหน้าที่เพิ่งจบไป
  cron.schedule("0 1 1 * *", async () => {
    const now = new Date();
    const { year, month } = shiftMonth(
      now.getFullYear(),
      now.getMonth() + 1,
      -1,
    );
    try {
      await generateMonthlySummary(year, month);
    } catch (err) {
      logger.error("generateMonthlySummary ล้มเหลว", { error: err.message });
    }
  });

  // 1 ม.ค. เวลา 02:00 -> ล็อกยอดปีที่ผ่านมาทั้งปี
  cron.schedule("0 2 1 1 *", async () => {
    const lastYear = new Date().getFullYear() - 1;
    try {
      await closeYear(lastYear);
    } catch (err) {
      logger.error("closeYear ล้มเหลว", { error: err.message });
    }
  });

  logger.info("closePeriodJob: cron jobs scheduled");
}

module.exports = { start, generateMonthlySummary, closeYear };
