import { apiClient } from "./client";

export const login = (username, password) =>
  apiClient.post("/auth/login", { username, password }).then((r) => r.data);

export const fetchMe = () => apiClient.get("/auth/me").then((r) => r.data);
