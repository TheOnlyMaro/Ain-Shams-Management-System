const { Pool } = require('pg');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env') });

const connectionString = process.env.SUPABASE_DB_URL;
if (!connectionString) {
  console.error('SUPABASE_DB_URL is not set.');
  process.exit(1);
}

const pool = new Pool({
  connectionString,
  ssl: { rejectUnauthorized: false },
});

const fs = require('fs');
async function listUsers() {
  try {
    console.log('Connecting to DB...');
    const result = await pool.query('SELECT id, name, email, role_id, created_at FROM users ORDER BY created_at DESC');
    console.log(`Found ${result.rows.length} users.`);
    fs.writeFileSync('users.json', JSON.stringify(result.rows, null, 2));
    console.log('Wrote to users.json');
  } catch (err) {
    console.error('Error listing users:', err);
  } finally {
    await pool.end();
  }
}

listUsers();
