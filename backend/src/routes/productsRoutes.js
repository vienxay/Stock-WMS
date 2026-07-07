const express = require("express");
const authMiddleware = require("../middleware/authMiddleware");
const { requireRole } = require("../middleware/roleMiddleware");
const { uploadProductImage, uploadExcelFile } = require("../middleware/uploadMiddleware");
const ctrl = require("../controllers/productsController");

const router = express.Router();

router.use(authMiddleware);

const canManageCatalog = requireRole("BRANCH_ADMIN", "WAREHOUSE_STAFF");
const canDelete = requireRole();

// ต้องมาก่อน "/:id" ไม่งั้น express จะจับ "import-template"/"bulk-import"/"export" เป็น :id
router.get("/import-template", canManageCatalog, ctrl.getImportTemplate);
router.post(
  "/bulk-import",
  canManageCatalog,
  uploadExcelFile.single("file"),
  ctrl.bulkImportProducts,
);
router.delete("/bulk-delete", canDelete, ctrl.bulkDeleteProducts);
router.get("/export", ctrl.exportProducts);
router.get("/lookup", ctrl.lookupProduct);

router.get("/", ctrl.listProducts);
router.get("/:id", ctrl.getProduct);
router.get("/:id/stock", ctrl.getProductStock);
router.get("/:id/barcode", ctrl.getProductBarcode);
router.get("/:id/qrcode", ctrl.getProductQrCode);
router.post("/", canManageCatalog, ctrl.createProduct);
router.put("/:id", canManageCatalog, ctrl.updateProduct);
router.delete("/:id", canDelete, ctrl.deleteProduct);

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
