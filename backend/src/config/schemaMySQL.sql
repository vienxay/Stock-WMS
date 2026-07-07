-- =====================================================================
-- ระบบคลังสินค้าภายในองค์กร (Internal Warehouse Management System)
-- รองรับ: หลายสาขา/หลายคลังย่อยตามประเภทงาน, หลายสกุลเงิน, workflow เบิก 2 ระดับ
-- Base currency: LAK (กีบ)
-- Database: MySQL 8.0+
-- Stack: React + Tailwind + SweetAlert / Node + Express + JWT / MySQL
--
-- หมายเหตุสำคัญ: ทุกตารางใช้ utf8mb4 เพราะข้อมูลมีทั้งภาษาลาวและจีน
-- ถ้าใช้ utf8 ธรรมดา ตัวอักษรจีนบางตัวจะบันทึกไม่ได้ (ต้องใช้ 4 byte)
-- =====================================================================

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- ---------------------------------------------------------------------
-- 1. โครงสร้างองค์กร: สาขา และ คลัง
-- ---------------------------------------------------------------------

CREATE TABLE branches (
    id              INT AUTO_INCREMENT PRIMARY KEY,
    name            VARCHAR(100) NOT NULL,          -- 'สำนักงานใหญ่', 'โรงงาน 1', 'โรงงาน 2'
    branch_type     ENUM('HEAD_OFFICE','FACTORY') NOT NULL,
    address         TEXT,
    is_active       BOOLEAN DEFAULT TRUE,
    created_at      DATETIME DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE warehouse_types (
    id              INT AUTO_INCREMENT PRIMARY KEY,
    code            VARCHAR(30) UNIQUE NOT NULL,     -- 'HR', 'FOOD', 'SPARE_PARTS', 'GENERAL'
    name            VARCHAR(100) NOT NULL            -- 'คลัง HR', 'คลังโรงอาหาร', 'คลังอะไหล่เครื่องจักร'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE warehouses (
    id                  INT AUTO_INCREMENT PRIMARY KEY,
    branch_id           INT NOT NULL,
    warehouse_type_id   INT NOT NULL,
    name                VARCHAR(150) NOT NULL,       -- 'คลัง HR - โรงงาน 1'
    is_central          BOOLEAN DEFAULT FALSE,        -- TRUE เฉพาะคลังที่ HQ ที่รับสต็อกเข้าได้
    is_active           BOOLEAN DEFAULT TRUE,
    created_at          DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uq_branch_warehouse_type (branch_id, warehouse_type_id),  -- แต่ละสาขามีคลังแต่ละประเภทได้แค่ 1 แห่ง
    FOREIGN KEY (branch_id) REFERENCES branches(id),
    FOREIGN KEY (warehouse_type_id) REFERENCES warehouse_types(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE locations (
    id              INT AUTO_INCREMENT PRIMARY KEY,
    warehouse_id    INT NOT NULL,
    zone            VARCHAR(50),
    shelf           VARCHAR(50),
    bin             VARCHAR(50),
    UNIQUE KEY uq_location (warehouse_id, zone, shelf, bin),
    FOREIGN KEY (warehouse_id) REFERENCES warehouses(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ---------------------------------------------------------------------
-- 2. บุคลากรและสิทธิ์การใช้งาน
-- ---------------------------------------------------------------------

CREATE TABLE departments (
    id              INT AUTO_INCREMENT PRIMARY KEY,
    branch_id       INT NOT NULL,
    name            VARCHAR(100) NOT NULL,
    FOREIGN KEY (branch_id) REFERENCES branches(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE employees (
    id              INT AUTO_INCREMENT PRIMARY KEY,
    employee_code   VARCHAR(30) UNIQUE NOT NULL,
    full_name       VARCHAR(150) NOT NULL,
    department_id   INT,
    branch_id       INT NOT NULL,
    is_active       BOOLEAN DEFAULT TRUE,
    FOREIGN KEY (department_id) REFERENCES departments(id),
    FOREIGN KEY (branch_id) REFERENCES branches(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE roles (
    id              INT AUTO_INCREMENT PRIMARY KEY,
    code            VARCHAR(30) UNIQUE NOT NULL,     -- 'SUPER_ADMIN','BRANCH_ADMIN','WAREHOUSE_STAFF'
    name            VARCHAR(100) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE users (
    id              INT AUTO_INCREMENT PRIMARY KEY,
    employee_id     INT NOT NULL,
    username        VARCHAR(50) UNIQUE NOT NULL,
    password_hash   VARCHAR(255) NOT NULL,          -- เก็บ hash จาก bcrypt เท่านั้น ห้ามเก็บรหัสผ่านตรงๆ
    is_active       BOOLEAN DEFAULT TRUE,
    created_at      DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (employee_id) REFERENCES employees(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE user_roles (
    id              INT AUTO_INCREMENT PRIMARY KEY,
    user_id         INT NOT NULL,
    role_id         INT NOT NULL,
    branch_id       INT NULL,                        -- ใช้กับ BRANCH_ADMIN: สิทธิ์ทุกคลังในสาขานี้
    warehouse_id    INT NULL,                        -- ใช้กับ WAREHOUSE_STAFF: สิทธิ์เฉพาะคลังนี้
                                                       -- ทั้งสอง NULL (พร้อมกับ role=SUPER_ADMIN) = สิทธิ์ทั่วทั้งระบบ
    UNIQUE KEY uq_user_role_warehouse (user_id, role_id, branch_id, warehouse_id),
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (role_id) REFERENCES roles(id),
    FOREIGN KEY (branch_id) REFERENCES branches(id),
    FOREIGN KEY (warehouse_id) REFERENCES warehouses(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
-- หมายเหตุ: MySQL ไม่ยอมให้ NULL อยู่ใน PRIMARY KEY เลย (แม้ column จะประกาศเป็น NULL ได้)
-- ดังนั้นใช้ id AUTO_INCREMENT แยก + UNIQUE KEY แทน ตามที่ตั้งข้อสังเกตไว้เดิม
-- หมายเหตุ: UNIQUE KEY ที่มี NULL ยังแทรกซ้ำได้ (MySQL ไม่เทียบ NULL กับ NULL ว่าซ้ำ)
-- ชั้น API จึงต้องเช็คซ้ำเองก่อน insert กรณี warehouse_id เป็น NULL (ดู organizationController.assignUserRole)

-- ---------------------------------------------------------------------
-- 3. สกุลเงินและอัตราแลกเปลี่ยน (Base currency = LAK)
-- ---------------------------------------------------------------------

CREATE TABLE currencies (
    code            VARCHAR(3) PRIMARY KEY,           -- 'LAK', 'THB', 'CNY'
    name            VARCHAR(50) NOT NULL,
    symbol          VARCHAR(10)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

INSERT INTO currencies (code, name, symbol) VALUES
    ('LAK', 'ກີບລາວ', '₭'),
    ('THB', 'ບາດໄທ', '฿'),
    ('CNY', 'ຢວນຈີນ', '¥');

CREATE TABLE exchange_rates (
    id              INT AUTO_INCREMENT PRIMARY KEY,
    currency_code   VARCHAR(3) NOT NULL,
    rate_to_base    DECIMAL(18,6) NOT NULL,           -- 1 หน่วยของ currency_code = กี่ LAK
    effective_date  DATE NOT NULL,
    created_at      DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uq_rate_date (currency_code, effective_date),
    FOREIGN KEY (currency_code) REFERENCES currencies(code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
-- หมายเหตุ: ไม่ต้องมีแถวของ LAK เพราะ LAK คือ base เอง (rate = 1 เสมอ)

-- ---------------------------------------------------------------------
-- 4. สินค้า/พัสดุ
-- ---------------------------------------------------------------------

-- กลุ่มใหญ่ (Group) เช่น 'อุปกรณ์ก่อสร้าง' -> มีหมวดย่อย (Category) อยู่ข้างใน
CREATE TABLE groups_ (
    id              INT AUTO_INCREMENT PRIMARY KEY,
    name_lo         VARCHAR(150) NOT NULL,            -- ชื่อภาษาลาว
    name_cn         VARCHAR(150),                      -- ชื่อภาษาจีน
    warehouse_type_id INT,
    FOREIGN KEY (warehouse_type_id) REFERENCES warehouse_types(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
-- หมายเหตุ: ตั้งชื่อตารางเป็น groups_ เพราะ GROUPS เป็นคำสงวนใน MySQL 8

CREATE TABLE categories (
    id              INT AUTO_INCREMENT PRIMARY KEY,
    group_id        INT NOT NULL,
    name_lo         VARCHAR(150) NOT NULL,
    name_cn         VARCHAR(150),
    warehouse_type_id INT,                            -- หมวดหมู่นี้ปกติเก็บในคลังประเภทไหน
    FOREIGN KEY (group_id) REFERENCES groups_(id),
    FOREIGN KEY (warehouse_type_id) REFERENCES warehouse_types(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- พื้นที่/จุดใช้งาน เช่น 'ห้องซ่อมบำรุง', 'ไลน์ผลิต A' — ใช้เป็นค่าเริ่มต้นของสินค้าและอ้างอิงตอนเบิกจริงได้
CREATE TABLE usage_areas (
    id              INT AUTO_INCREMENT PRIMARY KEY,
    branch_id       INT NOT NULL,
    name_lo         VARCHAR(150) NOT NULL,
    name_cn         VARCHAR(150),
    FOREIGN KEY (branch_id) REFERENCES branches(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE products (
    id                  INT AUTO_INCREMENT PRIMARY KEY,
    sku                 VARCHAR(50) UNIQUE NOT NULL,   -- Item Code
    barcode             VARCHAR(100),
    name_lo             VARCHAR(200) NOT NULL,         -- Item name Laos
    name_cn             VARCHAR(200),                   -- Item name Chinese
    model_no            VARCHAR(100),                   -- Model
    size                VARCHAR(100),                   -- Size เช่น '40*4*6000'
    category_id         INT,
    unit_lo             VARCHAR(30) NOT NULL,           -- Unit Lao
    default_usage_area_id INT,                          -- พื้นที่ใช้งานตามปกติของสินค้านี้
    default_branch_id   INT,                            -- Factory ที่ขึ้นทะเบียนสินค้านี้ (ถ้ามี)
    responsible_employee_id INT,                        -- Responsible person
    reorder_point       DECIMAL(12,2) DEFAULT 0,
    is_active           BOOLEAN DEFAULT TRUE,
    created_at          DATETIME DEFAULT CURRENT_TIMESTAMP,  -- Record Date
    FOREIGN KEY (category_id) REFERENCES categories(id),
    FOREIGN KEY (default_usage_area_id) REFERENCES usage_areas(id),
    FOREIGN KEY (default_branch_id) REFERENCES branches(id),
    FOREIGN KEY (responsible_employee_id) REFERENCES employees(id),
    INDEX idx_products_name_lo (name_lo)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ภาพสินค้า — เก็บแค่ path/URL ในฐานข้อมูล ตัวไฟล์จริงเก็บบน object storage (S3/MinIO/local disk)
CREATE TABLE product_images (
    id              INT AUTO_INCREMENT PRIMARY KEY,
    product_id      INT NOT NULL,
    image_url       VARCHAR(500) NOT NULL,            -- path หรือ URL ไปยังไฟล์ภาพ
    is_primary      BOOLEAN DEFAULT FALSE,             -- ภาพหลักที่แสดงในรายการ/หน้าค้นหา
    uploaded_by     INT,
    uploaded_at     DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
    FOREIGN KEY (uploaded_by) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- MySQL ไม่รองรับ partial unique index (WHERE is_primary = TRUE) แบบ PostgreSQL
-- และ trigger ก็ทำ UPDATE ตารางเดียวกับที่ trigger ผูกอยู่ไม่ได้ (ER_CANT_UPDATE_USED_TABLE_IN_SF_OR_TRG)
-- จึงบังคับ "มีภาพหลักได้แค่ 1 ภาพต่อสินค้า" ที่ชั้น application (ดู productsController.js) แทน

-- ยอดคงเหลือปัจจุบัน แยกตามคลัง (คำนวณ/sync จาก stock_movements)
CREATE TABLE stock_balance (
    product_id      INT NOT NULL,
    warehouse_id    INT NOT NULL,
    quantity        DECIMAL(14,2) NOT NULL DEFAULT 0,
    avg_unit_value_lak DECIMAL(18,4) DEFAULT 0,       -- ต้นทุนเฉลี่ยต่อหน่วย (กีบ) ใช้ตีมูลค่าสต็อก
    updated_at      DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (product_id, warehouse_id),
    FOREIGN KEY (product_id) REFERENCES products(id),
    FOREIGN KEY (warehouse_id) REFERENCES warehouses(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ---------------------------------------------------------------------
-- 5. รับสินค้าเข้า — เฉพาะคลัง HQ ที่ is_central = TRUE เท่านั้น
-- ---------------------------------------------------------------------

CREATE TABLE stock_receipts (
    id                  INT AUTO_INCREMENT PRIMARY KEY,
    warehouse_id        INT NOT NULL,                 -- ต้อง validate ที่ Express layer ว่า is_central = TRUE
    source_note         VARCHAR(255),                 -- 'จัดซื้อรอบ ก.ค. 69', 'บริจาค'
    currency_code       VARCHAR(3) NOT NULL,
    exchange_rate_used  DECIMAL(18,6) NOT NULL DEFAULT 1,  -- ล็อกอัตรา ณ วันที่รับเข้า
    received_date       DATE NOT NULL,
    status              ENUM('PENDING','APPROVED','REJECTED') NOT NULL DEFAULT 'PENDING',
    created_by          INT NOT NULL,
    created_at          DATETIME DEFAULT CURRENT_TIMESTAMP,
    approved_by         INT,
    approved_at         DATETIME,
    FOREIGN KEY (warehouse_id) REFERENCES warehouses(id),
    FOREIGN KEY (currency_code) REFERENCES currencies(code),
    FOREIGN KEY (created_by) REFERENCES users(id),
    FOREIGN KEY (approved_by) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE stock_receipt_items (
    id                  INT AUTO_INCREMENT PRIMARY KEY,
    receipt_id          INT NOT NULL,
    product_id          INT NOT NULL,
    quantity            DECIMAL(14,2) NOT NULL,
    unit_price_original DECIMAL(18,4) NOT NULL,       -- ราคาต่อหน่วยในสกุลเงินที่จ่ายจริง
    unit_price_lak      DECIMAL(18,4) NOT NULL,        -- = unit_price_original * exchange_rate_used
    total_value_lak     DECIMAL(18,2) NOT NULL,        -- = quantity * unit_price_lak
    FOREIGN KEY (receipt_id) REFERENCES stock_receipts(id),
    FOREIGN KEY (product_id) REFERENCES products(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ---------------------------------------------------------------------
-- 6. คำขอเบิกสต็อกระหว่างคลัง (สาขา -> HQ)  "ระดับที่ 1"
-- ---------------------------------------------------------------------

CREATE TABLE branch_requests (
    id                  INT AUTO_INCREMENT PRIMARY KEY,
    from_warehouse_id   INT NOT NULL,                 -- ต้องเป็นคลัง HQ (is_central = TRUE)
    to_warehouse_id     INT NOT NULL,                 -- คลังสาขาปลายทาง (ต้อง type เดียวกัน)
    status              ENUM('PENDING','APPROVED','REJECTED','TRANSFERRED') NOT NULL DEFAULT 'PENDING',
    requested_by        INT NOT NULL,
    requested_at        DATETIME DEFAULT CURRENT_TIMESTAMP,
    approved_by         INT,
    approved_at         DATETIME,
    note                TEXT,
    FOREIGN KEY (from_warehouse_id) REFERENCES warehouses(id),
    FOREIGN KEY (to_warehouse_id) REFERENCES warehouses(id),
    FOREIGN KEY (requested_by) REFERENCES users(id),
    FOREIGN KEY (approved_by) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE branch_request_items (
    id                  INT AUTO_INCREMENT PRIMARY KEY,
    request_id          INT NOT NULL,
    product_id          INT NOT NULL,
    quantity_requested  DECIMAL(14,2) NOT NULL,
    quantity_approved   DECIMAL(14,2),
    FOREIGN KEY (request_id) REFERENCES branch_requests(id),
    FOREIGN KEY (product_id) REFERENCES products(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ---------------------------------------------------------------------
-- 7. ใบขอเบิกใช้งานจริงของพนักงาน  "ระดับที่ 2" (ของสิ้นเปลือง เบิกแล้วหมดไป)
-- ---------------------------------------------------------------------

CREATE TABLE requisitions (
    id                  INT AUTO_INCREMENT PRIMARY KEY,
    warehouse_id        INT NOT NULL,                 -- คลังต้นทาง (คลังของไซต์ตัวเอง)
    employee_id         INT NOT NULL,
    department_id       INT,
    purpose             VARCHAR(255),
    status              ENUM('PENDING','APPROVED','REJECTED','ISSUED') NOT NULL DEFAULT 'PENDING',
    requested_at        DATETIME DEFAULT CURRENT_TIMESTAMP,
    approved_by         INT,
    approved_at         DATETIME,
    FOREIGN KEY (warehouse_id) REFERENCES warehouses(id),
    FOREIGN KEY (employee_id) REFERENCES employees(id),
    FOREIGN KEY (department_id) REFERENCES departments(id),
    FOREIGN KEY (approved_by) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE requisition_items (
    id                  INT AUTO_INCREMENT PRIMARY KEY,
    requisition_id      INT NOT NULL,
    product_id          INT NOT NULL,
    quantity_requested  DECIMAL(14,2) NOT NULL,
    quantity_issued     DECIMAL(14,2),
    FOREIGN KEY (requisition_id) REFERENCES requisitions(id),
    FOREIGN KEY (product_id) REFERENCES products(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ---------------------------------------------------------------------
-- 8. ประวัติการเคลื่อนไหวสต็อกทั้งหมด (Audit trail หลัก — ทุกอย่างต้องบันทึกที่นี่)
-- ---------------------------------------------------------------------

CREATE TABLE stock_movements (
    id                  INT AUTO_INCREMENT PRIMARY KEY,
    product_id          INT NOT NULL,
    warehouse_id        INT NOT NULL,
    movement_type       ENUM('RECEIPT','ISSUE','TRANSFER_IN','TRANSFER_OUT','ADJUSTMENT') NOT NULL,
    quantity            DECIMAL(14,2) NOT NULL,        -- ค่าบวก = เข้า, ค่าลบ = ออก
    unit_value_lak      DECIMAL(18,4),
    total_value_lak     DECIMAL(18,2),
    reference_table     VARCHAR(50),                   -- 'stock_receipts','branch_requests','requisitions','stock_takes'
    reference_id        INT,
    note                TEXT,
    created_by          INT NOT NULL,
    created_at          DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (product_id) REFERENCES products(id),
    FOREIGN KEY (warehouse_id) REFERENCES warehouses(id),
    FOREIGN KEY (created_by) REFERENCES users(id),
    INDEX idx_stock_movements_product_wh (product_id, warehouse_id),
    INDEX idx_stock_movements_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ---------------------------------------------------------------------
-- 9. สรุปสต็อกรายงวด (Monthly Stock Ledger) — เทียบเท่ารายงาน Excel ที่ใช้อยู่เดิม
--    เก็บเป็น snapshot ต่องวด เพื่อปิดยอดแต่ละเดือนไม่ให้เปลี่ยนย้อนหลัง และให้ query เร็ว
-- ---------------------------------------------------------------------

CREATE TABLE stock_period_summary (
    id              INT AUTO_INCREMENT PRIMARY KEY,
    product_id      INT NOT NULL,
    warehouse_id    INT NOT NULL,
    period          DATE NOT NULL,                     -- ใช้วันแรกของงวด เช่น 2026-07-01 แทน '20260701'
    opening_qty     DECIMAL(14,2) NOT NULL DEFAULT 0,   -- ยอดยกมาต้นงวด
    received_qty    DECIMAL(14,2) NOT NULL DEFAULT 0,   -- RECEIVED
    issued_qty      DECIMAL(14,2) NOT NULL DEFAULT 0,   -- Issue
    adjust_in_qty   DECIMAL(14,2) NOT NULL DEFAULT 0,   -- ADJIN_QTY
    adjust_out_qty  DECIMAL(14,2) NOT NULL DEFAULT 0,   -- ADJOUT_QTY
    transfer_in_qty DECIMAL(14,2) NOT NULL DEFAULT 0,   -- TRFIN_QTY
    transfer_out_qty DECIMAL(14,2) NOT NULL DEFAULT 0,  -- TRFOUT_QTY
    closing_qty     DECIMAL(14,2) NOT NULL DEFAULT 0,   -- SCOCK_QTY (ยอดคงเหลือปลายงวด)
    closing_value_lak DECIMAL(18,2),                    -- มูลค่าคงเหลือปลายงวด (กีบ) ใช้สรุปปลายปี
    closed_at       DATETIME,                           -- เวลาที่ปิดงวด (NULL = งวดยังไม่ปิด แก้ไขได้)
    closed_by       INT,
    UNIQUE KEY uq_period_summary (product_id, warehouse_id, period),
    FOREIGN KEY (product_id) REFERENCES products(id),
    FOREIGN KEY (warehouse_id) REFERENCES warehouses(id),
    FOREIGN KEY (closed_by) REFERENCES users(id),
    INDEX idx_stock_period_summary_lookup (warehouse_id, period)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
-- หมายเหตุ: closing_qty ของงวดนี้ = opening_qty ของงวดถัดไป
-- ตารางนี้ควร generate อัตโนมัติจาก stock_movements ตอนสิ้นเดือน (ผ่าน node-cron scheduled job ฝั่ง Express)
-- ไม่ควรให้ผู้ใช้แก้ไขตรงๆ หลังปิดงวดแล้ว (closed_at ไม่เป็น NULL) — บังคับที่ชั้น API

-- ---------------------------------------------------------------------
-- 9b. ตรวจนับสต็อก
-- ---------------------------------------------------------------------

CREATE TABLE stock_takes (
    id                  INT AUTO_INCREMENT PRIMARY KEY,
    warehouse_id        INT NOT NULL,
    count_date          DATE NOT NULL,
    status              ENUM('IN_PROGRESS','COMPLETED') NOT NULL DEFAULT 'IN_PROGRESS',
    created_by          INT NOT NULL,
    FOREIGN KEY (warehouse_id) REFERENCES warehouses(id),
    FOREIGN KEY (created_by) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE stock_take_items (
    id                  INT AUTO_INCREMENT PRIMARY KEY,
    stock_take_id       INT NOT NULL,
    product_id          INT NOT NULL,
    system_qty          DECIMAL(14,2) NOT NULL,
    counted_qty         DECIMAL(14,2) NOT NULL,
    variance            DECIMAL(14,2) GENERATED ALWAYS AS (counted_qty - system_qty) STORED,
    FOREIGN KEY (stock_take_id) REFERENCES stock_takes(id),
    FOREIGN KEY (product_id) REFERENCES products(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ---------------------------------------------------------------------
-- ตัวอย่างข้อมูลเริ่มต้น (Seed data) — โครงสร้างสาขา/คลังตามที่ระบุ
-- ---------------------------------------------------------------------

INSERT INTO warehouse_types (code, name) VALUES
    ('HR', 'ຄັງ HR'),
    ('FOOD', 'ຄັງໂຮງອາຫານ'),
    ('SPARE_PARTS', 'ຄັງອະໄຫຼ່ເຄື່ອງຈັກ');

INSERT INTO branches (name, branch_type) VALUES
    ('ສຳນັກງານໃຫຍ່', 'HEAD_OFFICE'),
    ('ໂຮງງານ 1', 'FACTORY'),
    ('ໂຮງງານ 2', 'FACTORY');

-- คลังที่ HQ (is_central = TRUE ทุกประเภท เพราะ HQ เป็นจุดรับเข้าเดียว)
INSERT INTO warehouses (branch_id, warehouse_type_id, name, is_central)
SELECT b.id, wt.id, CONCAT('ຄັງ ', wt.name, ' - ສຳນັກງານໃຫຍ່'), TRUE
FROM branches b, warehouse_types wt
WHERE b.name = 'ສຳນັກງານໃຫຍ່';

-- คลังที่โรงงาน 1 และ 2 (is_central = FALSE)
INSERT INTO warehouses (branch_id, warehouse_type_id, name, is_central)
SELECT b.id, wt.id, CONCAT('ຄັງ ', wt.name, ' - ', b.name), FALSE
FROM branches b, warehouse_types wt
WHERE b.branch_type = 'FACTORY';

SET FOREIGN_KEY_CHECKS = 1;

-- ---------------------------------------------------------------------
-- ดัชนีเพิ่มเติม
-- ---------------------------------------------------------------------

CREATE INDEX idx_requisitions_status ON requisitions(status);
CREATE INDEX idx_branch_requests_status ON branch_requests(status);
CREATE INDEX idx_exchange_rates_lookup ON exchange_rates(currency_code, effective_date);
CREATE INDEX idx_product_images_product ON product_images(product_id);

-- ---------------------------------------------------------------------
-- ตั้งค่าระบบ (ยี่ห้อ) — มีแถวเดียวเสมอ (id = 1) เก็บชื่อ/โลโก้/ภาพพื้นหลังหน้า login
-- ---------------------------------------------------------------------
CREATE TABLE app_settings (
    id                      INT PRIMARY KEY DEFAULT 1,
    company_name            VARCHAR(200) NOT NULL DEFAULT 'Stock WMS',
    company_name_lo         VARCHAR(200),
    logo_url                VARCHAR(500),
    login_background_url    VARCHAR(500),
    updated_by              INT,
    updated_at              DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (updated_by) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

INSERT INTO app_settings (id, company_name) VALUES (1, 'Stock WMS');