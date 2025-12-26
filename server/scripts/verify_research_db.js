const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env') });
const db = require('../db/sql');

async function verifyDB() {
    console.log('--- Verifying Database State ---');

    try {
        // 1. Check current search path
        const pathRes = await db.query('SHOW search_path');
        console.log('Current search_path:', pathRes.rows[0].search_path);

        // 2. Check if tables exist
        const tablesRes = await db.query(`
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = CURRENT_SCHEMA 
            AND table_name IN ('research', 'research_tags', 'users')
        `);
        console.log('Tables found in current schema:', tablesRes.rows.map(r => r.table_name));

        // 3. Count rows in research table
        const countRes = await db.query('SELECT COUNT(*) as count FROM research');
        console.log('Total research papers:', countRes.rows[0].count);

        if (parseInt(countRes.rows[0].count) > 0) {
            const sample = await db.query('SELECT id, title, author_name FROM research LIMIT 5');
            console.log('Sample data:', sample.rows);
        }

    } catch (err) {
        console.error('Check failed:', err.message);
    }
}

verifyDB()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
