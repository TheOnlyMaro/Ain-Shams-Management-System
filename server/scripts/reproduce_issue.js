
const path = require('path');
const { Pool } = require('pg');
require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env') });

const connectionString = process.env.SUPABASE_DB_URL;
if (!connectionString) {
    console.error('SUPABASE_DB_URL is not set');
    process.exit(1);
}

const pool = new Pool({
    connectionString,
    ssl: { rejectUnauthorized: false },
});

async function main() {
    const client = await pool.connect();
    try {
        console.log('Checking if maintenance_issues table exists...');
        const res = await client.query("SELECT to_regclass('public.maintenance_issues') as exists");
        if (!res.rows[0].exists) {
            console.error('Table public.maintenance_issues DOES NOT EXIST.');
            return;
        }
        console.log('Table exists.');

        // Try to insert a row
        console.log('Attempting insert...');
        // We need a user ID. Let's find one.
        const userRes = await client.query('SELECT id FROM users LIMIT 1');
        if (userRes.rowCount === 0) {
            console.error('No users found to use as reporter.');
            return;
        }
        const userId = userRes.rows[0].id;
        console.log('Using user ID:', userId);

        const insertQuery = `
      INSERT INTO maintenance_issues 
       (classroom_id, location, reported_by_user_id, issue_type, title, description, priority, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, 'reported')
       RETURNING *
    `;
        const params = [
            null, // classroomId
            'Test Location',
            userId,
            'general',
            'Test Issue ' + Date.now(),
            'Description',
            'medium'
        ];

        const insertRes = await client.query(insertQuery, params);
        console.log('Insert result:', insertRes.rows[0]);

        // Verify it's there
        const verifyRes = await client.query('SELECT * FROM maintenance_issues WHERE id = $1', [insertRes.rows[0].id]);
        console.log('Verify select:', verifyRes.rows[0]);

        if (verifyRes.rowCount === 1) {
            console.log('SUCCESS: Row inserted and retrieved.');
        } else {
            console.error('FAILURE: Row inserted but not found?');
        }

    } catch (err) {
        console.error('ERROR during reproduction:', err);
    } finally {
        client.release();
        pool.end();
    }
}

main();
