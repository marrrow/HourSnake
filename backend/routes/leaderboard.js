const express = require('express');
const router = express.Router();
const db = require('../db');
const { logError } = require('../utils/errorHandler');

router.get('/current-leaderboard', async (req, res) => {
  try {
    const result = await db.query(
      `SELECT u.username, MAX(s.score) AS high_score
       FROM scores s
       JOIN users u ON s.user_id = u.id
       GROUP BY u.username
       ORDER BY high_score DESC
       LIMIT 10`
    );
    res.json({ success: true, leaderboard: result.rows });
  } catch (err) {
    logError(err, 'Error fetching leaderboard');
    res.status(500).json({ success: false, message: 'Error fetching leaderboard' });
  }
});

module.exports = router;
