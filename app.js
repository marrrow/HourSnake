require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const TelegramBot = require('node-telegram-bot-api');
const db = require('./database');

const app = express();
const PORT = process.env.PORT || 3000;

// Create Telegram Bot instance (polling mode)
const bot = new TelegramBot(process.env.TELEGRAM_TOKEN, { polling: true });

app.use(bodyParser.json());
app.use(cors());

// Import routes
const gameRoutes = require('./routes/game');
const leaderboardRoutes = require('./routes/leaderboard');

// Use routes
app.use('/game', gameRoutes);
app.use('/leaderboard', leaderboardRoutes);

// A simple health-check endpoint for Render
app.get('/healthz', (req, res) => {
    res.status(200).send("OK");
});

// Telegram Bot message handler
bot.on('message', (msg) => {
    const chatId = msg.chat.id;
    if (msg.text === '/start') {
        bot.sendMessage(chatId, `Welcome to HourSnake! Click the link to play: https://t.me/HourSnake_bot/Zmejka`);
    }
});

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
