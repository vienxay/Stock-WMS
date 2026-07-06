const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');

const routes = require('./routes');
const { notFound, errorHandler } = require('./middleware/errorMiddleware');

const app = express();

// เชื่อ proxy ชั้นเดียว (Vite dev proxy / ngrok tunnel) เพื่อให้ express-rate-limit
// อ่าน X-Forwarded-For แล้วระบุ IP ผู้ใช้จริงได้ถูกต้อง แทนที่จะเห็นเป็น IP เดียวกันหมด
app.set('trust proxy', 1);

app.use(helmet());
app.use(cors());
app.use(express.json());

// เสิร์ฟไฟล์ภาพสินค้าที่อัปโหลดไว้แบบ static ให้ frontend เรียกดูได้ตรงๆ ผ่าน /uploads/...
app.use(
  '/uploads',
  express.static(path.resolve(process.cwd(), process.env.UPLOAD_DIR || 'uploads'))
);

// จำกัดจำนวน request ต่อ IP กันการยิงถล่ม API
const apiLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 300 });
app.use('/api', apiLimiter);

app.use('/api', routes);

app.use(notFound);
app.use(errorHandler);

module.exports = app;
