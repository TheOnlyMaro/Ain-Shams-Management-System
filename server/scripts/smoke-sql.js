/*
  Smoke test for Supabase Postgres connection and schema presence.
  - Verifies connection
  - Checks required tables and view
  - Ensures default roles exist
  - Verifies EAV attributes present
*/
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

async function query(text, params) {
  return pool.query(text, params);
}

async function ensureRoles() {
  const roles = ['student', 'admin', 'staff', 'parent'];
  for (const name of roles) {
    await query('INSERT INTO roles(name) VALUES ($1) ON CONFLICT (name) DO NOTHING', [name]);
  }
  const r = await query('SELECT name FROM roles ORDER BY id');
  return r.rows.map(x => x.name);
}

async function checkTables() {
  const names = [
    'roles','users','courses','assignments','grades','course_enrollments','course_materials',
    'course_tags','tags','applications','application_documents','application_activity_logs',
    'application_notifications','refresh_tokens','eav_attributes','eav_values'
  ];
  const out = {};
  for (const n of names) {
    const r = await query("SELECT to_regclass('public." + n + "') AS exists");
    out[n] = !!r.rows[0].exists;
  }
  const view = await query("SELECT to_regclass('public.vw_course_metadata') AS exists");
  out['vw_course_metadata'] = !!view.rows[0].exists;
  return out;
}

async function checkEav() {
  const keys = [
    ['user','staffType'],
    ['user','preferredLanguage'],
    ['course','lms_external_id'],
    ['course','lms_sync_metadata'],
    ['application','custom_field_1'],
    ['lms_integration','canvas_api_key'],
    ['lms_integration','blackboard_config'],
  ];
  const results = {};
  for (const [entity, attr] of keys) {
    const r = await query(
      'SELECT 1 FROM eav_attributes WHERE entity_type=$1 AND attribute_name=$2',
      [entity, attr]
    );
    results[`${entity}.${attr}`] = r.rowCount > 0;
  }
  return results;
}

async function main() {
  console.log('Connecting to Supabase Postgres...');
  await query('SELECT 1');
  console.log('Connection OK');

  console.log('Ensuring default roles exist...');
  const roles = await ensureRoles();
  console.log('Roles:', roles.join(', '));

  console.log('Checking tables and view...');
  const tables = await checkTables();
  console.table(tables);

  console.log('Checking EAV attributes...');
  const eav = await checkEav();
  console.table(eav);

  const missing = Object.entries({ ...tables, ...eav }).filter(([, ok]) => !ok);
  if (missing.length) {
    console.error('Smoke test found missing items:', missing.map(([k]) => k));
    process.exit(2);
  }

  console.log('Smoke test PASSED');
}

main().catch((err) => {
  console.error('Smoke test FAILED:', err);
  process.exit(1);
}).finally(() => pool.end());
