const express = require("express");
const authMiddleware = require("../middleware/authMiddleware");
const { requireRole } = require("../middleware/roleMiddleware");
const { uploadBrandingImage } = require("../middleware/uploadMiddleware");
const ctrl = require("../controllers/settingsController");

const router = express.Router();

const requireAdmin = [authMiddleware, requireRole("SYSTEM_ADMIN")];

// เปิดสาธารณะ ไม่ต้อง login เพราะหน้า login ต้องใช้ค่านี้แสดงชื่อ/โลโก้/ภาพพื้นหลังก่อนเข้าสู่ระบบ
router.get("/", ctrl.getSettings);

router.put("/", ...requireAdmin, ctrl.updateSettings);
router.post(
  "/logo",
  ...requireAdmin,
  uploadBrandingImage.single("image"),
  ctrl.uploadLogo,
);
router.post(
  "/login-background",
  ...requireAdmin,
  uploadBrandingImage.single("image"),
  ctrl.uploadLoginBackground,
);

module.exports = router;
