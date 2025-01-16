const express = require('express');
const router = express.Router();
const db = require('../db');
const { logError } = require('../utils/errorHandler');

// Fetch leaderboard and countdown
router.get('/', async (req, res) => {
    const hourStart = Math.floor(Date.now() / (60 * 60 * 1000));
    const timeRemaining = 60 - new Date().getMinutes();

    try {
        const result = await db.query(
            `SELECT u.username, SUM(s.score) AS total_score
             FROM scores s
             JOIN users u ON s.user_id = u.id
             WHERE s.hour_start = $1
             GROUP BY s.user_id, u.username
             ORDER BY total_score DESC
             LIMIT 3`,
            [hourStart]
        );

        res.json({ 
            success: true, 
            leaderboard: result.rows, 
            time_remaining: timeRemaining 
        });
    } catch (err) {
        logError(err, 'Error fetching leaderboard');
        res.status(500).json({ success: false, error: 'Failed to fetch leaderboard' });
    }
});

module.exports = router;