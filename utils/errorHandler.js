// utils/errorHandler.js
const winston = require('winston');
const path = require('path');

// Configure winston logger
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({ 
      filename: path.join(__dirname, '../logs/error.log'), 
      level: 'error' 
    }),
    new winston.transports.File({ 
      filename: path.join(__dirname, '../logs/combined.log') 
    })
  ]
});

// Add console logging in development
if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.simple()
  }));
}

// Log errors
const logError = (error, context = '') => {
  logger.error({
    message: error.message || error,
    stack: error.stack,
    context
  });
};

// Express error handling middleware
const errorHandler = (err, req, res, next) => {
  logError(err, `${req.method} ${req.path}`);
  
  res.status(500).json({
    success: false,
    message: process.env.NODE_ENV === 'development' 
      ? err.message 
      : 'An unexpected error occurred. Please try again later.'
  });
};

// Telegram error handler
const handleTelegramError = (error, chatId, bot) => {
  logError(error, `Telegram Bot Error - Chat ID: ${chatId}`);
  
  if (bot && chatId) {
    bot.sendMessage(chatId, 'Sorry, something went wrong. Please try again later.')
      .catch(err => logError(err, 'Failed to send error message to user'));
  }
};

module.exports = {
  errorHandler,
  logError,
  handleTelegramError,
  logger
};