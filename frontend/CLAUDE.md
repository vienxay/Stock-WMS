# CLAUDE.md — ระบบคลังสินค้าภายในองค์กร (Internal Warehouse Management System)

เอกสารนี้สรุปภาพรวมโปรเจกต์ ใช้เป็น context สำหรับทำความเข้าใจโครงสร้าง, กฎธุรกิจ, และโค้ดที่มีอยู่ก่อนแก้ไข/พัฒนาต่อ

**สถานะปัจจุบัน: backend implement ครบและทดสอบ end-to-end แล้ว (auth → CRUD → transaction flow) frontend ยังไม่มีโค้ดจริง มีแค่เอกสารนี้**

---

## 1. ภาพรวมโปรเจกต์

ระบบคลังสินค้า **ภายในองค์กร** (ไม่ใช่ระบบซื้อขายกับบุคคลภายนอก) สำหรับองค์กรที่มี:

- **สำนักงานใหญ่ (HQ)** 1 แห่ง — จุดเดียวที่รับสินค้าเข้าระบบจากภายนอกได้
- **โรงงาน 2 แห่ง** (สาขา) — ไม่รับสินค้าจากภายนอกโดยตรง ต้องขอเบิกจาก HQ เท่านั้น
- แต่ละสาขา (รวม HQ) มี **คลังย่อยแยกตามประเภทงาน**: คลัง HR, คลังโรงอาหาร, คลังอะไหล่เครื่องจักร
- สินค้าที่จัดการเป็น **ของสิ้นเปลือง** (เบิกแล้วหมดไป) — ไม่ต้องมีระบบยืม-คืนหรือติดตามผู้ถือครองรายชิ้น

## 2. กฎธุรกิจสำคัญ (Business Rules) — ต้องอ่านก่อนแก้โค้ด

1. **รับสินค้าเข้าได้เฉพาะคลังที่ HQ เท่านั้น** (`warehouses.is_central = TRUE`) — บังคับที่ backend layer ใน `stockReceiptsController.createReceipt`
2. **การเบิกมี 2 ระดับที่แยกกันชัดเจน:**
   - **ระดับ 1 — Branch Replenishment** (`branch_requests`): สาขาขอสต็อกจาก HQ → HQ อนุมัติ (`approveRequest`) → โอนสต็อกจริง (`transferRequest` สร้าง `TRANSFER_OUT` ที่ HQ + `TRANSFER_IN` ที่สาขา พร้อมกันใน transaction เดียว)
   - **ระดับ 2 — Employee Requisition** (`requisitions`): พนักงานเบิกใช้งานจริงจากคลังไซต์ตัวเอง → หัวหน้างานอนุมัติ (`approveRequisition`) → จ่ายจริง/ตัดสต็อก (`issueRequisition` สร้าง `ISSUE`)
   - ห้ามสับสนสองอันนี้ — endpoint, controller, และตารางแยกกันคนละชุด (`branchRequestsController` vs `requisitionsController`)
3. **คลังแต่ละประเภทจับคู่กันตาม `warehouse_type_id`** — สาขาขอเบิกคลังอะไหล่ ต้องขอจากคลังอะไหล่ของ HQ เท่านั้น ห้ามข้ามประเภท (validate ใน `branchRequestsController.createRequest`)
4. **Base currency = LAK (กีบ)** — สกุลเงินอื่น (THB, CNY) ต้องแปลงเป็น LAK ตอนบันทึกรับเข้า ผ่าน `exchangeRateService.getRateToBase` และ **ล็อกอัตราแลกเปลี่ยน ณ วันที่รับเข้า** ไว้ใน `stock_receipts.exchange_rate_used` ห้ามคำนวณย้อนหลังด้วยอัตราปัจจุบัน
5. **ทุกการเปลี่ยนแปลงสต็อกต้องผ่าน `services/stockMovementService.js` เท่านั้น** — เป็นจุดเดียวที่ insert `stock_movements` และอัปเดต `stock_balance` (รวมถึงคำนวณต้นทุนเฉลี่ยถ่วงน้ำหนัก แบบ `SELECT ... FOR UPDATE` กันชนกัน) ห้าม controller ไหน update `stock_balance` ตรงๆ
6. **ชื่อสินค้า/หมวดหมู่ต้องมี 2 ภาษา** (ลาว + จีน) ตามฟอร์แมต Excel เดิมที่องค์กรใช้อยู่ (`name_lo`, `name_cn`)
7. **`stock_period_summary` คือรายงานสรุปรายเดือน** generate อัตโนมัติผ่าน `jobs/closePeriodJob.js` — **ตกลงกับผู้ใช้แล้วว่าจะไม่ล็อกทุกเดือน** ปล่อยให้แก้ไขได้ตลอดปี แล้วค่อยล็อก (`closed_at`) ทีเดียวตอนขึ้นปีใหม่ (`closeYear`) ดูรายงานสรุปรายปีได้ที่ `GET /api/reports/period-summary/yearly`
8. **`user_roles.warehouse_id = NULL` แปลว่าสิทธิ์ทั่วทั้งระบบ** (เช่น SYSTEM_ADMIN) — ระวัง: MySQL ไม่ยอมให้ NULL อยู่ใน PRIMARY KEY ตารางนี้จึงใช้ `id AUTO_INCREMENT` + `UNIQUE KEY` แทน (ไม่ใช่ composite PK) และชั้น API ต้องเช็คซ้ำเองก่อน insert เพราะ UNIQUE KEY ไม่กัน NULL ซ้ำ (ดู `organizationController.assignUserRole`)

## 3. Tech Stack

| ส่วน     | เทคโนโลยี                                                                 |
| -------- | -------------------------------------------------------------------------- |
| Frontend | React + Tailwind CSS + SweetAlert2 (ยังไม่ได้เริ่มเขียนโค้ด)               |
| Backend  | Node.js 22 + Express 5 + JWT (jsonwebtoken) + bcrypt + zod + multer + node-cron + winston + helmet + express-rate-limit + exceljs |
| Database | MySQL 8.0+ (utf8mb4 ทุกตาราง — จำเป็นเพราะมีภาษาลาว/จีน)                   |

## 4. โครงสร้างโปรเจกต์จริง

```
Stock_WMS/
├── backend/
│   ├── .env                  # DB_*, JWT_*, UPLOAD_DIR (ห้าม commit)
│   ├── package.json
│   ├── uploads/products/     # ไฟล์ภาพสินค้าที่อัปโหลด (gitignored ยกเว้น .gitkeep)
│   ├── logs/                 # winston error log (gitignored, auto-mkdir)
│   └── src/
│       ├── app.js                    # express app: helmet, cors, rate limit, static /uploads, mount routes
│       ├── server.js                 # entry point: โหลด .env, ต่อ DB, สตาร์ท cron job, listen port
│       ├── config/
│       │   ├── db.js                 # mysql2 connection pool
│       │   └── schemaMySQL.sql       # schema หลัก (MySQL เท่านั้น ใช้จริง)
│       ├── controllers/              # 1 ไฟล์ต่อโมดูล (auth, organization, catalog, currency,
│       │                              # products, stockReceipts, branchRequests, requisitions,
│       │                              # stockTakes, reports)
│       ├── routes/                   # 1 ไฟล์ต่อโมดูล ตรงกับ controllers + index.js รวม mount ทั้งหมด
│       ├── middleware/
│       │   ├── authMiddleware.js     # verify JWT, เซ็ต req.user
│       │   ├── roleMiddleware.js     # requireRole(...codes), requireWarehouseAccess, hasWarehouseAccess
│       │   ├── errorMiddleware.js    # notFound + errorHandler (AppError, ZodError, mysql FK/dup errors)
│       │   └── uploadMiddleware.js   # multer disk storage สำหรับรูปสินค้า
│       ├── services/
│       │   ├── exchangeRateService.js  # getRateToBase(runner, currencyCode, date)
│       │   └── stockMovementService.js # recordMovement(runner, params), getBalance(runner, productId, warehouseId)
│       ├── jobs/
│       │   └── closePeriodJob.js     # node-cron: generateMonthlySummary รายเดือน, closeYear ตอนขึ้นปีใหม่
│       ├── scripts/
│       │   └── seedAdmin.js          # seed roles 6 ตัว + สร้างบัญชี SYSTEM_ADMIN คนแรก
│       └── utils/
│           ├── AppError.js           # error ที่ throw ตั้งใจ พร้อม statusCode
│           ├── asyncHandler.js       # ครอบ async controller ส่ง error เข้า errorMiddleware
│           ├── dbHelpers.js          # partialUpdate() สร้าง UPDATE ... SET จาก object แบบ dynamic
│           └── logger.js             # winston logger (console + logs/error.log)
└── frontend/
    └── CLAUDE.md              # ไฟล์นี้ — ยังไม่มีโค้ด React จริง
```

### กลุ่มตารางในฐานข้อมูล

**องค์กร** — `branches`, `warehouse_types`, `warehouses`, `locations`, `departments`, `employees`, `roles`, `users`, `user_roles`

**สกุลเงิน** — `currencies` (LAK/THB/CNY, seed ใน schema), `exchange_rates` (ตามวันที่, unique ต่อ currency+date)

**สินค้า** — `groups_` (ตั้งชื่อมี `_` เพราะ `GROUPS` เป็นคำสงวนใน MySQL 8) → `categories`, `usage_areas`, `products`, `product_images` (มี trigger บังคับภาพหลักได้แค่ 1 ภาพ/สินค้า)

**ธุรกรรม** — `stock_balance`, `stock_receipts`+`stock_receipt_items`, `branch_requests`+`branch_request_items`, `requisitions`+`requisition_items`, `stock_movements` (audit trail หลัก), `stock_period_summary`, `stock_takes`+`stock_take_items`

### Layer การทำงานของ request

```
Route → authMiddleware (verify JWT) → requireRole/requireWarehouseAccess → Controller (zod validate) → Service (ถ้ามีผลต่อ stock) → MySQL (ผ่าน pool หรือ conn ใน transaction)
```

ทุก controller ที่ทำให้สต็อกเปลี่ยน (`stockReceipts`, `branchRequests`, `requisitions`, `stockTakes`) เปิด transaction เอง (`pool.getConnection()` → `beginTransaction()` → เรียก `stockMovementService.recordMovement(conn, ...)` → `commit()`/`rollback()` ใน `finally { conn.release() }`)

## 5. Roles ที่ seed ไว้ (จาก `scripts/seedAdmin.js`)

`SYSTEM_ADMIN`, `HQ_STORE_KEEPER`, `BRANCH_STORE_KEEPER`, `DEPT_APPROVER`, `HQ_APPROVER`, `EMPLOYEE`

JWT payload ฝัง roles มาด้วยตอน login (`[{code, warehouseId}]`) ไม่ query DB ซ้ำทุก request — ถ้าแก้สิทธิ์ผู้ใช้ จะมีผลตอน login ครั้งถัดไปเท่านั้น

## 6. Setup

```bash
cd backend
npm install
# ตั้งค่า backend/.env เอง: DB_HOST, DB_PORT, DB_USER, DB_PASSWORD, DB_NAME, JWT_SECRET, JWT_EXPIRES_IN, UPLOAD_DIR

# รัน schemaMySQL.sql เข้า MySQL instance ที่ .env ชี้ไปก่อน แล้วค่อย:
npm run seed:admin   # seed roles + สร้างบัญชี admin คนแรก (username/password เริ่มต้นดูจาก console output ตอนรัน)

npm run dev          # nodemon, port ตาม .env (PORT)
```

## 7. งานที่ยังค้างอยู่ (TODO)

- [ ] สร้างโค้ด Frontend React จริง (ตอนนี้มีแค่แผนในไฟล์นี้)
- [ ] เขียน unit test สำหรับ `stockMovementService.js` (จุดเสี่ยงสูงสุดของระบบ — ต้นทุนเฉลี่ยถ่วงน้ำหนัก + concurrency lock)
- [ ] ตัวอย่าง Postman collection / `.http` file สำหรับทดสอบ API
- [ ] พิจารณาย้ายไฟล์อัปโหลดไป object storage จริง (S3/MinIO) แทน local disk เมื่อ deploy production
