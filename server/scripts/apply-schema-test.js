/*
  Apply DDL from server/database/schema.sql into a separate `test` schema
  so tests can run against isolated tables without touching public tables.
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

const pool = new Pool({ connectionString, ssl: { rejectUnauthorized: false } });

async function main() {
  const schemaPath = path.join(__dirname, '..', 'database', 'schema.sql');
  const sql = fs.readFileSync(schemaPath, 'utf8');
  console.log('Preparing test schema...');

  const client = await pool.connect();
  try {
    // Ensure schema exists and set search_path for this client session only
    await client.query("CREATE SCHEMA IF NOT EXISTS test");
    await client.query("SET search_path TO test, public");

    // Fast-check: if key test tables/attributes already exist, skip expensive full apply.
    const tbl = await client.query("SELECT 1 FROM information_schema.tables WHERE table_schema='test' AND table_name='resource_types' LIMIT 1");
    if (tbl.rowCount > 0) {
      const eav = await client.query("SELECT 1 FROM eav_attributes WHERE entity_type='resource' AND attribute_name='isSoftware' LIMIT 1");
      const payroll = await client.query("SELECT 1 FROM information_schema.tables WHERE table_schema='test' AND table_name='payroll_runs' LIMIT 1");
      // Only fast-skip if both EAV and payroll tables are present (so newly added payrolls won't be skipped accidentally)
      if (eav.rowCount > 0 && payroll.rowCount > 0) {
        console.log('Test schema already initialized (fast-skip).');
        // Still attempt idempotent seeding in case rows are missing
        await trySeed(client);
        console.log('Test schema apply complete (skipped).');
        return;
      }
    }

    console.log('Applying schema.sql into test schema (statements applied individually) ...');

    const rawStatements = sql.split(';');
    for (let i = 0; i < rawStatements.length; i++) {
      let stmt = rawStatements[i].trim();
      if (!stmt) continue;
      const lines = stmt.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
      if (lines.length === 0) continue;
      if (lines.every(l => l.startsWith('--') || l.startsWith('/*') || l.startsWith('*/'))) continue;
      while (lines.length && (lines[0].startsWith('--') || lines[0].startsWith('/*') || lines[0].startsWith('*/'))) lines.shift();
      if (lines.length === 0) continue;
      stmt = lines.join('\n');
      const firstWord = (stmt.split(/\s+/)[0] || '').toUpperCase();
      const allowed = ['CREATE','INSERT','ALTER','DROP','COMMENT','GRANT','REVOKE','SET','DO','BEGIN','COMMIT','WITH'];
      if (!allowed.includes(firstWord)) {
        console.log('Skipping non-SQL chunk:', firstWord || '(empty)');
        continue;
      }
      try {
        await client.query(stmt + ';');
      } catch (err) {
        const msg = err && err.message ? err.message : String(err);
        if (/already exists|duplicate key value|violates unique constraint|relation ".*" already exists/i.test(msg)) {
          // benign if object already exists
          continue;
        }
        console.error('Error applying statement:', stmt.slice(0, 200));
        throw err;
      }
    }

    // Seed required rows
    await trySeed(client);

    console.log('Test schema apply complete.');
  } finally {
    client.release();
    await pool.end();
  }
}

async function trySeed(client) {
  try {
    await client.query(`INSERT INTO test.resource_types (name, description) VALUES
      ('Laptop','Portable computers for students and faculty'),
      ('Projector','Classroom projectors and mounts'),
      ('Software License','Licensed software subscriptions')
      ON CONFLICT (name) DO NOTHING`);
  } catch (e) {
    // best-effort - ignore
  }

  try {
    await client.query(`INSERT INTO test.eav_attributes (entity_type, attribute_name, data_type, is_searchable)
      VALUES ('resource','isSoftware','boolean',FALSE), ('resource','purchaseDate','datetime',FALSE), ('resource','warrantyUntil','datetime',FALSE)
      ON CONFLICT (entity_type, attribute_name) DO NOTHING`);
  } catch (e) {
    // best-effort - ignore
  }
}

main().catch(err => {
  console.error('Failed to apply test schema:', err);
  process.exit(1);
});
