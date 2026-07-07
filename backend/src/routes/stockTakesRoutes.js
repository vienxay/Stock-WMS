const express = require("express");
const authMiddleware = require("../middleware/authMiddleware");
const { requireRole } = require("../middleware/roleMiddleware");
const ctrl = require("../controllers/stockTakesController");

const router = express.Router();

router.use(authMiddleware);

const canCount = requireRole("BRANCH_ADMIN", "WAREHOUSE_STAFF");

router.get("/", ctrl.listStockTakes);
router.get("/:id", ctrl.getStockTake);
router.post("/", canCount, ctrl.createStockTake);
router.put("/:id/items/:itemId", canCount, ctrl.updateCount);
router.post("/:id/complete", canCount, ctrl.completeStockTake);

module.exports = router;
