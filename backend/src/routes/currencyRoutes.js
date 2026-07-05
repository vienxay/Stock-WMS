const express = require("express");
const authMiddleware = require("../middleware/authMiddleware");
const { requireRole } = require("../middleware/roleMiddleware");
const ctrl = require("../controllers/currencyController");

const router = express.Router();

router.use(authMiddleware);

router.get("/currencies", ctrl.listCurrencies);
router.get("/exchange-rates", ctrl.listExchangeRates);
router.post(
  "/exchange-rates",
  requireRole("SYSTEM_ADMIN", "HQ_STORE_KEEPER"),
  ctrl.createExchangeRate,
);

module.exports = router;
