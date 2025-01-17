// app.js
require("dotenv").config();  
require("./awarding");  // optional, if you still want hourly awarding

const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const { Pool } = require("pg");
const winston = require("winston");
const bot = require("./bot");  // if you have your Telegram bot logic
const path = require("path");

const TELEGRAM_TOKEN = process.env.TELEGRAM_TOKEN;
const DATABASE_URL = process.env.DATABASE_URL;
const NODE_ENV = process.env.NODE_ENV || "development";

// Logger Setup
const logger = winston.createLogger({
  level: "info",
  format: winston.format.json(),
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: "app.log" }),
  ],
});

// PostgreSQL Setup (optional, if you still want DB for scoreboard)
const pool = new Pool({
  connectionString: DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

pool.connect()
  .then(() => logger.info("✅ Connected to PostgreSQL database successfully!"))
  .catch((err) => logger.error("❌ Database connection error:", err));

// Express setup
const app = express();
app.use(cors());
app.use(bodyParser.json());

// Basic test route
app.get("/", (req, res) => {
  res.send("HourSnake Backend is running...");
});

// Telegram Bot updates
app.post(`/bot${TELEGRAM_TOKEN}`, (req, res) => {
  bot.processUpdate(req.body);
  res.sendStatus(200);
});

// OLD DB star logic – remove or comment out:
// --------------------------------------------------
// app.post("/game/stars", async (req, res) => { /* ... */ });
// app.post("/game/deduct-star", async (req, res) => { /* ... */ });
// --------------------------------------------------

// Official Telegram Stars: create invoice link
app.post("/create-invoice", async (req, res) => {
  try {
    const title = "Snake Game Entry";
    const description = "Pay 1 Star to play!";
    const payload = "{}";
    const providerToken = ""; // empty
    const currency = "XTR";
    const prices = [{ amount: 1, label: "Game Entry" }];

    const token = process.env.TELEGRAM_TOKEN;
    const url = `https://api.telegram.org/bot${token}/createInvoiceLink`;

    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title,
        description,
        payload,
        provider_token: providerToken,
        currency,
        prices
      })
    });
    const data = await response.json();
    if (!data.ok) {
      console.error("createInvoiceLink error:", data);
      return res.status(500).json({ error: data.description });
    }

    const invoiceLink = data.result;
    console.log("Invoice link created:", invoiceLink);
    res.json({ invoiceLink });
  } catch (error) {
    console.error("Error creating invoice:", error);
    res.status(500).json({ error: "Failed to create invoice" });
  }
});

// (Optional) scoreboard routes or /leaderboard
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

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  logger.info(`🚀 Server running on port ${PORT}`);
});
