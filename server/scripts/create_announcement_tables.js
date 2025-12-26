const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env') });
const db = require('../db/sql');
const fs = require('fs');

async function createTables() {
    console.log('--- Creating Extended Tables (Announcements, Messages, Events) ---');

    const schemaPath = path.join(__dirname, '..', 'database', 'announcements-schema.sql');
    const schemaSql = fs.readFileSync(schemaPath, 'utf8');

    try {
        // Split by semicolons, but be careful with functions/triggers
        // Actually, pg can execute multiple statements if separated by semicolons in a single string
        // but some drivers/setups might have issues. Let's try it in one go first.
        await db.query(schemaSql);
        console.log('Successfully applied announcements-schema.sql');
    } catch (err) {
        console.error('Error applying schema:', err.message);

        // Fallback: try to execute block by block if needed
        // But usually Supabase/pg handles multi-statement strings.
    }
}

createTables()
    .then(() => {
        console.log('Done.');
        process.exit(0);
    })
    .catch(err => {
        console.error('Failed:', err);
        process.exit(1);
    });
