const express = require('express');
const router = express.Router();
const db = require('../db');
const { logError } = require('../utils/errorHandler');

// Fetch user's stars
router.post('/stars', async (req, res) => {
    const { telegram_id } = req.body;

    try {
        const result = await db.query(
            'SELECT stars FROM users WHERE telegram_id = $1',
            [telegram_id]
        );

        res.json({ 
            success: true, 
            stars: result.rows[0]?.stars || 0 
        });
    } catch (err) {
        logError(err, 'Error fetching stars');
        res.status(500).json({ success: false, error: 'Failed to fetch stars' });
    }
});

// Deduct one star to play
router.post('/deduct-star', async (req, res) => {
    const { telegram_id } = req.body;

    try {
        // First check if user exists and has enough stars
        const userResult = await db.query(
            'SELECT id, stars FROM users WHERE telegram_id = $1',
            [telegram_id]
        );

        if (!userResult.rows[0] || userResult.rows[0].stars < 1) {
            return res.json({ 
                success: false, 
                message: 'Not enough stars.' 
            });
        }

        // Deduct star
        await db.query(
            'UPDATE users SET stars = stars - 1 WHERE telegram_id = $1',
            [telegram_id]
        );

        res.json({ success: true, message: 'Game started! Enjoy playing.' });
    } catch (err) {
        logError(err, 'Error deducting star');
        res.status(500).json({ success: false, error: 'Failed to deduct star' });
    }
});
// In routes/game.js (or somewhere in your Express code)
router.post('/submit-score', async (req, res) => {
  const { telegram_id, score } = req.body;
  if (typeof telegram_id !== 'number' || typeof score !== 'number') {
    return res.status(400).json({ success: false, message: 'Invalid data' });
  }

  try {
    // 1) Find user by telegram_id
    const userResult = await db.query(
      'SELECT id FROM users WHERE telegram_id = $1',
      [telegram_id]
    );
    if (userResult.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    const userId = userResult.rows[0].id;

    // 2) Compute current hour_start
    //    e.g. "the integer number of hours since epoch"
    const hourStart = Math.floor(Date.now() / 3600000);

    // 3) Insert or update score
    //    If record exists for (user_id, hour_start), set `score = GREATEST(existingScore, newScore)`
    await db.query(`
      INSERT INTO scores (user_id, score, hour_start)
      VALUES ($1, $2, $3)
      ON CONFLICT (user_id, hour_start)
      DO UPDATE SET score = GREATEST(scores.score, EXCLUDED.score)
    `, [userId, score, hourStart]);

    return res.json({ success: true, message: 'Score submitted successfully' });
  } catch (err) {
    console.error('Error in /submit-score:', err);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

// Fetch leaderboard (limit to top 10 players)
router.get('/leaderboard', async (req, res) => {
    try {
        const result = await db.query(
            `SELECT username, total_score 
             FROM users 
             ORDER BY total_score DESC 
             LIMIT 10`
        );

        res.json({ 
            success: true, 
            leaderboard: result.rows
        });
    } catch (err) {
        logError(err, 'Error fetching leaderboard');
        res.status(500).json({ success: false, error: 'Failed to fetch leaderboard' });
    }
});

module.exports = router;
