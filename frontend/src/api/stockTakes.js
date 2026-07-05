import { apiClient } from "./client";

export const listStockTakes = (params) =>
  apiClient.get("/stock-takes", { params }).then((r) => r.data);
export const getStockTake = (id) =>
  apiClient.get(`/stock-takes/${id}`).then((r) => r.data);
export const createStockTake = (body) =>
  apiClient.post("/stock-takes", body).then((r) => r.data);
export const updateStockTakeCount = (id, itemId, countedQty) =>
  apiClient
    .put(`/stock-takes/${id}/items/${itemId}`, { countedQty })
    .then((r) => r.data);
export const completeStockTake = (id) =>
  apiClient.post(`/stock-takes/${id}/complete`).then((r) => r.data);
