const express = require("express");
const authMiddleware = require("../middleware/authMiddleware");
const { requireRole } = require("../middleware/roleMiddleware");
const ctrl = require("../controllers/requisitionsController");

const router = express.Router();

router.use(authMiddleware);

router.get("/", ctrl.listRequisitions);
router.get("/:id", ctrl.getRequisition);
router.post(
  "/",
  requireRole("EMPLOYEE", "BRANCH_STORE_KEEPER"),
  ctrl.createRequisition,
);
router.put(
  "/:id/approve",
  requireRole("SYSTEM_ADMIN", "DEPT_APPROVER"),
  ctrl.approveRequisition,
);
router.put(
  "/:id/reject",
  requireRole("SYSTEM_ADMIN", "DEPT_APPROVER"),
  ctrl.rejectRequisition,
);
router.post(
  "/:id/issue",
  requireRole("SYSTEM_ADMIN", "BRANCH_STORE_KEEPER"),
  ctrl.issueRequisition,
);

module.exports = router;
