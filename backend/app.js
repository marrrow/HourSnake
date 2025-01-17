require("dotenv").config();
const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const { Pool } = require("pg");
const TelegramBot = require("node-telegram-bot-api");

// Initialize your bot with token
const TELEGRAM_TOKEN = process.env.TELEGRAM_TOKEN;
const bot = new TelegramBot(TELEGRAM_TOKEN, { webHook: true });

// If you want to set a webhook with Bot API:
const webhookUrl = `${process.env.WEBHOOK_URL}/bot${TELEGRAM_TOKEN}`;
bot.setWebHook(webhookUrl)
  .then(() => console.log(`Webhook set: ${webhookUrl}`))
  .catch(err => console.error("Error setting webhook:", err));

// Optional: You can keep a DB for storing final scores
// If you do, you can use Pool below. Or remove it if unneeded.
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});
pool.connect().then(() => {
  console.log("✅ Connected to PostgreSQL database successfully!");
}).catch(err => {
  console.error("❌ Database connection error:", err);
});

// Express setup
const app = express();
app.use(cors());
app.use(bodyParser.json());

// Bot updates
app.post(`/bot${TELEGRAM_TOKEN}`, (req, res) => {
  bot.processUpdate(req.body);
  res.sendStatus(200);
});

// ---------------------------------------------------------------------
// Create /create-invoice route for official Telegram Stars
// ---------------------------------------------------------------------
app.post("/create-invoice", async (req, res) => {
  try {
    // 1 star game entry
    const title = "Snake Game Entry";
    const description = "Pay 1 Star to play!";
    const payload = "{}";      // optional JSON payload
    const providerToken = "";  // empty string => official Stars
    const currency = "XTR";    // 'XTR' = Telegram Stars
    const prices = [{ amount: 1, label: "Game Entry" }];

    // If node-telegram-bot-api library doesn't have createInvoiceLink,
    // call the raw /createInvoiceLink endpoint:
    const url = `https://api.telegram.org/bot${TELEGRAM_TOKEN}/createInvoiceLink`;
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

    const invoiceLink = data.result; // The actual invoice URL
    console.log("Invoice link created:", invoiceLink);
    res.json({ invoiceLink });
  } catch (error) {
    console.error("Error creating invoice:", error);
    res.status(500).json({ error: "Failed to create invoice" });
  }
});

// ---------------------------------------------------------------------
// (Optional) Handle scoreboard or final scores if you'd like
// ---------------------------------------------------------------------
app.post("/game/submit-score", async (req, res) => {
  try {
    const { telegram_id, score } = req.body;
    // Save it in DB or do something else.
    // Example pseudo:
    // await pool.query(
    //   'INSERT INTO scores (telegram_id, score, hour_start) ... etc'
    // );
    console.log(`User ${telegram_id} finished with score: ${score}`);
    return res.json({ success: true, message: "Score recorded" });
  } catch (err) {
    console.error("Error submitting score:", err);
    res.status(500).json({ success: false, message: "Error saving score" });
  }
});

// (Optional) current-leaderboard route if you track hour-based scores
app.get("/current-leaderboard", async (req, res) => {
  try {
    // Return an object like: { success: true, leaderboard: [ ... ] }
    // For demonstration:
    res.json({ success: true, leaderboard: [] });
  } catch (err) {
    console.error("Error fetching leaderboard:", err);
    res.status(500).json({ success: false, message: "Error fetching leaderboard." });
  }
});

// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log("🚀 Server running on port", PORT);
});
