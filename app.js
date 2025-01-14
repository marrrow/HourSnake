require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const TelegramBot = require('node-telegram-bot-api');
const db = require('./database');

const app = express();
const bot = new TelegramBot(process.env.TELEGRAM_TOKEN, { polling: true });

app.use(bodyParser.json());
app.use(cors());

// Routes
const gameRoutes = require('./routes/game');
const leaderboardRoutes = require('./routes/leaderboard');

app.use('/game', gameRoutes);
app.use('/leaderboard', leaderboardRoutes);

// Webhook for Telegram
bot.on('message', (msg) => {
    const chatId = msg.chat.id;
    if (msg.text === '/start') {
        bot.sendMessage(chatId, `Welcome to HourSnake! Click the link to play: https://t.me/HourSnake_bot/Zmejka`);
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
