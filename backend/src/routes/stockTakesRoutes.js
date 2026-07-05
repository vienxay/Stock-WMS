const express = require("express");
const authMiddleware = require("../middleware/authMiddleware");
const { requireRole } = require("../middleware/roleMiddleware");
const ctrl = require("../controllers/stockTakesController");

const router = express.Router();

router.use(authMiddleware);

const canCount = requireRole(
  "SYSTEM_ADMIN",
  "HQ_STORE_KEEPER",
  "BRANCH_STORE_KEEPER",
);

router.get("/", ctrl.listStockTakes);
router.get("/:id", ctrl.getStockTake);
router.post("/", canCount, ctrl.createStockTake);
router.put("/:id/items/:itemId", canCount, ctrl.updateCount);
router.post("/:id/complete", canCount, ctrl.completeStockTake);

module.exports = router;
