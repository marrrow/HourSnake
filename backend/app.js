require("dotenv").config();
const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const { Pool } = require("pg");
const winston = require("winston");

// Environment Variables
const TELEGRAM_TOKEN = process.env.TELEGRAM_TOKEN;
const DATABASE_URL = process.env.DATABASE_URL;
const NODE_ENV = process.env.NODE_ENV || "development";

// PostgreSQL Setup
const pool = new Pool({
  connectionString: DATABASE_URL,
  ssl: NODE_ENV === "production" ? { rejectUnauthorized: false } : false,
});

// Express Setup
const app = express();
app.use(cors());
app.use(bodyParser.json());

// Logger Setup
const logger = winston.createLogger({
  level: "info",
  format: winston.format.json(),
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: "app.log" }),
  ],
});

// Test DB Connection
pool.connect()
  .then(() => logger.info("✅ Connected to PostgreSQL database successfully!"))
  .catch((err) => logger.error("❌ Database connection error:", err));

// Test Route
app.get("/", (req, res) => {
  res.send("HourSnake Backend is running...");
});

// API Endpoints

// Fetch Stars
app.post("/game/stars", async (req, res) => {
  try {
    const { telegram_id } = req.body;
    const result = await pool.query("SELECT stars FROM users WHERE telegram_id = $1", [telegram_id]);
    const stars = result.rows[0]?.stars || 0;
    res.json({ success: true, stars });
  } catch (error) {
    logger.error("Error fetching stars:", error);
    res.status(500).json({ success: false, message: "Error fetching stars." });
  }
});

// Deduct Star and Start Game
app.post("/game/deduct-star", async (req, res) => {
  try {
    const { telegram_id } = req.body;
    const result = await pool.query("SELECT stars FROM users WHERE telegram_id = $1", [telegram_id]);
    const stars = result.rows[0]?.stars || 0;

    if (stars > 0) {
      await pool.query("UPDATE users SET stars = stars - 1 WHERE telegram_id = $1", [telegram_id]);
      res.json({ success: true, message: "Game started! Enjoy playing." });
    } else {
      res.status(400).json({ success: false, message: "Not enough stars to play." });
    }
  } catch (error) {
    logger.error("Error deducting stars:", error);
    res.status(500).json({ success: false, message: "Error deducting stars." });
  }
});

// Fetch Leaderboard
app.get("/leaderboard", async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT username, total_score FROM users ORDER BY total_score DESC LIMIT 10"
    );
    res.json({ success: true, leaderboard: result.rows });
  } catch (error) {
    logger.error("Error fetching leaderboard:", error);
    res.status(500).json({ success: false, message: "Error fetching leaderboard." });
  }
});

// Start Server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  logger.info(`🚀 Server running on port ${PORT}`);
});
