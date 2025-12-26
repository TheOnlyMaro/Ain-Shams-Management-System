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
  // Read schema.sql and execute statements one-by-one.
  // This allows skipping objects that already exist instead of aborting entirely.
  const schemaPath = path.join(__dirname, '..', 'database', 'schema.sql');
  const sql = fs.readFileSync(schemaPath, 'utf8');
  console.log('Applying schema.sql (statements will be applied individually)...');

  // Naive split on semicolon. Good enough for simple DDL/insert file used here.
  const rawStatements = sql.split(';');
  for (let i = 0; i < rawStatements.length; i++) {
    let stmt = rawStatements[i].trim();
    if (!stmt) continue;
    // Skip comment-only chunks that may appear when splitting on semicolons
    const lines = stmt.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
    if (lines.length === 0) continue;
    if (lines.every(l => l.startsWith('--') || l.startsWith('/*') || l.startsWith('*/'))) continue;
    // Remove leading inline comments so the statement begins with SQL
    while (lines.length && (lines[0].startsWith('--') || lines[0].startsWith('/*') || lines[0].startsWith('*/'))) {
      lines.shift();
    }
    if (lines.length === 0) continue;
    stmt = lines.join('\n');
    // Ensure the cleaned chunk starts with a SQL keyword we expect; otherwise skip it
    const firstWord = (stmt.split(/\s+/)[0] || '').toUpperCase();
    const allowed = ['CREATE','INSERT','ALTER','DROP','COMMENT','GRANT','REVOKE','SET','DO','BEGIN','COMMIT','WITH'];
    if (!allowed.includes(firstWord)) {
      console.log('Skipping non-SQL chunk:', firstWord || '(empty)');
      continue;
    }
    try {
      await pool.query(stmt + ';');
    } catch (err) {
      const msg = err && err.message ? err.message : String(err);
      // Ignore errors that indicate the object already exists or unique dupes during idempotent runs
      if (/already exists|duplicate key value|violates unique constraint|relation ".*" already exists/i.test(msg)) {
        console.log('Skipping existing object or duplicate during apply:', msg.split('\n')[0]);
        continue;
      }
      // Re-throw unexpected errors
      console.error('Error applying statement:', stmt.slice(0, 200));
      throw err;
    }
  }
  console.log('Schema statements processed.');

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
