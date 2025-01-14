const express = require('express');
const db = require('../database');
const router = express.Router();

// Fetch leaderboard and countdown
router.get('/', (req, res) => {
    const hourStart = Math.floor(Date.now() / (60 * 60 * 1000));
    const timeRemaining = 60 - new Date().getMinutes(); // Minutes left in the hour

    db.all(
        `SELECT u.username, SUM(s.score) AS total_score
         FROM scores s
         JOIN users u ON s.user_id = u.id
         WHERE s.hour_start = ?
         GROUP BY s.user_id
         ORDER BY total_score DESC
         LIMIT 3`,
        [hourStart],
        (err, rows) => {
            if (err) return res.status(500).json({ success: false, error: err.message });
            res.json({ success: true, leaderboard: rows, time_remaining: timeRemaining });
        }
    );
});

module.exports = router;
