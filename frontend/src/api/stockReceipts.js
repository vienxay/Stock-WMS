import { apiClient } from "./client";

export const listReceipts = (params) =>
  apiClient.get("/stock-receipts", { params }).then((r) => r.data);
export const getReceipt = (id) =>
  apiClient.get(`/stock-receipts/${id}`).then((r) => r.data);
export const createReceipt = (body) =>
  apiClient.post("/stock-receipts", body).then((r) => r.data);
