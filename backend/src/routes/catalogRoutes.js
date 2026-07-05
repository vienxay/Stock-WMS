const express = require("express");
const authMiddleware = require("../middleware/authMiddleware");
const { requireRole } = require("../middleware/roleMiddleware");
const ctrl = require("../controllers/catalogController");

const router = express.Router();

router.use(authMiddleware);

router.get("/groups", ctrl.listGroups);
router.post("/groups", requireRole("SYSTEM_ADMIN"), ctrl.createGroup);
router.put("/groups/:id", requireRole("SYSTEM_ADMIN"), ctrl.updateGroup);

router.get("/categories", ctrl.listCategories);
router.post("/categories", requireRole("SYSTEM_ADMIN"), ctrl.createCategory);
router.put("/categories/:id", requireRole("SYSTEM_ADMIN"), ctrl.updateCategory);

router.get("/usage-areas", ctrl.listUsageAreas);
router.post("/usage-areas", requireRole("SYSTEM_ADMIN"), ctrl.createUsageArea);
router.put(
  "/usage-areas/:id",
  requireRole("SYSTEM_ADMIN"),
  ctrl.updateUsageArea,
);

module.exports = router;
