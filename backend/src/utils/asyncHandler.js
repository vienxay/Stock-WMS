// ครอบ controller function ที่เป็น async ไว้ ถ้า throw หรือ reject จะส่งต่อไปที่ errorMiddleware ผ่าน next()
function asyncHandler(fn) {
  return function (req, res, next) {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

module.exports = asyncHandler;
