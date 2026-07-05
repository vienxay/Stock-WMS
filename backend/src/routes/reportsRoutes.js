const express = require("express");
const authMiddleware = require("../middleware/authMiddleware");
const ctrl = require("../controllers/reportsController");

const router = express.Router();

router.use(authMiddleware);

router.get("/stock-balance", ctrl.getStockBalanceReport);
router.get("/movements", ctrl.getMovementsReport);
router.get("/period-summary", ctrl.getPeriodSummary);
router.get("/period-summary/yearly", ctrl.getYearlySummary);

module.exports = router;
