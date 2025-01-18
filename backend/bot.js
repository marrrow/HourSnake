require("dotenv").config();
const TelegramBot = require("node-telegram-bot-api");
const { Pool } = require("pg");

const TELEGRAM_TOKEN = process.env.TELEGRAM_TOKEN;

// 1) Initialize the Bot
const bot = new TelegramBot(TELEGRAM_TOKEN, { webHook: true });

// 2) Connect to PostgreSQL
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false // For Render or other SSL hosts
  }
});

// 3) /start command
bot.onText(/\/start/, async (msg) => {
  const chatId = msg.chat.id;

  // Inline keyboard
  const keyboard = {
    inline_keyboard: [
      [{ text: "🎮 Play Snake", web_app: { url: process.env.FRONTEND_URL } }],
      [{ text: "⭐ Check Stars", callback_data: "check_stars" }],
      [{ text: "🏆 Leaderboard", callback_data: "leaderboard" }],
    ],
  };

  try {
    // Insert user with default 100 "stars" (our local currency)
    await pool.query(
      `INSERT INTO users (telegram_id, username, stars)
       VALUES ($1, $2, 100)
       ON CONFLICT (telegram_id) DO NOTHING`,
      [msg.from.id, msg.from.username || "Anonymous"]
    );

    // Send welcome
    bot.sendMessage(
      chatId,
      `Welcome to HourSnake! 🐍

• Each game costs 1 star
• Win hourly competitions for rewards:
  1st place: 50 stars
  2nd place: 25 stars
  3rd place: 10 stars

Press "Play Snake" below to open the game!`,
      { reply_markup: keyboard }
    );
  } catch (error) {
    console.error("Error in /start command:", error);
    bot.sendMessage(chatId, "Sorry, there was an error. Please try again.");
  }
});

// 4) Handle callback queries
bot.on("callback_query", async (query) => {
  const chatId = query.message.chat.id;

  switch (query.data) {
    case "check_stars": {
      try {
        const result = await pool.query(
          "SELECT stars FROM users WHERE telegram_id = $1",
          [query.from.id]
        );
        const stars = result.rows[0]?.stars || 0;
        bot.sendMessage(chatId, `You have ${stars} ⭐`);
      } catch (error) {
        console.error("Error checking stars:", error);
        bot.sendMessage(chatId, "Error checking stars. Please try again.");
      }
      break;
    }

    case "leaderboard": {
      try {
        // We'll show top scoreboard for current hour
        const hourStart = Math.floor(Date.now() / 3600000);
        const result = await pool.query(
          `SELECT u.username, s.score
           FROM scores s
           JOIN users u ON s.user_id = u.id
           WHERE s.hour_start = $1
           ORDER BY s.score DESC
           LIMIT 10`,
          [hourStart]
        );

        let message = "🏆 Current Hour Leaders:\n\n";
        if (result.rows.length === 0) {
          message += "No scores yet this hour.";
        } else {
          result.rows.forEach((row, i) => {
            message += `${i + 1}. ${row.username || "Anonymous"}: ${row.score}\n`;
          });
        }
        bot.sendMessage(chatId, message);
      } catch (error) {
        console.error("Error fetching leaderboard:", error);
        bot.sendMessage(chatId, "Error fetching leaderboard. Please try again.");
      }
      break;
    }

    default: {
      bot.sendMessage(chatId, "Invalid option.");
      break;
    }
  }
});

// Export the bot and the pool so app.js can use them
module.exports = { bot, pool };
