const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./hour_snake.db');

db.serialize(() => {
    const initSQL = require('fs').readFileSync('./migrations/init.sql', 'utf-8');
    db.exec(initSQL);
});

module.exports = db;
