const TelegramBot = require('node-telegram-bot-api');
const { Pool } = require('pg');

// Bot initialization
const bot = new TelegramBot(process.env.TELEGRAM_TOKEN, { polling: true });

// Database connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

// Start command
bot.onText(/\/start/, async (msg) => {
  const chatId = msg.chat.id;
  
  const keyboard = {
    inline_keyboard: [
      [{ text: '🎮 Play Snake', web_app: { url: process.env.FRONTEND_URL } }],
      [{ text: '⭐ Check Stars', callback_data: 'check_stars' }],
      [{ text: '🏆 Leaderboard', callback_data: 'leaderboard' }]
    ]
  };

  try {
    // Add new user if they don't exist
    await pool.query(
      'INSERT INTO users (telegram_id, username, stars) VALUES ($1, $2, 1) ON CONFLICT (telegram_id) DO NOTHING',
      [msg.from.id, msg.from.username]
    );

    bot.sendMessage(chatId, 
      'Welcome to HourSnake! 🐍\n\n' +
      '• Each game costs 1 star\n' +
      '• Win hourly competitions for rewards:\n' +
      '  1st place: 50 stars\n' +
      '  2nd place: 25 stars\n' +
      '  3rd place: 10 stars',
      { reply_markup: keyboard }
    );
  } catch (error) {
    console.error('Error in start command:', error);
    bot.sendMessage(chatId, 'Sorry, there was an error. Please try again.');
  }
});

// Handle button clicks
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
        console.error('Error checking stars:', error);
        bot.sendMessage(chatId, 'Error checking stars. Please try again.');
      }
      break;

    case 'leaderboard':
      try {
        const hourStart = Math.floor(Date.now() / (1000 * 60 * 60));
        const result = await pool.query(
          `SELECT username, score 
           FROM scores s
           JOIN users u ON s.user_id = u.id
           WHERE hour_start = $1
           ORDER BY score DESC
           LIMIT 10`,
          [hourStart]
        );
        
        let message = '🏆 Current Hour Leaders:\n\n';
        result.rows.forEach((row, i) => {
          message += `${i + 1}. ${row.username}: ${row.score}\n`;
        });
        
        bot.sendMessage(chatId, message);
      } catch (error) {
        console.error('Error fetching leaderboard:', error);
        bot.sendMessage(chatId, 'Error fetching leaderboard. Please try again.');
      }
      break;
  }
});

module.exports = bot;