const express = require("express");
const authMiddleware = require("../middleware/authMiddleware");
const { requireRole } = require("../middleware/roleMiddleware");
const ctrl = require("../controllers/catalogController");

const router = express.Router();

router.use(authMiddleware);

router.get("/groups", ctrl.listGroups);
router.post("/groups", requireRole(), ctrl.createGroup);
router.put("/groups/:id", requireRole(), ctrl.updateGroup);

router.get("/categories", ctrl.listCategories);
router.post("/categories", requireRole(), ctrl.createCategory);
router.put("/categories/:id", requireRole(), ctrl.updateCategory);

router.get("/usage-areas", ctrl.listUsageAreas);
router.post("/usage-areas", requireRole(), ctrl.createUsageArea);
router.put(
  "/usage-areas/:id",
  requireRole(),
  ctrl.updateUsageArea,
);

module.exports = router;
