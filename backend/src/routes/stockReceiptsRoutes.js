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
  requireRole("SYSTEM_ADMIN", "HQ_STORE_KEEPER"),
  ctrl.createReceipt,
);

module.exports = router;
