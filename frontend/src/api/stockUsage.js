import { apiClient } from "./client";

export const listUsages = (params) =>
  apiClient.get("/stock-usages", { params }).then((r) => r.data);
export const createUsage = (body) =>
  apiClient.post("/stock-usages", body).then((r) => r.data);
