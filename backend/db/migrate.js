// migrate.js
require("dotenv").config();  // Load variables from .env
const { Pool } = require("pg");

// We'll read DATABASE_URL from .env
const isProduction = process.env.NODE_ENV === "production";
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: isProduction ? { rejectUnauthorized: false } : false,
});


async function migrate() {
  try {
    console.log("🚀 Starting migration...");

    // Create the 'users' table if it doesn't exist
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        telegram_id BIGINT UNIQUE,
        credits INT DEFAULT 0
      );
    `);

    console.log("✅ Migration completed successfully!");
  } catch (err) {
    console.error("❌ Migration failed:", err);
  } finally {
    // Close the DB connection
    pool.end();
  }
}

// Run the migration
migrate();
