// awarding.js (a small awarding script)
const cron = require('node-cron');
const db = require('./db');

// This will run every hour, on the hour (minute=0)
cron.schedule('0 * * * *', async () => {
  try {
    const hourStart = Math.floor(Date.now() / 3600000);
    const prevHour = hourStart - 1;

    // 1) get top 3 from previous hour
    const result = await db.query(`
      SELECT user_id, score
      FROM scores
      WHERE hour_start = $1
      ORDER BY score DESC
      LIMIT 3
    `, [prevHour]);

    // 2) For each place, award stars
    const awards = [50, 25, 10]; // first, second, third
    for (let i = 0; i < result.rows.length; i++) {
      const { user_id, score } = result.rows[i];
      if (score > 0) {
        // only award if they actually have a non-zero score
        await db.query(
          'UPDATE users SET stars = stars + $1 WHERE id = $2',
          [awards[i], user_id]
        );
      }
    }

    // Optionally: delete old data or keep it for logs
    // await db.query('DELETE FROM scores WHERE hour_start = $1', [prevHour]);
    // Or you can keep them around for an “all-time history”
    console.log("Awarded top 3 for hour:", prevHour);
  } catch (err) {
    console.error("Error awarding top 3:", err);
  }
});
