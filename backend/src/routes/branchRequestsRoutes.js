const express = require("express");
const authMiddleware = require("../middleware/authMiddleware");
const { requireRole } = require("../middleware/roleMiddleware");
const ctrl = require("../controllers/branchRequestsController");

const router = express.Router();

router.use(authMiddleware);

router.get("/", ctrl.listRequests);
router.get("/:id", ctrl.getRequest);
router.post(
  "/",
  requireRole("BRANCH_ADMIN", "WAREHOUSE_STAFF"),
  ctrl.createRequest,
);
router.post(
  "/quick-transfer",
  requireRole("BRANCH_ADMIN", "WAREHOUSE_STAFF"),
  ctrl.quickTransfer,
);
router.put(
  "/:id/approve",
  requireRole("BRANCH_ADMIN"),
  ctrl.approveRequest,
);
router.put(
  "/:id/reject",
  requireRole("BRANCH_ADMIN"),
  ctrl.rejectRequest,
);
router.post(
  "/:id/transfer",
  requireRole("BRANCH_ADMIN"),
  ctrl.transferRequest,
);

module.exports = router;
