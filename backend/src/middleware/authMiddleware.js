const jwt = require("jsonwebtoken");
const AppError = require("../utils/AppError");

// ตรวจ JWT จาก header Authorization: Bearer <token>
// payload ของ token มี roles ฝังมาด้วยตั้งแต่ตอน login (ดู authController.login)
// เพื่อไม่ต้อง query DB ซ้ำทุก request — roles จะรีเฟรชเมื่อ login ใหม่ภายในอายุ JWT_EXPIRES_IN
function authMiddleware(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith("Bearer ")) {
    return next(new AppError(401, "ไม่ได้ระบุ token"));
  }

  const token = header.slice("Bearer ".length);

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.user = payload;
    next();
  } catch (err) {
    next(new AppError(401, "token ไม่ถูกต้องหรือหมดอายุ"));
  }
}

module.exports = authMiddleware;
