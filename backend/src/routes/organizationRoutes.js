const express = require("express");
const authMiddleware = require("../middleware/authMiddleware");
const { requireRole } = require("../middleware/roleMiddleware");
const ctrl = require("../controllers/organizationController");

const router = express.Router();

router.use(authMiddleware);

// ทุกคนที่ login แล้วอ่านได้ (ใช้เป็น dropdown ในหน้าอื่นๆ) แก้ไขได้เฉพาะ SUPER_ADMIN
router.get("/branches", ctrl.listBranches);
router.post("/branches", requireRole(), ctrl.createBranch);
router.put("/branches/:id", requireRole(), ctrl.updateBranch);

router.get("/warehouse-types", ctrl.listWarehouseTypes);
router.post(
  "/warehouse-types",
  requireRole(),
  ctrl.createWarehouseType,
);

router.get("/warehouses", ctrl.listWarehouses);
router.post("/warehouses", requireRole(), ctrl.createWarehouse);
router.put(
  "/warehouses/:id",
  requireRole(),
  ctrl.updateWarehouse,
);

router.get("/locations", ctrl.listLocations);
router.post("/locations", requireRole(), ctrl.createLocation);

router.get("/departments", ctrl.listDepartments);
router.post("/departments", requireRole(), ctrl.createDepartment);

router.get("/employees", ctrl.listEmployees);
router.post("/employees", requireRole(), ctrl.createEmployee);
router.put("/employees/:id", requireRole(), ctrl.updateEmployee);

router.get("/users", requireRole(), ctrl.listUsers);
router.post("/users", requireRole(), ctrl.createUser);
router.put("/users/:id", requireRole(), ctrl.updateUser);

router.get("/roles", ctrl.listRoles);

router.get("/user-roles", requireRole(), ctrl.listUserRoles);
router.post("/user-roles", requireRole(), ctrl.assignUserRole);
router.delete(
  "/user-roles/:id",
  requireRole(),
  ctrl.revokeUserRole,
);

module.exports = router;
