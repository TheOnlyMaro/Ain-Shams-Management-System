
const path = require('path');
const { Pool } = require('pg');
require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env') });

const connectionString = process.env.SUPABASE_DB_URL;
const pool = new Pool({ connectionString, ssl: { rejectUnauthorized: false } });

async function main() {
    const client = await pool.connect();
    try {
        console.log('--- Creating room_bookings table ---');

        await client.query(`
      CREATE TABLE IF NOT EXISTS room_bookings (
        id SERIAL PRIMARY KEY,
        classroom_id INTEGER NOT NULL REFERENCES classrooms(id) ON DELETE CASCADE,
        course_id INTEGER REFERENCES courses(id) ON DELETE SET NULL,
        booked_by_user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        title VARCHAR(255) NOT NULL,
        description TEXT NOT NULL DEFAULT '',
        start_time TIMESTAMP NOT NULL,
        end_time TIMESTAMP NOT NULL,
        booking_type VARCHAR(50) NOT NULL DEFAULT 'course' CHECK (booking_type IN ('course', 'event', 'meeting', 'exam', 'other')),
        status VARCHAR(50) NOT NULL DEFAULT 'confirmed' CHECK (status IN ('pending', 'confirmed', 'cancelled', 'completed')),
        recurring_pattern VARCHAR(50) NOT NULL DEFAULT 'none' CHECK (recurring_pattern IN ('none', 'daily', 'weekly', 'monthly')),
        recurring_until TIMESTAMP NOT NULL DEFAULT '2099-12-31',
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CHECK (end_time > start_time)
      );
    `);
        console.log('Table room_bookings created (if not exists).');

        console.log('--- Creating indexes ---');
        await client.query(`CREATE INDEX IF NOT EXISTS idx_room_bookings_classroom_id ON room_bookings(classroom_id);`);
        await client.query(`CREATE INDEX IF NOT EXISTS idx_room_bookings_course_id ON room_bookings(course_id);`);
        await client.query(`CREATE INDEX IF NOT EXISTS idx_room_bookings_booked_by ON room_bookings(booked_by_user_id);`);
        await client.query(`CREATE INDEX IF NOT EXISTS idx_room_bookings_start_time ON room_bookings(start_time);`);
        await client.query(`CREATE INDEX IF NOT EXISTS idx_room_bookings_end_time ON room_bookings(end_time);`);
        await client.query(`CREATE INDEX IF NOT EXISTS idx_room_bookings_status ON room_bookings(status);`);
        await client.query(`CREATE INDEX IF NOT EXISTS idx_room_bookings_time_range ON room_bookings(classroom_id, start_time, end_time) WHERE status = 'confirmed';`);

        console.log('Indexes created.');
        console.log('SUCCESS');

    } catch (err) {
        console.error('Failed to create table:', err);
    } finally {
        client.release();
        pool.end();
    }
}
main();
