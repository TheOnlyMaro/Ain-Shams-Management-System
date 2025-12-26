const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env') });

const db = require('../db/sql');
const fs = require('fs');

async function verifyTables() {
    console.log('--- Verifying Database Tables ---');

    if (!db.pool) {
        console.error('Database pool not initialized. Check your .env file and SUPABASE_DB_URL.');
        return;
    }

    const tablesToCheck = [
        'announcements',
        'messages',
        'announcement_views',
        'events',
        'event_rsvps',
        'parent_student_links'
    ];

    for (const table of tablesToCheck) {
        try {
            const res = await db.query(
                "SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = $1)",
                [table]
            );
            const exists = res.rows[0].exists;
            console.log(`Table '${table}': ${exists ? 'EXISTS' : 'MISSING'}`);
        } catch (err) {
            console.error(`Error checking table '${table}':`, err.message);
        }
    }

    const coreTables = ['assignments', 'grades', 'courses', 'users'];
    for (const table of coreTables) {
        try {
            const res = await db.query(
                "SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = $1)",
                [table]
            );
            console.log(`Core Table '${table}': ${res.rows[0].exists ? 'EXISTS' : 'MISSING'}`);
        } catch (err) {
            console.error(`Error checking core table '${table}':`, err.message);
        }
    }
}

verifyTables()
    .then(() => {
        console.log('Verification complete.');
        process.exit(0);
    })
    .catch(err => {
        console.error('Verification failed:', err);
        process.exit(1);
    });
