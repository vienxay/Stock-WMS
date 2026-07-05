import { apiClient } from "./client";

export const listProducts = (params) =>
  apiClient.get("/products", { params }).then((r) => r.data);
export const getProduct = (id) =>
  apiClient.get(`/products/${id}`).then((r) => r.data);
export const getProductStock = (id) =>
  apiClient.get(`/products/${id}/stock`).then((r) => r.data);
export const createProduct = (body) =>
  apiClient.post("/products", body).then((r) => r.data);
export const updateProduct = (id, body) =>
  apiClient.put(`/products/${id}`, body).then((r) => r.data);

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
