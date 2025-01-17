// bot.js
const TelegramBot = require('node-telegram-bot-api');
const { Pool } = require('pg');

// Initialize Telegram Bot with webhook
const bot = new TelegramBot(process.env.TELEGRAM_TOKEN, { webHook: true });

// Set webhook using WEBHOOK_URL from .env
const webhookUrl = `${process.env.WEBHOOK_URL}/bot${process.env.TELEGRAM_TOKEN}`;
bot.setWebHook(webhookUrl)
  .then(() => console.log(`Webhook successfully set: ${webhookUrl}`))
  .catch((err) =>
    console.error(
      'Error setting webhook:',
      err.message,
      err.response?.body || 'No response body'
    )
  );

// Connect to PostgreSQL
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false // Required for managed PostgreSQL on Render
  }
});

// Handle /start command
bot.onText(/\/start/, async (msg) => {
  const chatId = msg.chat.id;

  // Inline keyboard for bot options
  const keyboard = {
    inline_keyboard: [
      [{ text: '🎮 Play Snake', web_app: { url: process.env.FRONTEND_URL } }],
      [{ text: '⭐ Check Stars', callback_data: 'check_stars' }],
      [{ text: '🏆 Leaderboard', callback_data: 'leaderboard' }],
    ],
  };

  try {
    // Add new user to database if they don't already exist
    // Setting them to 100 stars by default
    await pool.query(
      `INSERT INTO users (telegram_id, username, stars)
       VALUES ($1, $2, 100)
       ON CONFLICT (telegram_id) DO NOTHING`,
      [msg.from.id, msg.from.username || 'Anonymous']
    );

    // Send welcome message + keyboard
    bot.sendMessage(
      chatId,
      'Welcome to HourSnake! 🐍\n\n' +
        '• Each game costs 1 star\n' +
        '• Win hourly competitions for rewards:\n' +
        '  1st place: 50 stars\n' +
        '  2nd place: 25 stars\n' +
        '  3rd place: 10 stars\n\n' +
        'Press "Play Snake" below to open the game!',
      { reply_markup: keyboard }
    );
  } catch (error) {
    console.error('Error in /start command:', error);
    bot.sendMessage(chatId, 'Sorry, there was an error. Please try again.');
  }
});

// Handle callback queries
bot.on('callback_query', async (query) => {
  const chatId = query.message.chat.id;

  switch (query.data) {
    case 'check_stars': {
      try {
        const result = await pool.query(
          'SELECT stars FROM users WHERE telegram_id = $1',
          [query.from.id]
        );
        const stars = result.rows[0]?.stars || 0;
        bot.sendMessage(chatId, `You have ${stars} ⭐`);
      } catch (error) {
        console.error('Error checking stars:', error);
        bot.sendMessage(chatId, 'Error checking stars. Please try again.');
      }
      break;
    }

    case 'leaderboard': {
      try {
        // Example: current hour scoreboard from 'scores' table
        const hourStart = Math.floor(Date.now() / (1000 * 60 * 60));
        const result = await pool.query(
          `SELECT u.username, s.score 
           FROM scores s
           JOIN users u ON s.user_id = u.id
           WHERE hour_start = $1
           ORDER BY score DESC
           LIMIT 10`,
          [hourStart]
        );

        let message = '🏆 Current Hour Leaders:\n\n';
        if (result.rows.length === 0) {
          message += 'No scores yet this hour.';
        } else {
          result.rows.forEach((row, i) => {
            message += `${i + 1}. ${row.username || 'Anonymous'}: ${row.score}\n`;
          });
        }

        bot.sendMessage(chatId, message);
      } catch (error) {
        console.error('Error fetching leaderboard:', error);
        bot.sendMessage(chatId, 'Error fetching leaderboard. Please try again.');
      }
      break;
    }

    default: {
      bot.sendMessage(chatId, 'Invalid option.');
      break;
    }
  }
});

module.exports = bot;