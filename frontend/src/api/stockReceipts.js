import { apiClient } from "./client";

export const listReceipts = (params) =>
  apiClient.get("/stock-receipts", { params }).then((r) => r.data);
export const getReceipt = (id) =>
  apiClient.get(`/stock-receipts/${id}`).then((r) => r.data);
export const createReceipt = (body) =>
  apiClient.post("/stock-receipts", body).then((r) => r.data);
export const updateReceipt = (id, body) =>
  apiClient.put(`/stock-receipts/${id}`, body).then((r) => r.data);
export const approveReceipt = (id) =>
  apiClient.put(`/stock-receipts/${id}/approve`).then((r) => r.data);
export const rejectReceipt = (id) =>
  apiClient.put(`/stock-receipts/${id}/reject`).then((r) => r.data);
