const express = require("express");
const authMiddleware = require("../middleware/authMiddleware");
const { requireRole } = require("../middleware/roleMiddleware");
const ctrl = require("../controllers/stockUsageController");

const router = express.Router();

router.use(authMiddleware);

router.get("/", ctrl.listUsages);
router.post("/", requireRole("BRANCH_ADMIN", "WAREHOUSE_STAFF"), ctrl.createUsage);

module.exports = router;
