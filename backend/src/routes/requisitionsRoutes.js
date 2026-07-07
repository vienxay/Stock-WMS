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
  requireRole("WAREHOUSE_STAFF"),
  ctrl.createRequisition,
);
router.put(
  "/:id/approve",
  requireRole("BRANCH_ADMIN"),
  ctrl.approveRequisition,
);
router.put(
  "/:id/reject",
  requireRole("BRANCH_ADMIN"),
  ctrl.rejectRequisition,
);
router.put(
  "/:id/confirm-receipt",
  requireRole("WAREHOUSE_STAFF"),
  ctrl.confirmReceipt,
);

module.exports = router;
