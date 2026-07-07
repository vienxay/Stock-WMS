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
router.put("/locations/:id", requireRole(), ctrl.updateLocation);
router.delete("/locations/:id", requireRole(), ctrl.deleteLocation);

router.get("/departments", ctrl.listDepartments);
router.post("/departments", requireRole(), ctrl.createDepartment);

// พนักงาน/ผู้ใช้/สิทธิ์ — SUPER_ADMIN ทำได้ทุกสาขา, BRANCH_ADMIN ทำได้เฉพาะสาขาตัวเอง (สโคปเช็คในคอนโทรลเลอร์)
router.get("/employees", requireRole("BRANCH_ADMIN"), ctrl.listEmployees);
router.post("/employees", requireRole("BRANCH_ADMIN"), ctrl.createEmployee);
router.put("/employees/:id", requireRole("BRANCH_ADMIN"), ctrl.updateEmployee);

router.get("/users", requireRole("BRANCH_ADMIN"), ctrl.listUsers);
router.post("/users", requireRole("BRANCH_ADMIN"), ctrl.createUser);
router.put("/users/:id", requireRole("BRANCH_ADMIN"), ctrl.updateUser);

router.get("/roles", ctrl.listRoles);

router.get("/user-roles", requireRole("BRANCH_ADMIN"), ctrl.listUserRoles);
router.post("/user-roles", requireRole("BRANCH_ADMIN"), ctrl.assignUserRole);
router.delete(
  "/user-roles/:id",
  requireRole("BRANCH_ADMIN"),
  ctrl.revokeUserRole,
);

module.exports = router;
