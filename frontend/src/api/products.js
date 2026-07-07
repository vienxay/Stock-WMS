import { apiClient } from "./client";

export const listProducts = (params) =>
  apiClient.get("/products", { params }).then((r) => r.data);
export const getProduct = (id) =>
  apiClient.get(`/products/${id}`).then((r) => r.data);
export const lookupProduct = (code) =>
  apiClient.get("/products/lookup", { params: { code } }).then((r) => r.data);
export const getProductStock = (id) =>
  apiClient.get(`/products/${id}/stock`).then((r) => r.data);
export const createProduct = (body) =>
  apiClient.post("/products", body).then((r) => r.data);
export const updateProduct = (id, body) =>
  apiClient.put(`/products/${id}`, body).then((r) => r.data);
export const deleteProduct = (id) =>
  apiClient.delete(`/products/${id}`).then((r) => r.data);

export const bulkDeleteProducts = (ids) =>
  apiClient
    .delete("/products/bulk-delete", { data: { ids } })
    .then((r) => r.data);

export const uploadProductImage = (id, file, isPrimary) => {
  const form = new FormData();
  form.append("image", file);
  if (isPrimary) form.append("isPrimary", "true");
  return apiClient
    .post(`/products/${id}/images`, form, {
      headers: { "Content-Type": "multipart/form-data" },
    })
    .then((r) => r.data);
};

export const setPrimaryProductImage = (id, imageId) =>
  apiClient
    .put(`/products/${id}/images/${imageId}/primary`)
    .then((r) => r.data);

export const deleteProductImage = (id, imageId) =>
  apiClient.delete(`/products/${id}/images/${imageId}`).then((r) => r.data);

export const bulkImportProducts = (file) => {
  const form = new FormData();
  form.append("file", file);
  return apiClient
    .post("/products/bulk-import", form, {
      headers: { "Content-Type": "multipart/form-data" },
    })
    .then((r) => r.data);
};

export const downloadImportTemplate = () =>
  apiClient
    .get("/products/import-template", { responseType: "blob" })
    .then((r) => r.data);

export const exportProducts = (params) =>
  apiClient
    .get("/products/export", { params, responseType: "blob" })
    .then((r) => r.data);

// เป็น endpoint ที่ต้อง login เข้าถึง (ไม่ใช่ static file) — ดึงมาเป็น blob แล้วสร้าง object URL
// ใช้เป็น <img src> โดยตรงไม่ได้ เพราะ browser ไม่แนบ Authorization header ให้ตอนโหลดรูป
export const getProductBarcode = (id) =>
  apiClient
    .get(`/products/${id}/barcode`, { responseType: "blob" })
    .then((r) => r.data);

export const getProductQrCode = (id) =>
  apiClient
    .get(`/products/${id}/qrcode`, { responseType: "blob" })
    .then((r) => r.data);
