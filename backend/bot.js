const TelegramBot = require('node-telegram-bot-api');
const { Pool } = require('pg');

// Use Webhook in production (Render)
const isProduction = process.env.NODE_ENV === 'production';

const botOptions = isProduction
  ? {
      webHook: {
        port: process.env.PORT || 10000,
      },
    }
  : { polling: true };

// Initialize Telegram Bot
const bot = new TelegramBot(process.env.TELEGRAM_TOKEN, botOptions);

// Set Webhook URL in production
if (isProduction) {
  bot.setWebHook(`${process.env.FRONTEND_URL}/bot${process.env.TELEGRAM_TOKEN}`);
}

// Database connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

// Start command
bot.onText(/\/start/, async (msg) => {
  const chatId = msg.chat.id;

  const keyboard = {
    inline_keyboard: [
      [{ text: '🎮 Play Snake', web_app: { url: process.env.FRONTEND_URL } }],
      [{ text: '⭐ Check Stars', callback_data: 'check_stars' }],
      [{ text: '🏆 Leaderboard', callback_data: 'leaderboard' }],
    ],
  };

  try {
    await pool.query(
      'INSERT INTO users (telegram_id, username, stars) VALUES ($1, $2, 5) ON CONFLICT (telegram_id) DO NOTHING',
      [msg.from.id, msg.from.username]
    );

    bot.sendMessage(chatId, 'Welcome to HourSnake! 🐍', { reply_markup: keyboard });
  } catch (error) {
    console.error('Error in start command:', error);
    bot.sendMessage(chatId, 'Something went wrong. Please try again.');
  }
});

// Handle callbacks
bot.on('callback_query', async (query) => {
  const chatId = query.message.chat.id;

  switch (query.data) {
    case 'check_stars':
      try {
        const result = await pool.query(
          'SELECT stars FROM users WHERE telegram_id = $1',
          [query.from.id]
        );
        const stars = result.rows[0]?.stars || 0;
        bot.sendMessage(chatId, `You have ${stars} ⭐`);
      } catch (error) {
        console.error('Error fetching stars:', error);
        bot.sendMessage(chatId, 'Failed to fetch stars.');
      }
      break;

    case 'leaderboard':
      try {
        const result = await pool.query(
          'SELECT username, total_score FROM users ORDER BY total_score DESC LIMIT 10'
        );
        let message = '🏆 Leaderboard:\n';
        result.rows.forEach((row, index) => {
          message += `${index + 1}. ${row.username || 'Anonymous'} - ${row.total_score}\n`;
        });
        bot.sendMessage(chatId, message);
      } catch (error) {
        console.error('Error fetching leaderboard:', error);
        bot.sendMessage(chatId, 'Failed to fetch leaderboard.');
      }
      break;
  }
});

module.exports = bot;
