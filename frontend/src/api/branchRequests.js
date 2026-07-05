import { apiClient } from "./client";

export const listBranchRequests = (params) =>
  apiClient.get("/branch-requests", { params }).then((r) => r.data);
export const getBranchRequest = (id) =>
  apiClient.get(`/branch-requests/${id}`).then((r) => r.data);
export const createBranchRequest = (body) =>
  apiClient.post("/branch-requests", body).then((r) => r.data);
export const approveBranchRequest = (id, body) =>
  apiClient.put(`/branch-requests/${id}/approve`, body).then((r) => r.data);
export const rejectBranchRequest = (id, body) =>
  apiClient.put(`/branch-requests/${id}/reject`, body).then((r) => r.data);
export const transferBranchRequest = (id) =>
  apiClient.post(`/branch-requests/${id}/transfer`).then((r) => r.data);
