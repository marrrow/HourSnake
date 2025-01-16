require("dotenv").config();
const { Pool } = require("pg");
const winston = require("winston");

// Logger Setup
const logger = winston.createLogger({
  level: "info",
  format: winston.format.json(),
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: "migration.log" }),
  ],
});

// PostgreSQL Connection Setup
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === "production" ? { rejectUnauthorized: false } : false,
});

// Migration Function
async function migrate() {
  try {
    logger.info("🚀 Starting database migration...");

    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        telegram_id BIGINT UNIQUE NOT NULL,
        username TEXT,
        stars INT DEFAULT 0,
        total_score INT DEFAULT 0
      );
    `);

    logger.info("✅ Migration completed successfully!");
    process.exit(0);
  } catch (error) {
    logger.error("❌ Migration failed:", error);
    process.exit(1);
  }
}

// Run Migration
migrate();
