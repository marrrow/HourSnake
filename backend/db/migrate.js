// migrate.js
require("dotenv").config();
const { Pool } = require("pg");

// 1) Create a new Pool with your Render DB URL
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }, // Required for Render
});

async function migrate() {
  try {
    console.log("🚀 Starting migration...");

    // 2) Create your `users` table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        telegram_id BIGINT UNIQUE,
        username TEXT,
        stars INT DEFAULT 0
      );
    `);

    // 3) (OPTIONAL) Create `scores` table if you want to store game scores
    await pool.query(`
      CREATE TABLE IF NOT EXISTS scores (
        id SERIAL PRIMARY KEY,
        user_id INT REFERENCES users(id),
        score INT NOT NULL,
        hour_start BIGINT NOT NULL
      );
    `);

    // ... Add more queries if you want other tables

    console.log("✅ Migration completed successfully!");
  } catch (err) {
    console.error("❌ Migration failed:", err);
  } finally {
    // 4) close the pool
    await pool.end();
  }
}

// Run it
migrate();
