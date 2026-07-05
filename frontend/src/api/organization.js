import { apiClient } from "./client";

// Branches
export const listBranches = () =>
  apiClient.get("/organization/branches").then((r) => r.data);
export const createBranch = (body) =>
  apiClient.post("/organization/branches", body).then((r) => r.data);
export const updateBranch = (id, body) =>
  apiClient.put(`/organization/branches/${id}`, body).then((r) => r.data);

// Warehouse types
export const listWarehouseTypes = () =>
  apiClient.get("/organization/warehouse-types").then((r) => r.data);
export const createWarehouseType = (body) =>
  apiClient.post("/organization/warehouse-types", body).then((r) => r.data);

// Warehouses
export const listWarehouses = (params) =>
  apiClient.get("/organization/warehouses", { params }).then((r) => r.data);
export const createWarehouse = (body) =>
  apiClient.post("/organization/warehouses", body).then((r) => r.data);
export const updateWarehouse = (id, body) =>
  apiClient.put(`/organization/warehouses/${id}`, body).then((r) => r.data);

// Locations
export const listLocations = (params) =>
  apiClient.get("/organization/locations", { params }).then((r) => r.data);
export const createLocation = (body) =>
  apiClient.post("/organization/locations", body).then((r) => r.data);

// Departments
export const listDepartments = (params) =>
  apiClient.get("/organization/departments", { params }).then((r) => r.data);
export const createDepartment = (body) =>
  apiClient.post("/organization/departments", body).then((r) => r.data);

// Employees
export const listEmployees = (params) =>
  apiClient.get("/organization/employees", { params }).then((r) => r.data);
export const createEmployee = (body) =>
  apiClient.post("/organization/employees", body).then((r) => r.data);
export const updateEmployee = (id, body) =>
  apiClient.put(`/organization/employees/${id}`, body).then((r) => r.data);

// Users
export const listUsers = () =>
  apiClient.get("/organization/users").then((r) => r.data);
export const createUser = (body) =>
  apiClient.post("/organization/users", body).then((r) => r.data);
export const updateUser = (id, body) =>
  apiClient.put(`/organization/users/${id}`, body).then((r) => r.data);

// Roles
export const listRoles = () =>
  apiClient.get("/organization/roles").then((r) => r.data);

// User roles
export const listUserRoles = (params) =>
  apiClient.get("/organization/user-roles", { params }).then((r) => r.data);
export const assignUserRole = (body) =>
  apiClient.post("/organization/user-roles", body).then((r) => r.data);
export const revokeUserRole = (id) =>
  apiClient.delete(`/organization/user-roles/${id}`).then((r) => r.data);
