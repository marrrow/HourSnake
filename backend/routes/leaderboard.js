const express = require('express');
const router = express.Router();
const db = require('../db');
const { logError } = require('../utils/errorHandler');

// Fetch top 10 players for the leaderboard
// e.g. in routes/game.js or routes/leaderboard.js
router.get('/current-leaderboard', async (req, res) => {
  try {
    const hourStart = Math.floor(Date.now() / 3600000);
    // Join with users to get username
    const result = await db.query(`
      SELECT u.username, s.score
      FROM scores s
      JOIN users u ON s.user_id = u.id
      WHERE s.hour_start = $1
      ORDER BY s.score DESC
      LIMIT 10
    `, [hourStart]);

    return res.json({ success: true, leaderboard: result.rows });
  } catch (err) {
    console.error('Error fetching current hour leaderboard:', err);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
});


module.exports = router;
