const express = require("express");
const authMiddleware = require("../middleware/authMiddleware");
const { requireRole } = require("../middleware/roleMiddleware");
const { uploadProductImage, uploadExcelFile } = require("../middleware/uploadMiddleware");
const ctrl = require("../controllers/productsController");

const router = express.Router();

router.use(authMiddleware);

const canManageCatalog = requireRole("SYSTEM_ADMIN", "HQ_STORE_KEEPER");

// ต้องมาก่อน "/:id" ไม่งั้น express จะจับ "import-template"/"bulk-import" เป็น :id
router.get("/import-template", canManageCatalog, ctrl.getImportTemplate);
router.post(
  "/bulk-import",
  canManageCatalog,
  uploadExcelFile.single("file"),
  ctrl.bulkImportProducts,
);
router.delete("/bulk-delete", canManageCatalog, ctrl.bulkDeleteProducts);

router.get("/", ctrl.listProducts);
router.get("/:id", ctrl.getProduct);
router.get("/:id/stock", ctrl.getProductStock);
router.post("/", canManageCatalog, ctrl.createProduct);
router.put("/:id", canManageCatalog, ctrl.updateProduct);
router.delete("/:id", canManageCatalog, ctrl.deleteProduct);

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
