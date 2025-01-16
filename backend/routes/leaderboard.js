const express = require('express');
const router = express.Router();
const db = require('../db');
const { logError } = require('../utils/errorHandler');

// Fetch leaderboard (top 10 players)
router.get('/', async (req, res) => {
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
