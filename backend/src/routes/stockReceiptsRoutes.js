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

module.exports = router;
