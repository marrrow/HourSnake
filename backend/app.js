// app.js
require("dotenv").config();
const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const { Pool } = require("pg");

const TELEGRAM_TOKEN = process.env.TELEGRAM_TOKEN;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

const app = express();
app.use(cors());
app.use(bodyParser.json());

// 1) /game/get-credits
app.post("/game/get-credits", async (req, res) => {
  try {
    const { telegram_id } = req.body;
    const result = await pool.query(
      "SELECT stars FROM users WHERE telegram_id=$1",
      [telegram_id]
    );
    let stars = 0;
    if (result.rows.length>0) {
      stars = result.rows[0].stars;
    }
    return res.json({ success:true, stars });
  } catch(err) {
    console.error("get-credits error:", err);
    return res.status(500).json({ success:false, message:"Error fetching credits." });
  }
});

// 2) /game/deduct-credit
app.post("/game/deduct-credit", async (req, res) => {
  try {
    const { telegram_id } = req.body;
    const userRes = await pool.query(
      "SELECT id,stars FROM users WHERE telegram_id=$1",
      [telegram_id]
    );
    if (userRes.rowCount===0) {
      // create user with 0 stars
      await pool.query(
        "INSERT INTO users (telegram_id,stars) VALUES($1,0)",
        [telegram_id]
      );
      return res.json({ success:false, message:"Not enough stars. Please top up first." });
    }
    const { id, stars } = userRes.rows[0];
    if (stars<1) {
      return res.json({ success:false, message:"Not enough stars. Please top up first." });
    }
    // deduct 1
    await pool.query(
      "UPDATE users SET stars=stars-1 WHERE id=$1",
      [id]
    );
    return res.json({ success:true, message:"Game started. 1 star deducted." });
  } catch(err) {
    console.error("deduct-credit error:", err);
    return res.status(500).json({ success:false, message:"Error deducting star" });
  }
});

// 3) /game/submit-score
app.post("/game/submit-score", async (req, res) => {
  try {
    const { telegram_id, score } = req.body;
    if (!telegram_id || typeof score!=="number") {
      return res.json({ success:false, message:"Invalid data." });
    }
    // find user
    const userRes = await pool.query(
      "SELECT id FROM users WHERE telegram_id=$1",
      [telegram_id]
    );
    if (userRes.rowCount===0) {
      return res.json({ success:false, message:"User not found. Did you /start?" });
    }
    const userId = userRes.rows[0].id;
    // insert into scores table
    await pool.query(
      "INSERT INTO scores (user_id,score) VALUES($1,$2)",
      [ userId, score ]
    );
    return res.json({ success:true, message:"Score submitted." });
  } catch(err) {
    console.error("submit-score error:", err);
    return res.status(500).json({ success:false, message:"Error submitting score." });
  }
});

// 4) /current-leaderboard
app.get("/current-leaderboard", async (req,res) => {
  try {
    // top 10 by highest score
    // optionally we can do max from each user, or sum, or monthly, etc.
    const result = await pool.query(`
      SELECT u.username, s.score
      FROM scores s
      JOIN users u ON s.user_id=u.id
      ORDER BY s.score DESC
      LIMIT 10
    `);
    return res.json({ success:true, leaderboard: result.rows });
  } catch(err) {
    console.error("leaderboard error:", err);
    return res.status(500).json({ success:false, message:"Error fetching leaderboard." });
  }
});

// (Optional) /admin/manual-topup
app.post("/admin/manual-topup", async (req,res) => {
  try {
    const { telegram_id, addStars } = req.body;
    if (!telegram_id || !addStars) {
      return res.json({ success:false, message:"Missing data." });
    }
    let userRes = await pool.query("SELECT id FROM users WHERE telegram_id=$1",[telegram_id]);
    if (userRes.rowCount===0) {
      await pool.query("INSERT INTO users (telegram_id,stars) VALUES($1,$2)", [telegram_id, 0]);
      userRes = await pool.query("SELECT id FROM users WHERE telegram_id=$1",[telegram_id]);
    }
    const userId = userRes.rows[0].id;
    await pool.query("UPDATE users SET stars=stars+$1 WHERE id=$2",[addStars,userId]);
    return res.json({ success:true, message:"User credited." });
  } catch(err) {
    console.error("manual-topup error:", err);
    return res.status(500).json({ success:false, message:"Error topping up." });
  }
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log("Server listening on port", PORT);
});
