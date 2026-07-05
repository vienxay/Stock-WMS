const AppError = require('../utils/AppError');

// หาอัตราแลกเปลี่ยนล่าสุด ณ วันที่กำหนด (หรือก่อนหน้า) เพื่อแปลงเป็น LAK
// LAK เป็น base currency เอง ไม่มีแถวใน exchange_rates จึง return 1 ตรงๆ
async function getRateToBase(runner, currencyCode, date) {
  if (currencyCode === 'LAK') return 1;

  const [rows] = await runner.query(
    `SELECT rate_to_base FROM exchange_rates
     WHERE currency_code = ? AND effective_date <= ?
     ORDER BY effective_date DESC
     LIMIT 1`,
    [currencyCode, date]
  );

  if (!rows.length) {
    throw new AppError(400, `ไม่พบอัตราแลกเปลี่ยนของ ${currencyCode} ณ วันที่ ${date} หรือก่อนหน้า`);
  }

  return Number(rows[0].rate_to_base);
}

module.exports = { getRateToBase };
