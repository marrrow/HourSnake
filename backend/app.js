require("dotenv").config();
const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");

// Import the bot and pool from bot.js
const { bot, pool } = require("./bot");

const TELEGRAM_TOKEN = process.env.TELEGRAM_TOKEN;

// Setup Express
const app = express();
app.use(cors());
app.use(bodyParser.json());

// 1) Set up webhook
const webhookUrl = `${process.env.WEBHOOK_URL}/bot${TELEGRAM_TOKEN}`;
bot.setWebHook(webhookUrl)
  .then(() => console.log(`Webhook set: ${webhookUrl}`))
  .catch(err => console.error("Error setting webhook:", err));

// 2) The route that receives Telegram updates
app.post(`/bot${TELEGRAM_TOKEN}`, (req, res) => {
  bot.processUpdate(req.body);
  res.sendStatus(200);
});

// 3) Local "stars" or "credits" endpoints
app.post("/game/get-credits", async (req, res) => {
  try {
    const { telegram_id } = req.body;
    const result = await pool.query(
      "SELECT stars FROM users WHERE telegram_id = $1",
      [telegram_id]
    );
    const stars = result.rows[0]?.stars || 0;
    res.json({ success: true, stars });
  } catch (err) {
    console.error("Error fetching credits:", err);
    res.status(500).json({ success: false, message: "Error fetching credits." });
  }
});

app.post("/game/deduct-credit", async (req, res) => {
  try {
    const { telegram_id } = req.body;
    let result = await pool.query(
      "SELECT stars FROM users WHERE telegram_id = $1",
      [telegram_id]
    );

    if (result.rowCount === 0) {
      // user doesn't exist? create with 0 stars
      await pool.query(
        "INSERT INTO users (telegram_id, stars) VALUES ($1, 0)",
        [telegram_id]
      );
      return res.json({
        success: false,
        message: "Not enough stars. Please top up first."
      });
    }

    const currentStars = result.rows[0].stars;
    if (currentStars > 0) {
      await pool.query(
        "UPDATE users SET stars = stars - 1 WHERE telegram_id = $1",
        [telegram_id]
      );
      return res.json({
        success: true,
        message: "Game started! 1 star deducted."
      });
    } else {
      return res.json({
        success: false,
        message: "Not enough stars. Please top up first."
      });
    }
  } catch (err) {
    console.error("Error deducting star:", err);
    res.status(500).json({ success: false, message: "Error deducting star." });
  }
});

app.post("/admin/manual-topup", async (req, res) => {
  try {
    const { telegram_id, addStars } = req.body;
    // Ensure user row
    let result = await pool.query(
      "SELECT id FROM users WHERE telegram_id = $1",
      [telegram_id]
    );
    if (result.rowCount === 0) {
      await pool.query(
        "INSERT INTO users (telegram_id, stars) VALUES ($1, 0)",
        [telegram_id]
      );
    }
    // Top up
    await pool.query(
      "UPDATE users SET stars = stars + $1 WHERE telegram_id = $2",
      [addStars, telegram_id]
    );
    return res.json({ success: true, message: "User credited successfully." });
  } catch (err) {
    console.error("Error topping up stars:", err);
    res.status(500).json({ success: false, message: "Error topping up." });
  }
});

// 4) (Optional) Scoreboard logic
app.post("/game/submit-score", async (req, res) => {
  try {
    const { telegram_id, score } = req.body;
    console.log(`User ${telegram_id} finished with score: ${score}`);
    res.json({ success: true, message: "Score recorded" });
  } catch (err) {
    console.error("Error saving score:", err);
    res.status(500).json({ success: false, message: "Error saving score" });
  }
});

app.get("/current-leaderboard", async (req, res) => {
  try {
    // Just a placeholder
    res.json({ success: true, leaderboard: [] });
  } catch (err) {
    console.error("Error fetching leaderboard:", err);
    res.status(500).json({ success: false, message: "Error fetching leaderboard." });
  }
});

// 5) Start Express
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
