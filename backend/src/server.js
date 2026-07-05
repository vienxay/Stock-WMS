const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, "../.env"), quiet: true });

const app = require("./app");
const pool = require("./config/db");
const logger = require("./utils/logger");
const closePeriodJob = require("./jobs/closePeriodJob");

const PORT = process.env.PORT || 5000;

async function start() {
  try {
    const conn = await pool.getConnection();
    conn.release();
    logger.info("ການເຊື່ອມຕໍ່ຖານຂໍ້ມູນສຳເລັດ");
  } catch (err) {
    logger.error("ເຊື່ອມຕໍ່ຖານຂໍ້ມູນບໍ່ສຳເລັດ", { error: err.message });
    process.exit(1);
  }

  closePeriodJob.start();

  app.listen(PORT, () => {
    logger.info(`Server connected to port ${PORT}`);
  });
}

start();
