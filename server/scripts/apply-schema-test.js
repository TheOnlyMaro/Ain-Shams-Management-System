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

    // Proactively create payroll tables in case schema.sql is parsed/executed out-of-order
    // This is defensive for the test apply which executes statements individually.
    try {
      await client.query(`CREATE TABLE IF NOT EXISTS payroll_runs (
        id SERIAL PRIMARY KEY,
        period_start DATE NOT NULL,
        period_end DATE NOT NULL,
        status VARCHAR(50) NOT NULL DEFAULT 'pending',
        notes TEXT NOT NULL DEFAULT '',
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
      )`);
      await client.query(`CREATE TABLE IF NOT EXISTS payroll_entries (
        id SERIAL PRIMARY KEY,
        payroll_run_id INTEGER,
        user_id INTEGER,
        gross_amount DECIMAL(19,4) NOT NULL DEFAULT 0,
        net_amount DECIMAL(19,4) NOT NULL DEFAULT 0,
        status VARCHAR(50) NOT NULL DEFAULT 'pending',
        metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
      )`);
      await client.query(`CREATE TABLE IF NOT EXISTS payroll_components (
        id SERIAL PRIMARY KEY,
        payroll_entry_id INTEGER,
        component_type VARCHAR(100) NOT NULL,
        amount DECIMAL(19,4) NOT NULL DEFAULT 0,
        taxable BOOLEAN NOT NULL DEFAULT TRUE,
        metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
      )`);
    } catch (e) {
      // best-effort; ignore
    }
    // Proactively create performance tables as well
    try {
      await client.query(`CREATE TABLE IF NOT EXISTS performance_reviews (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL,
        reviewer_id INTEGER,
        period_start DATE NOT NULL,
        period_end DATE NOT NULL,
        overall_rating DECIMAL(3,2),
        status VARCHAR(50) NOT NULL DEFAULT 'draft',
        summary TEXT NOT NULL DEFAULT '',
        metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
      )`);
      await client.query(`CREATE TABLE IF NOT EXISTS performance_goals (
        id SERIAL PRIMARY KEY,
        review_id INTEGER,
        title VARCHAR(255) NOT NULL,
        description TEXT NOT NULL DEFAULT '',
        target_date DATE,
        status VARCHAR(50) NOT NULL DEFAULT 'open',
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
      )`);
      await client.query(`CREATE TABLE IF NOT EXISTS performance_feedback (
        id SERIAL PRIMARY KEY,
        review_id INTEGER,
        commenter_id INTEGER,
        comment TEXT NOT NULL,
        rating DECIMAL(3,2) DEFAULT NULL,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
      )`);
    } catch (e) {
      // ignore
    }

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
