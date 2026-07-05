const { z } = require("zod");
const pool = require("../config/db");
const asyncHandler = require("../utils/asyncHandler");

// currencies เป็นข้อมูลอ้างอิงคงที่ (LAK/THB/CNY) seed ไว้ใน schema แล้ว ไม่เปิด endpoint แก้ไข
const listCurrencies = asyncHandler(async (req, res) => {
  const [rows] = await pool.query("SELECT * FROM currencies ORDER BY code");
  res.json(rows);
});

const exchangeRateSchema = z.object({
  currencyCode: z.enum(["THB", "CNY"]), // ไม่รวม LAK เพราะเป็น base เอง (rate = 1 เสมอ)
  rateToBase: z.number().positive(),
  effectiveDate: z.string(), // 'YYYY-MM-DD'
});

const listExchangeRates = asyncHandler(async (req, res) => {
  const { currencyCode } = req.query;
  const where = currencyCode ? "WHERE currency_code = ?" : "";
  const params = currencyCode ? [currencyCode] : [];
  const [rows] = await pool.query(
    `SELECT * FROM exchange_rates ${where} ORDER BY currency_code, effective_date DESC`,
    params,
  );
  res.json(rows);
});

// UNIQUE KEY (currency_code, effective_date) — ถ้าตั้งอัตราวันเดิมซ้ำจะ throw ER_DUP_ENTRY -> 409 ที่ errorMiddleware
const createExchangeRate = asyncHandler(async (req, res) => {
  const body = exchangeRateSchema.parse(req.body);
  const [result] = await pool.query(
    "INSERT INTO exchange_rates (currency_code, rate_to_base, effective_date) VALUES (?, ?, ?)",
    [body.currencyCode, body.rateToBase, body.effectiveDate],
  );
  const [rows] = await pool.query("SELECT * FROM exchange_rates WHERE id = ?", [
    result.insertId,
  ]);
  res.status(201).json(rows[0]);
});

module.exports = { listCurrencies, listExchangeRates, createExchangeRate };
