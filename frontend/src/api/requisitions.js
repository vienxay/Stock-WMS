import { apiClient } from "./client";

export const listRequisitions = (params) =>
  apiClient.get("/requisitions", { params }).then((r) => r.data);
export const getRequisition = (id) =>
  apiClient.get(`/requisitions/${id}`).then((r) => r.data);
export const createRequisition = (body) =>
  apiClient.post("/requisitions", body).then((r) => r.data);
export const approveRequisition = (id) =>
  apiClient.put(`/requisitions/${id}/approve`).then((r) => r.data);
export const rejectRequisition = (id) =>
  apiClient.put(`/requisitions/${id}/reject`).then((r) => r.data);
export const issueRequisition = (id, body) =>
  apiClient.post(`/requisitions/${id}/issue`, body).then((r) => r.data);
