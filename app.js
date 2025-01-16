require("dotenv").config();
const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const { Pool } = require("pg");
const TelegramBot = require("node-telegram-bot-api");
const winston = require("winston");

// Load environment variables
const TELEGRAM_TOKEN = process.env.TELEGRAM_TOKEN;
const DATABASE_URL = process.env.DATABASE_URL;
const FRONTEND_URL = process.env.FRONTEND_URL || "https://marrrow.github.io/HourSnake/";
const NODE_ENV = process.env.NODE_ENV || "development";

// PostgreSQL Connection Setup
const pool = new Pool({
  connectionString: DATABASE_URL,
  ssl: NODE_ENV === "production" ? { rejectUnauthorized: false } : false,
});

// Express Setup
const app = express();
app.use(cors());
app.use(bodyParser.json());

// Telegram Bot Setup
const bot = new TelegramBot(TELEGRAM_TOKEN, { polling: true });

// Logger Setup
const logger = winston.createLogger({
  level: "info",
  format: winston.format.json(),
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: "app.log" }),
  ],
});

// Database Connection Test
pool.connect()
  .then(() => logger.info("✅ Connected to PostgreSQL database successfully!"))
  .catch((err) => logger.error("❌ Database connection error:", err));

// Test Route
app.get("/", (req, res) => {
  res.send("HourSnake Bot is running...");
});

// Telegram Command Handler
bot.onText(/\/start/, (msg) => {
  const chatId = msg.chat.id;
  bot.sendMessage(chatId, "Welcome to HourSnake! 🎮 Use /play to start.");
});

// Play Game Command (Example)
bot.onText(/\/play/, async (msg) => {
  const chatId = msg.chat.id;

  try {
    const result = await pool.query("SELECT stars FROM users WHERE telegram_id = $1", [chatId]);
    const stars = result.rows[0]?.stars || 0;

    if (stars > 0) {
      await pool.query("UPDATE users SET stars = stars - 1 WHERE telegram_id = $1", [chatId]);
      bot.sendMessage(chatId, "🎉 Game started! Good luck! 🐍");
    } else {
      bot.sendMessage(chatId, "⚠️ You don’t have enough stars! Wait for the next reward.");
    }
  } catch (error) {
    logger.error("Database error:", error);
    bot.sendMessage(chatId, "❌ Error starting game. Try again later.");
  }
});

// Leaderboard Route
app.get("/leaderboard", async (req, res) => {
  try {
    const result = await pool.query("SELECT username, total_score FROM users ORDER BY total_score DESC LIMIT 10");
    res.json({ success: true, leaderboard: result.rows });
  } catch (error) {
    logger.error("Error fetching leaderboard:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
});

// Start Server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  logger.info(`🚀 Server running on port ${PORT}`);
});
