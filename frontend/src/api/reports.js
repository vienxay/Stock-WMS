import { apiClient } from "./client";

export const getStockBalanceReport = (params) =>
  apiClient.get("/reports/stock-balance", { params }).then((r) => r.data);

export const getMovementsReport = (params) =>
  apiClient.get("/reports/movements", { params }).then((r) => r.data);

export const getPeriodSummary = (params) =>
  apiClient.get("/reports/period-summary", { params }).then((r) => r.data);

export const getYearlySummary = (params) =>
  apiClient
    .get("/reports/period-summary/yearly", { params })
    .then((r) => r.data);

// ดาวน์โหลดไฟล์ Excel ตรงๆ (response เป็น blob ไม่ใช่ json)
async function downloadXlsx(path, params, filename) {
  const response = await apiClient.get(path, {
    params: { ...params, format: "xlsx" },
    responseType: "blob",
  });
  const url = window.URL.createObjectURL(new Blob([response.data]));
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
}

export const exportStockBalanceXlsx = (params) =>
  downloadXlsx("/reports/stock-balance", params, "stock-balance.xlsx");

export const exportYearlySummaryXlsx = (params) =>
  downloadXlsx(
    "/reports/period-summary/yearly",
    params,
    `stock-summary-${params.year}.xlsx`,
  );
