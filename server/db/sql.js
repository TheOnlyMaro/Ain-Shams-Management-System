const { Pool } = require('pg');

// Expect SUPABASE_DB_URL (postgres connection string) in root .env
const connectionString = process.env.SUPABASE_DB_URL;
let pool = null;
if (!connectionString) {
  console.warn('[sql] SUPABASE_DB_URL is not set. Please configure your Supabase Postgres connection string.');
} else {
  pool = new Pool({
    connectionString,
    ssl: { rejectUnauthorized: false },
    max: 10,
    idleTimeoutMillis: 30000,
  });

  pool.on('error', (err) => {
    console.error('[sql] Unexpected idle client error', err);
  });
}

module.exports = {
  pool,
  query: pool ? (text, params) => pool.query(text, params) : () => Promise.reject(new Error('No database connection')),
};
