const express = require('express');
const db = require('../database');
const router = express.Router();

// Fetch user's stars
router.post('/stars', (req, res) => {
    const { telegram_id } = req.body;

    db.get(`SELECT stars FROM users WHERE telegram_id = ?`, [telegram_id], (err, row) => {
        if (err) return res.status(500).json({ success: false, error: err.message });
        res.json({ success: true, stars: row ? row.stars : 0 });
    });
});

// Deduct one star to play
router.post('/deduct-star', (req, res) => {
    const { telegram_id } = req.body;

    db.get(`SELECT stars FROM users WHERE telegram_id = ?`, [telegram_id], (err, row) => {
        if (err || !row || row.stars < 1) {
            return res.json({ success: false, message: 'Not enough stars.' });
        }

        db.run(`UPDATE users SET stars = stars - 1 WHERE telegram_id = ?`, [telegram_id], (err) => {
            if (err) return res.status(500).json({ success: false, error: err.message });
            res.json({ success: true });
        });
    });
});

module.exports = router;
