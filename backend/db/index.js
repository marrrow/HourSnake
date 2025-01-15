// db/index.js
const { Pool } = require('pg');
const { logError } = require('../utils/errorHandler');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

pool.on('error', (err) => {
  logError(err, 'Unexpected error on idle database client');
  process.exit(-1);
});

module.exports = {
  query: (text, params) => pool.query(text, params),
  pool
};