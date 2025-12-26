
const path = require('path');
const { Pool } = require('pg');
require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env') });

const connectionString = process.env.SUPABASE_DB_URL;
const pool = new Pool({ connectionString, ssl: { rejectUnauthorized: false } });

async function main() {
    const client = await pool.connect();
    try {
        console.log('--- Verifying Booking Flow ---');

        // 1. Get a user
        const userRes = await client.query("SELECT id FROM users LIMIT 1");
        const userId = userRes.rows[0].id;
        console.log(`User ID: ${userId}`);

        // 2. Get a classroom
        const roomRes = await client.query("SELECT id FROM classrooms LIMIT 1");
        if (roomRes.rowCount === 0) throw new Error("No classrooms found");
        const roomId = roomRes.rows[0].id;
        console.log(`Classroom ID: ${roomId}`);

        // 3. Create a booking (simulating bookingController logic)
        // We'll just insert directly to see if tables work, but better to hit API if possible.
        // Since we are node script, let's insert direct DB verify first.

        const start = new Date();
        start.setDate(start.getDate() + 1);
        start.setHours(10, 0, 0, 0);
        const end = new Date(start);
        end.setHours(11, 0, 0, 0);

        const insertRes = await client.query(`
      INSERT INTO room_bookings (classroom_id, booked_by_user_id, title, start_time, end_time, status)
      VALUES ($1, $2, 'Test Booking Script', $3, $4, 'pending')
      RETURNING *
    `, [roomId, userId, start, end]);

        console.log('Inserted Booking:', insertRes.rows[0]);

        // 4. Update status
        const updateRes = await client.query(`
        UPDATE room_bookings SET status = 'confirmed' WHERE id = $1 RETURNING *
    `, [insertRes.rows[0].id]);
        console.log('Updated Booking:', updateRes.rows[0]);

        if (updateRes.rows[0].status === 'confirmed') {
            console.log('SUCCESS: Booking flow logic in DB works.');
        } else {
            console.error('FAILURE: Status update failed');
        }

    } catch (err) {
        console.error('Test failed:', err);
    } finally {
        client.release();
        pool.end();
    }
}
main();
