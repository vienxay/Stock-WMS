const express = require("express");
const authMiddleware = require("../middleware/authMiddleware");
const { requireRole } = require("../middleware/roleMiddleware");
const ctrl = require("../controllers/organizationController");

const router = express.Router();

router.use(authMiddleware);

// ทุกคนที่ login แล้วอ่านได้ (ใช้เป็น dropdown ในหน้าอื่นๆ) แก้ไขได้เฉพาะ SYSTEM_ADMIN
router.get("/branches", ctrl.listBranches);
router.post("/branches", requireRole("SYSTEM_ADMIN"), ctrl.createBranch);
router.put("/branches/:id", requireRole("SYSTEM_ADMIN"), ctrl.updateBranch);

router.get("/warehouse-types", ctrl.listWarehouseTypes);
router.post(
  "/warehouse-types",
  requireRole("SYSTEM_ADMIN"),
  ctrl.createWarehouseType,
);

router.get("/warehouses", ctrl.listWarehouses);
router.post("/warehouses", requireRole("SYSTEM_ADMIN"), ctrl.createWarehouse);
router.put(
  "/warehouses/:id",
  requireRole("SYSTEM_ADMIN"),
  ctrl.updateWarehouse,
);

router.get("/locations", ctrl.listLocations);
router.post("/locations", requireRole("SYSTEM_ADMIN"), ctrl.createLocation);

router.get("/departments", ctrl.listDepartments);
router.post("/departments", requireRole("SYSTEM_ADMIN"), ctrl.createDepartment);

router.get("/employees", ctrl.listEmployees);
router.post("/employees", requireRole("SYSTEM_ADMIN"), ctrl.createEmployee);
router.put("/employees/:id", requireRole("SYSTEM_ADMIN"), ctrl.updateEmployee);

router.get("/users", requireRole("SYSTEM_ADMIN"), ctrl.listUsers);
router.post("/users", requireRole("SYSTEM_ADMIN"), ctrl.createUser);
router.put("/users/:id", requireRole("SYSTEM_ADMIN"), ctrl.updateUser);

router.get("/roles", ctrl.listRoles);

router.get("/user-roles", requireRole("SYSTEM_ADMIN"), ctrl.listUserRoles);
router.post("/user-roles", requireRole("SYSTEM_ADMIN"), ctrl.assignUserRole);
router.delete(
  "/user-roles/:id",
  requireRole("SYSTEM_ADMIN"),
  ctrl.revokeUserRole,
);

module.exports = router;
