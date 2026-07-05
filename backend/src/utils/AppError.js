// Error ที่ throw จาก controller/service โดยตั้งใจ (validation ผิด, ไม่มีสิทธิ์, หาไม่เจอ ฯลฯ)
// errorMiddleware จะรู้ status code ที่ถูกต้องจาก error ประเภทนี้โดยตรง ต่างจาก error ที่ไม่คาดคิดซึ่งจะกลายเป็น 500
class AppError extends Error {
  constructor(statusCode, message, details) {
    super(message);
    this.statusCode = statusCode;
    this.details = details;
  }
}

module.exports = AppError;
