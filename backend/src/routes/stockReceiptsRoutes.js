const express = require("express");
const authMiddleware = require("../middleware/authMiddleware");
const { requireRole } = require("../middleware/roleMiddleware");
const ctrl = require("../controllers/stockReceiptsController");

const router = express.Router();

router.use(authMiddleware);

router.get("/", ctrl.listReceipts);
router.get("/:id", ctrl.getReceipt);
router.post(
  "/",
  requireRole("BRANCH_ADMIN", "WAREHOUSE_STAFF"),
  ctrl.createReceipt,
);
router.put(
  "/:id",
  requireRole("BRANCH_ADMIN", "WAREHOUSE_STAFF"),
  ctrl.updateReceipt,
);
router.put(
  "/:id/approve",
  requireRole("BRANCH_ADMIN"),
  ctrl.approveReceipt,
);
router.put(
  "/:id/reject",
  requireRole("BRANCH_ADMIN"),
  ctrl.rejectReceipt,
);

module.exports = router;
