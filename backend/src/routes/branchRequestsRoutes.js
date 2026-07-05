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
  requireRole("SYSTEM_ADMIN", "BRANCH_STORE_KEEPER"),
  ctrl.createRequest,
);
router.put(
  "/:id/approve",
  requireRole("SYSTEM_ADMIN", "HQ_APPROVER"),
  ctrl.approveRequest,
);
router.put(
  "/:id/reject",
  requireRole("SYSTEM_ADMIN", "HQ_APPROVER"),
  ctrl.rejectRequest,
);
router.post(
  "/:id/transfer",
  requireRole("SYSTEM_ADMIN", "HQ_STORE_KEEPER"),
  ctrl.transferRequest,
);

module.exports = router;
