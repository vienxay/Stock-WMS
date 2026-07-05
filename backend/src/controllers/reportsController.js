const ExcelJS = require("exceljs");
const pool = require("../config/db");
const AppError = require("../utils/AppError");
const asyncHandler = require("../utils/asyncHandler");

async function sendAsExcel(res, sheetName, columns, rows, filename) {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet(sheetName);
  sheet.columns = columns;
  sheet.addRows(rows);
  sheet.getRow(1).font = { bold: true };

  res.setHeader(
    "Content-Type",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  );
  res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
  await workbook.xlsx.write(res);
  res.end();
}

// ---------------------------------------------------------------------
// สต็อกคงเหลือปัจจุบัน (พร้อมมูลค่า) แยกตามคลัง/หมวดหมู่
// ---------------------------------------------------------------------

const getStockBalanceReport = asyncHandler(async (req, res) => {
  const { warehouseId, categoryId, format } = req.query;
  const conditions = [];
  const params = [];
  if (warehouseId) {
    conditions.push("sb.warehouse_id = ?");
    params.push(warehouseId);
  }
  if (categoryId) {
    conditions.push("p.category_id = ?");
    params.push(categoryId);
  }
  const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";

  const [rows] = await pool.query(
    `SELECT p.sku, p.name_lo AS product_name, p.unit_lo, w.name AS warehouse_name,
            sb.quantity, sb.avg_unit_value_lak,
            (sb.quantity * sb.avg_unit_value_lak) AS total_value_lak
     FROM stock_balance sb
     JOIN products p ON p.id = sb.product_id
     JOIN warehouses w ON w.id = sb.warehouse_id
     ${where}
     ORDER BY w.name, p.name_lo`,
    params,
  );

  if (format === "xlsx") {
    return sendAsExcel(
      res,
      "StockBalance",
      [
        { header: "SKU", key: "sku", width: 15 },
        { header: "ชื่อสินค้า", key: "product_name", width: 30 },
        { header: "หน่วย", key: "unit_lo", width: 10 },
        { header: "คลัง", key: "warehouse_name", width: 25 },
        { header: "จำนวนคงเหลือ", key: "quantity", width: 15 },
        {
          header: "ต้นทุนเฉลี่ย/หน่วย (LAK)",
          key: "avg_unit_value_lak",
          width: 20,
        },
        { header: "มูลค่ารวม (LAK)", key: "total_value_lak", width: 20 },
      ],
      rows,
      "stock-balance.xlsx",
    );
  }

  res.json(rows);
});

// ---------------------------------------------------------------------
// ประวัติการเคลื่อนไหวสต็อก (audit trail)
// ---------------------------------------------------------------------

const getMovementsReport = asyncHandler(async (req, res) => {
  const {
    productId,
    warehouseId,
    movementType,
    dateFrom,
    dateTo,
    limit = "100",
    offset = "0",
  } = req.query;
  const conditions = [];
  const params = [];
  if (productId) {
    conditions.push("sm.product_id = ?");
    params.push(productId);
  }
  if (warehouseId) {
    conditions.push("sm.warehouse_id = ?");
    params.push(warehouseId);
  }
  if (movementType) {
    conditions.push("sm.movement_type = ?");
    params.push(movementType);
  }
  if (dateFrom) {
    conditions.push("sm.created_at >= ?");
    params.push(dateFrom);
  }
  if (dateTo) {
    conditions.push("sm.created_at <= ?");
    params.push(dateTo);
  }
  const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
  const safeLimit = Math.min(Number(limit) || 100, 500);
  const safeOffset = Number(offset) || 0;

  const [rows] = await pool.query(
    `SELECT sm.*, p.sku, p.name_lo AS product_name, w.name AS warehouse_name, u.username AS created_by_username
     FROM stock_movements sm
     JOIN products p ON p.id = sm.product_id
     JOIN warehouses w ON w.id = sm.warehouse_id
     JOIN users u ON u.id = sm.created_by
     ${where}
     ORDER BY sm.created_at DESC, sm.id DESC
     LIMIT ? OFFSET ?`,
    [...params, safeLimit, safeOffset],
  );
  res.json(rows);
});

// ---------------------------------------------------------------------
// สรุปสต็อกรายเดือน (จาก stock_period_summary ที่ closePeriodJob generate ไว้)
// ---------------------------------------------------------------------

const getPeriodSummary = asyncHandler(async (req, res) => {
  const { warehouseId, year, productId } = req.query;
  if (!warehouseId || !year) {
    throw new AppError(400, "ต้องระบุ warehouseId และ year");
  }

  const conditions = ["warehouse_id = ?", "period BETWEEN ? AND ?"];
  const params = [warehouseId, `${year}-01-01`, `${year}-12-01`];
  if (productId) {
    conditions.push("product_id = ?");
    params.push(productId);
  }

  const [rows] = await pool.query(
    `SELECT sps.*, p.sku, p.name_lo AS product_name
     FROM stock_period_summary sps
     JOIN products p ON p.id = sps.product_id
     WHERE ${conditions.join(" AND ")}
     ORDER BY p.name_lo, sps.period`,
    params,
  );
  res.json(rows);
});

// ---------------------------------------------------------------------
// สรุปสต็อกรายปี — รวม 12 เดือนจาก stock_period_summary เป็นแถวเดียวต่อสินค้า
// (แทนการปิดงวด/ล็อกยอดรายเดือน ตามที่ตกลงว่าจะสรุปและล็อกเป็นรายปีแทน)
// ---------------------------------------------------------------------

const getYearlySummary = asyncHandler(async (req, res) => {
  const { warehouseId, year, format } = req.query;
  if (!warehouseId || !year) {
    throw new AppError(400, "ต้องระบุ warehouseId และ year");
  }

  const [rows] = await pool.query(
    `SELECT
        p.id AS product_id, p.sku, p.name_lo AS product_name, p.unit_lo,
        (SELECT opening_qty FROM stock_period_summary
          WHERE product_id = p.id AND warehouse_id = ? AND period = ?
          LIMIT 1) AS opening_qty,
        COALESCE(SUM(sps.received_qty), 0) AS received_qty,
        COALESCE(SUM(sps.issued_qty), 0) AS issued_qty,
        COALESCE(SUM(sps.adjust_in_qty), 0) AS adjust_in_qty,
        COALESCE(SUM(sps.adjust_out_qty), 0) AS adjust_out_qty,
        COALESCE(SUM(sps.transfer_in_qty), 0) AS transfer_in_qty,
        COALESCE(SUM(sps.transfer_out_qty), 0) AS transfer_out_qty,
        (SELECT closing_qty FROM stock_period_summary
          WHERE product_id = p.id AND warehouse_id = ? AND period = ?
          LIMIT 1) AS closing_qty,
        (SELECT closing_value_lak FROM stock_period_summary
          WHERE product_id = p.id AND warehouse_id = ? AND period = ?
          LIMIT 1) AS closing_value_lak
     FROM stock_period_summary sps
     JOIN products p ON p.id = sps.product_id
     WHERE sps.warehouse_id = ? AND sps.period BETWEEN ? AND ?
     GROUP BY p.id, p.sku, p.name_lo, p.unit_lo
     ORDER BY p.name_lo`,
    [
      warehouseId,
      `${year}-01-01`,
      warehouseId,
      `${year}-12-01`,
      warehouseId,
      `${year}-12-01`,
      warehouseId,
      `${year}-01-01`,
      `${year}-12-01`,
    ],
  );

  if (format === "xlsx") {
    return sendAsExcel(
      res,
      `Summary${year}`,
      [
        { header: "SKU", key: "sku", width: 15 },
        { header: "ชื่อสินค้า", key: "product_name", width: 30 },
        { header: "หน่วย", key: "unit_lo", width: 10 },
        { header: "ยอดยกมา", key: "opening_qty", width: 12 },
        { header: "รับเข้า", key: "received_qty", width: 12 },
        { header: "เบิกใช้", key: "issued_qty", width: 12 },
        { header: "ปรับเพิ่ม", key: "adjust_in_qty", width: 12 },
        { header: "ปรับลด", key: "adjust_out_qty", width: 12 },
        { header: "โอนเข้า", key: "transfer_in_qty", width: 12 },
        { header: "โอนออก", key: "transfer_out_qty", width: 12 },
        { header: "ยอดปลายปี", key: "closing_qty", width: 12 },
        { header: "มูลค่าปลายปี (LAK)", key: "closing_value_lak", width: 18 },
      ],
      rows,
      `stock-summary-${year}.xlsx`,
    );
  }

  res.json(rows);
});

module.exports = {
  getStockBalanceReport,
  getMovementsReport,
  getPeriodSummary,
  getYearlySummary,
};
