const express = require('express');
const router = express.Router();
const db = require('../db');  // adjust as your db connection module
const { logError } = require('../utils/errorHandler');

router.post('/submit-score', async (req, res) => {
  const { telegram_id, score } = req.body;
  // Lookup the user and insert the score in the scores table
  try {
    const userResult = await db.query('SELECT id FROM users WHERE telegram_id = $1', [telegram_id]);
    if (userResult.rowCount === 0) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    const userId = userResult.rows[0].id;
    await db.query(
      "INSERT INTO scores (user_id, score, hour_start) VALUES ($1, $2, $3)",
      [userId, score, Math.floor(Date.now() / 3600000)]
    );
    return res.json({ success: true, message: 'Score recorded' });
  } catch (err) {
    logError(err, 'Error in /submit-score');
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

module.exports = router;
