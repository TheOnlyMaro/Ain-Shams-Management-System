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

  // Seed initial resource types if table exists and is empty
  const hasResourceTypes = await exists('resource_types');
  if (hasResourceTypes) {
    const cntRes = await pool.query('SELECT COUNT(1) as c FROM resource_types');
    const count = parseInt(cntRes.rows[0].c, 10);
    if (count === 0) {
      console.log('Seeding resource_types lookup table...');
      const seedSql = `
        INSERT INTO resource_types (name, description) VALUES
          ('Laptop', 'Portable computers for students and faculty'),
          ('Projector', 'Classroom projectors and mounts'),
          ('Software License', 'Licensed software subscriptions'),
          ('Lab Equipment', 'Specialized laboratory equipment'),
          ('Tablet', 'Portable tablets for field and classroom use')
        ON CONFLICT (name) DO NOTHING;
      `;
      await pool.query(seedSql);
      console.log('resource_types seeded.');
    } else {
      console.log('resource_types already contains entries; skipping seed.');
    }
  }

  // Seed eav attributes for resources (boolean + optional datetimes)
  try {
    console.log('Ensuring resource EAV attributes (isSoftware, purchaseDate, warrantyUntil) exist...');
    await pool.query(`
      INSERT INTO eav_attributes (entity_type, attribute_name, data_type, is_searchable)
      VALUES
        ('resource', 'isSoftware', 'boolean', FALSE),
        ('resource', 'purchaseDate', 'datetime', FALSE),
        ('resource', 'warrantyUntil', 'datetime', FALSE)
      ON CONFLICT (entity_type, attribute_name) DO NOTHING;
    `);
    console.log('resource EAV attributes ensured.');
  } catch (err) {
    console.log('Could not seed resource EAV attributes (table may not exist yet):', err.message);
  }
}

main().catch((err) => {
  console.error('Failed to apply schema:', err);
  process.exit(1);
}).finally(() => pool.end());
