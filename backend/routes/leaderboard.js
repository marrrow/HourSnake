const express = require('express');
const router = express.Router();
const db = require('../db');
const { logError } = require('../utils/errorHandler');

// Fetch top 10 players for the leaderboard
router.get('/', async (req, res) => {
    try {
        const result = await db.query(
            `SELECT username, total_score 
             FROM users 
             ORDER BY total_score DESC 
             LIMIT 10`
        );

        const leaderboard = result.rows.map((player, index) => ({
            rank: index + 1,
            username: player.username || "Anonymous",
            total_score: player.total_score || 0,
        }));

        res.json({ success: true, leaderboard });
    } catch (err) {
        logError(err, 'Error fetching leaderboard');
        res.status(500).json({ success: false, error: 'Failed to fetch leaderboard' });
    }
});

module.exports = router;
