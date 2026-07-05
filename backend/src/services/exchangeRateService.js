const AppError = require('../utils/AppError');

// หาอัตราแลกเปลี่ยนล่าสุด ໃນວັນທີกำหนด (ຫຼືກ່ອນໜ້ານັ້ນ) เพื่อแปลงเป็น LAK
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
    throw new AppError(400, `ບໍ່ພົບອັດຕາແລກປ່ຽນຂອງ ${currencyCode} ໃນວັນທີ ${date} ຫຼືກ່ອນໜ້ານັ້ນ`);
  }

  return Number(rows[0].rate_to_base);
}

module.exports = { getRateToBase };
