const express = require("express");

const authRoutes = require("./authRoutes");
const organizationRoutes = require("./organizationRoutes");
const catalogRoutes = require("./catalogRoutes");
const currencyRoutes = require("./currencyRoutes");
const productsRoutes = require("./productsRoutes");
const stockReceiptsRoutes = require("./stockReceiptsRoutes");
const branchRequestsRoutes = require("./branchRequestsRoutes");
const requisitionsRoutes = require("./requisitionsRoutes");
const stockTakesRoutes = require("./stockTakesRoutes");
const reportsRoutes = require("./reportsRoutes");

const router = express.Router();

router.use("/auth", authRoutes);
router.use("/organization", organizationRoutes);
router.use("/catalog", catalogRoutes);
router.use("/", currencyRoutes); // /currencies, /exchange-rates
router.use("/products", productsRoutes);
router.use("/stock-receipts", stockReceiptsRoutes);
router.use("/branch-requests", branchRequestsRoutes);
router.use("/requisitions", requisitionsRoutes);
router.use("/stock-takes", stockTakesRoutes);
router.use("/reports", reportsRoutes);

module.exports = router;
