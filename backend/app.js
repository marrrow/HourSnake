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

/* ---------------------------------------------------------------------------
   STAR / CREDITS ROUTES
--------------------------------------------------------------------------- */

// Get user’s current star count
app.post("/game/get-credits", async (req, res) => {
  try {
    const { telegram_id } = req.body;
    const result = await pool.query(
      "SELECT stars FROM users WHERE telegram_id = $1",
      [telegram_id]
    );
    const stars = result.rows[0]?.stars || 0;
    return res.json({ success: true, credits: stars });
  } catch (err) {
    console.error("Error fetching credits:", err);
    return res.status(500).json({ success: false, message: "Error fetching credits." });
  }
});

// Deduct 1 star for a game attempt
app.post("/game/deduct-credit", async (req, res) => {
  try {
    const { telegram_id } = req.body;
    const userRes = await pool.query(
      "SELECT stars FROM users WHERE telegram_id = $1",
      [telegram_id]
    );
    if (userRes.rowCount === 0) {
      // user doesn't exist? create them with 0
      await pool.query(
        "INSERT INTO users (telegram_id, stars) VALUES ($1, 0)",
        [telegram_id]
      );
      return res.json({
        success: false,
        message: "Not enough stars. Please top up first."
      });
    }

    const currentStars = userRes.rows[0].stars;
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
    return res.status(500).json({ success: false, message: "Error deducting star." });
  }
});

// Manually top up (admin usage)
app.post("/admin/manual-topup", async (req, res) => {
  try {
    const { telegram_id, addStars } = req.body;
    // Ensure user row
    const userCheck = await pool.query(
      "SELECT id FROM users WHERE telegram_id = $1",
      [telegram_id]
    );
    if (userCheck.rowCount === 0) {
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
    return res.status(500).json({ success: false, message: "Error topping up." });
  }
});

/* ---------------------------------------------------------------------------
   SCORES & LEADERBOARD
--------------------------------------------------------------------------- */

// Submit score after the user finishes a game
// We'll store it in 'scores' table with hour_start, etc. (example logic)
app.post("/game/submit-score", async (req, res) => {
  try {
    const { telegram_id, score } = req.body;
    if (!telegram_id || typeof score !== "number") {
      return res.status(400).json({ success: false, message: "Invalid data." });
    }

    // 1) get user_id
    const userCheck = await pool.query(
      "SELECT id FROM users WHERE telegram_id = $1",
      [telegram_id]
    );
    if (userCheck.rowCount === 0) {
      return res.status(404).json({ success: false, message: "User not found." });
    }
    const userId = userCheck.rows[0].id;

    // 2) compute hour_start
    const hourStart = Math.floor(Date.now() / 3600000);

    // 3) Insert or update
    await pool.query(
      `INSERT INTO scores (user_id, score, hour_start)
       VALUES ($1, $2, $3)
       ON CONFLICT (user_id, hour_start)
       DO UPDATE SET score = GREATEST(scores.score, EXCLUDED.score)`,
      [userId, score, hourStart]
    );

    return res.json({ success: true, message: "Score recorded" });
  } catch (err) {
    console.error("Error saving score:", err);
    return res.status(500).json({ success: false, message: "Error saving score" });
  }
});

// Return the top 10 players for the *current hour*
app.get("/current-leaderboard", async (req, res) => {
  try {
    const hourStart = Math.floor(Date.now() / 3600000);
    // Query top scores for this hour
    const result = await pool.query(
      `SELECT u.username, s.score
       FROM scores s
       JOIN users u ON s.user_id = u.id
       WHERE s.hour_start = $1
       ORDER BY s.score DESC
       LIMIT 10`,
      [hourStart]
    );

    res.json({ success: true, leaderboard: result.rows });
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
