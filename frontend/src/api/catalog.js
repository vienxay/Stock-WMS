import { apiClient } from "./client";

// Groups
export const listGroups = () =>
  apiClient.get("/catalog/groups").then((r) => r.data);
export const createGroup = (body) =>
  apiClient.post("/catalog/groups", body).then((r) => r.data);
export const updateGroup = (id, body) =>
  apiClient.put(`/catalog/groups/${id}`, body).then((r) => r.data);

// Categories
export const listCategories = (params) =>
  apiClient.get("/catalog/categories", { params }).then((r) => r.data);
export const createCategory = (body) =>
  apiClient.post("/catalog/categories", body).then((r) => r.data);
export const updateCategory = (id, body) =>
  apiClient.put(`/catalog/categories/${id}`, body).then((r) => r.data);

// Usage areas
export const listUsageAreas = (params) =>
  apiClient.get("/catalog/usage-areas", { params }).then((r) => r.data);
export const createUsageArea = (body) =>
  apiClient.post("/catalog/usage-areas", body).then((r) => r.data);
export const updateUsageArea = (id, body) =>
  apiClient.put(`/catalog/usage-areas/${id}`, body).then((r) => r.data);
