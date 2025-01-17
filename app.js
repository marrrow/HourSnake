require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const TelegramBot = require('node-telegram-bot-api');
const path = require('path');
const { errorHandler } = require('./utils/errorHandler');
const { logger } = require('./utils/errorHandler');

const app = express();
const PORT = process.env.PORT || 3000;

// Create Telegram Bot instance
const bot = new TelegramBot(process.env.TELEGRAM_TOKEN, { polling: true });

// Middleware
app.use(bodyParser.json());

// CORS configuration
const corsOptions = {
  origin: [
    'https://web.telegram.org',
    'http://localhost:3000',
    process.env.FRONTEND_URL // Add your frontend URL here
  ],
  methods: ['GET', 'POST'],
  credentials: true,
  optionsSuccessStatus: 200
};
app.use(cors(corsOptions));

// Serve static files
app.use(express.static(path.join(__dirname, 'public')));

// Import routes
const gameRoutes = require('./routes/game');
const leaderboardRoutes = require('./routes/leaderboard');

// Use routes
app.use('/game', gameRoutes);
app.use('/leaderboard', leaderboardRoutes);

// Health check endpoint
app.get('/healthz', (req, res) => {
  res.status(200).send('OK');
});

// Telegram Bot message handler
bot.on('message', (msg) => {
  const chatId = msg.chat.id;
  if (msg.text === '/start') {
    bot.sendMessage(chatId, `Welcome to HourSnake! Click the link to play: https://t.me/HourSnake_bot/Zmejka`)
      .catch(err => handleTelegramError(err, chatId, bot));
  }
});

// Error handling middleware - should be last
app.use(errorHandler);

// Start server
app.listen(PORT, () => {
  logger.info(`Server running on port ${PORT}`);
});

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  logger.error('Uncaught Exception:', err);
  process.exit(1);
});

process.on('unhandledRejection', (err) => {
  logger.error('Unhandled Rejection:', err);
  process.exit(1);
});