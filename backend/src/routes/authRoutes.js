const express = require("express");
const rateLimit = require("express-rate-limit");
const authMiddleware = require("../middleware/authMiddleware");
const { login, me } = require("../controllers/authController");

const router = express.Router();

// จำกัดการลองรหัสผ่านให้เข้มกว่า API ทั่วไป กัน brute force
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  message: { error: "พยายามเข้าสู่ระบบบ่อยเกินไป กรุณาลองใหม่ภายหลัง" },
});

router.post("/login", loginLimiter, login);
router.get("/me", authMiddleware, me);

module.exports = router;
