const express = require("express");
const authMiddleware = require("../middleware/authMiddleware");
const { requireRole } = require("../middleware/roleMiddleware");
const { uploadProductImage } = require("../middleware/uploadMiddleware");
const ctrl = require("../controllers/productsController");

const router = express.Router();

router.use(authMiddleware);

const canManageCatalog = requireRole("SYSTEM_ADMIN", "HQ_STORE_KEEPER");

router.get("/", ctrl.listProducts);
router.get("/:id", ctrl.getProduct);
router.get("/:id/stock", ctrl.getProductStock);
router.post("/", canManageCatalog, ctrl.createProduct);
router.put("/:id", canManageCatalog, ctrl.updateProduct);

router.post(
  "/:id/images",
  canManageCatalog,
  uploadProductImage.single("image"),
  ctrl.addProductImage,
);
router.put(
  "/:id/images/:imageId/primary",
  canManageCatalog,
  ctrl.setPrimaryProductImage,
);
router.delete(
  "/:id/images/:imageId",
  canManageCatalog,
  ctrl.deleteProductImage,
);

module.exports = router;
