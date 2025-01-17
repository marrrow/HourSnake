require("dotenv").config();
const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const { Pool } = require("pg");
const TelegramBot = require("node-telegram-bot-api");

// 1) Initialize your bot with token
const TELEGRAM_TOKEN = process.env.TELEGRAM_TOKEN;
const bot = new TelegramBot(TELEGRAM_TOKEN, { webHook: true });

// 2) Set up webhook
const webhookUrl = `${process.env.WEBHOOK_URL}/bot${TELEGRAM_TOKEN}`;
bot.setWebHook(webhookUrl)
  .then(() => console.log(`Webhook set: ${webhookUrl}`))
  .catch(err => console.error("Error setting webhook:", err));

// 3) Set up DB pool
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});
pool.connect().then(() => {
  console.log("✅ Connected to PostgreSQL database successfully!");
}).catch(err => {
  console.error("❌ Database connection error:", err);
});

// 4) Express server setup
const app = express();
app.use(cors());
app.use(bodyParser.json());

// 5) Route for Telegram bot updates
app.post(`/bot${TELEGRAM_TOKEN}`, (req, res) => {
  bot.processUpdate(req.body);
  res.sendStatus(200);
});

/* ---------------------------------------------------------------------------
   LOCAL "CREDITS" APPROACH
   We'll store user credits in DB -> 'users' table with columns:
     id SERIAL PRIMARY KEY,
     telegram_id BIGINT UNIQUE,
     credits INT DEFAULT 0
   Then we can get credits, deduct credits, top up credits, etc.
--------------------------------------------------------------------------- */

// 5A) Create or ensure 'users' table exists (optional check). You might do this
// with a migration script or your own method. For example:
//   CREATE TABLE IF NOT EXISTS users (
//     id SERIAL PRIMARY KEY,
//     telegram_id BIGINT UNIQUE,
//     credits INT DEFAULT 0
//   );
// We'll assume you've handled that separately in a migration.

// 5B) Fetch the user's current credit balance
app.post("/game/get-credits", async (req, res) => {
  try {
    const { telegram_id } = req.body;
    // Fetch from DB
    const result = await pool.query(
      "SELECT credits FROM users WHERE telegram_id = $1",
      [telegram_id]
    );
    // If user row not found, credits = 0
    const credits = result.rows[0]?.credits || 0;
    // Return it
    res.json({ success: true, credits });
  } catch (err) {
    console.error("Error fetching credits:", err);
    res.status(500).json({ success: false, message: "Error fetching credits." });
  }
});

// 5C) Deduct 1 credit for a game entry
app.post("/game/deduct-credit", async (req, res) => {
  try {
    const { telegram_id } = req.body;
    // Get the user's current credits
    let result = await pool.query(
      "SELECT credits FROM users WHERE telegram_id = $1",
      [telegram_id]
    );

    if (result.rowCount === 0) {
      // If user doesn't exist, create with 0 credits
      await pool.query(
        "INSERT INTO users (telegram_id, credits) VALUES ($1, 0)",
        [telegram_id]
      );
      return res.json({
        success: false,
        message: "Not enough credits. Please top up first."
      });
    }

    const currentCredits = result.rows[0].credits;
    if (currentCredits > 0) {
      // Deduct 1 credit
      await pool.query(
        "UPDATE users SET credits = credits - 1 WHERE telegram_id = $1",
        [telegram_id]
      );
      return res.json({
        success: true,
        message: "Game started! 1 credit deducted."
      });
    } else {
      return res.json({
        success: false,
        message: "Not enough credits. Please top up first."
      });
    }
  } catch (err) {
    console.error("Error deducting credit:", err);
    res.status(500).json({ success: false, message: "Error deducting credit." });
  }
});

// 5D) (OPTIONAL) Route for manually topping up credits after you receive payment
// e.g. if user paid you in crypto externally, you can call this from an admin UI
app.post("/admin/manual-topup", async (req, res) => {
  try {
    const { telegram_id, addCredits } = req.body;
    // Ensure user row
    let result = await pool.query(
      "SELECT id FROM users WHERE telegram_id = $1",
      [telegram_id]
    );
    if (result.rowCount === 0) {
      // create them with zero
      await pool.query(
        "INSERT INTO users (telegram_id, credits) VALUES ($1, 0)",
        [telegram_id]
      );
    }
    // Now top up
    await pool.query(
      "UPDATE users SET credits = credits + $1 WHERE telegram_id = $2",
      [addCredits, telegram_id]
    );
    return res.json({ success: true, message: "User credited successfully." });
  } catch (err) {
    console.error("Error topping up credits:", err);
    res.status(500).json({ success: false, message: "Error topping up." });
  }
});

/* ---------------------------------------------------------------------------
   SCOREBOARD (OPTIONAL)
   Keep if you want to record user scores or do an hourly leaderboard
--------------------------------------------------------------------------- */
app.post("/game/submit-score", async (req, res) => {
  try {
    const { telegram_id, score } = req.body;
    // You can store it in a "scores" table or in the "users" table
    // This is just a placeholder
    console.log(`User ${telegram_id} finished with score: ${score}`);
    return res.json({ success: true, message: "Score recorded" });
  } catch (err) {
    console.error("Error submitting score:", err);
    res.status(500).json({ success: false, message: "Error saving score" });
  }
});

app.get("/current-leaderboard", async (req, res) => {
  try {
    // Return an object like: { success: true, leaderboard: [ ... ] }
    res.json({ success: true, leaderboard: [] });
  } catch (err) {
    console.error("Error fetching leaderboard:", err);
    res.status(500).json({ success: false, message: "Error fetching leaderboard." });
  }
});

// 6) Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log("🚀 Server running on port", PORT);
});
