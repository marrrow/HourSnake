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
        await db.query(
            'UPDATE users SET stars = stars - 1 WHERE telegram_id = $1',
            [telegram_id]
        );
        res.json({ success: true });
    } catch (err) {
        logError(err, 'Error deducting star');
        res.status(500).json({ success: false, error: 'Failed to deduct star' });
    }
});

// Fetch leaderboard
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

// Distribute hourly rewards
router.post('/distribute-rewards', async (req, res) => {
    try {
        const hourStart = Math.floor(Date.now() / (1000 * 60 * 60));
        const topPlayers = await db.query(
            `SELECT id FROM scores 
             WHERE hour_start = $1 
             ORDER BY score DESC 
             LIMIT 3`,
            [hourStart]
        );
        const rewards = [50, 25, 10];
        for (let i = 0; i < topPlayers.rows.length; i++) {
            await db.query(
                'UPDATE users SET stars = stars + $1 WHERE id = $2',
                [rewards[i], topPlayers.rows[i].id]
            );
        }
        res.json({ success: true, message: 'Rewards distributed!' });
    } catch (err) {
        logError(err, 'Error distributing rewards');
        res.status(500).json({ success: false, error: 'Failed to distribute rewards' });
    }
});

module.exports = router;
