/*
  Apply DDL from server/database/schema.sql to the configured Supabase Postgres.
  Safety: if any of our core tables already exist, we skip to avoid accidental overwrite.
*/
const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');
require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env') });

const connectionString = process.env.SUPABASE_DB_URL;
if (!connectionString) {
  console.error('SUPABASE_DB_URL is not set in .env');
  process.exit(1);
}

const pool = new Pool({
  connectionString,
  ssl: { rejectUnauthorized: false },
});

async function exists(table) {
  const r = await pool.query("SELECT to_regclass('public." + table + "') AS exists");
  return !!r.rows[0].exists;
}

async function main() {
  // Quick safety check: if users table exists, abort
  const hasUsers = await exists('users');
  if (hasUsers) {
    console.log('users table already exists; skipping schema apply.');
    return;
  }
  const schemaPath = path.join(__dirname, '..', 'database', 'schema.sql');
  const sql = fs.readFileSync(schemaPath, 'utf8');
  console.log('Applying schema.sql ...');
  await pool.query(sql);
  console.log('Schema applied successfully.');
}

main().catch((err) => {
  console.error('Failed to apply schema:', err);
  process.exit(1);
}).finally(() => pool.end());
