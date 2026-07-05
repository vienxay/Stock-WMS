import { apiClient } from "./client";

export const getSettings = () =>
  apiClient.get("/settings").then((r) => r.data);

export const updateSettings = (body) =>
  apiClient.put("/settings", body).then((r) => r.data);

export const uploadLogo = (file) => {
  const form = new FormData();
  form.append("image", file);
  return apiClient
    .post("/settings/logo", form, {
      headers: { "Content-Type": "multipart/form-data" },
    })
    .then((r) => r.data);
};

export const uploadLoginBackground = (file) => {
  const form = new FormData();
  form.append("image", file);
  return apiClient
    .post("/settings/login-background", form, {
      headers: { "Content-Type": "multipart/form-data" },
    })
    .then((r) => r.data);
};
