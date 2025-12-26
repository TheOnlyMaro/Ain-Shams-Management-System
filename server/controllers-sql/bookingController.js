const db = require('../db/sql');
const { validationResult } = require('express-validator');

const getRequestRole = (req) => req.headers['x-user-role'] || (req.user && req.user.role) || null;
const ensureRole = (req, expected) => {
  const role = getRequestRole(req);
  if (Array.isArray(expected)) {
    if (!expected.includes(role)) {
      const err = new Error('Forbidden');
      err.statusCode = 403;
      throw err;
    }
  } else {
    if (role !== expected) {
      const err = new Error('Forbidden');
      err.statusCode = 403;
      throw err;
    }
  }
};

const mapBookingRow = (row) => {
  if (!row) return null;
  return {
    id: row.id,
    classroomId: row.classroom_id,
    classroomNumber: row.room_number || '',
    building: row.building || '',
    courseId: row.course_id || null,
    courseName: row.course_name || '',
    bookedByUserId: row.booked_by_user_id,
    bookedByName: row.booked_by_name || '',
    title: row.title || '',
    description: row.description || '',
    startTime: row.start_time,
    endTime: row.end_time,
    bookingType: row.booking_type || 'course',
    status: row.status || 'confirmed',
    recurringPattern: row.recurring_pattern || 'none',
    recurringUntil: row.recurring_until,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
};

// Create booking
exports.createBooking = async (req, res, next) => {
  try {
    ensureRole(req, ['admin', 'staff']);
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const { classroomId, courseId, title, description, startTime, endTime, bookingType, recurringPattern, recurringUntil } = req.body || {};
    const cid = Number(classroomId);
    const userId = req.user ? Number(req.user.id || req.user._id) : null;

    if (!Number.isInteger(cid)) {
      return res.status(400).json({ success: false, message: 'Invalid classroom id' });
    }

    if (!userId) {
      return res.status(401).json({ success: false, message: 'User not authenticated' });
    }

    // Verify classroom exists and is active
    const classroom = await db.query('SELECT * FROM classrooms WHERE id=$1', [cid]);
    if (!classroom.rowCount) {
      return res.status(404).json({ success: false, message: 'Classroom not found' });
    }
    if (!classroom.rows[0].is_active) {
      return res.status(400).json({ success: false, message: 'Classroom is not active' });
    }

    const start = new Date(startTime);
    const end = new Date(endTime);

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return res.status(400).json({ success: false, message: 'Invalid date format' });
    }

    if (start >= end) {
      return res.status(400).json({ success: false, message: 'endTime must be after startTime' });
    }

    // Check for conflicts
    const conflicts = await db.query(
      `SELECT id FROM room_bookings 
       WHERE classroom_id = $1 
         AND status = 'confirmed'
         AND (
           (start_time < $2 AND end_time > $3) OR
           (start_time >= $2 AND start_time < $3) OR
           (end_time > $2 AND end_time <= $3)
         )`,
      [cid, end, start]
    );

    if (conflicts.rowCount > 0) {
      return res.status(409).json({ success: false, message: 'Classroom is already booked for this time period' });
    }

    // Create booking (Default to pending so admin can approve)
    const ins = await db.query(
      `INSERT INTO room_bookings(classroom_id, course_id, booked_by_user_id, title, description, start_time, end_time, booking_type, recurring_pattern, recurring_until, status)
       VALUES($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'pending')
       RETURNING *`,
      [cid, courseId || null, userId, title || '', description || '', start, end, bookingType || 'course', recurringPattern || 'none', recurringUntil || '2099-12-31']
    );

    // Return full booking with joins
    const q = await db.query(
      `SELECT rb.*, c.room_number, c.building,
              co.name AS course_name,
              u.name AS booked_by_name
       FROM room_bookings rb
       JOIN classrooms c ON c.id = rb.classroom_id
       LEFT JOIN courses co ON co.id = rb.course_id
       LEFT JOIN users u ON u.id = rb.booked_by_user_id
       WHERE rb.id = $1`,
      [ins.rows[0].id]
    );

    res.status(201).json({ success: true, data: mapBookingRow(q.rows[0]) });
  } catch (err) {
    next(err);
  }
};

// List bookings
exports.listBookings = async (req, res, next) => {
  try {
    const { classroomId, courseId, startDate, endDate, status } = req.query || {};
    const where = [];
    const params = [];
    let paramIdx = 1;

    if (classroomId) {
      const cid = Number(classroomId);
      if (!Number.isInteger(cid)) {
        return res.status(400).json({ success: false, message: 'Invalid classroom id' });
      }
      where.push(`rb.classroom_id = $${paramIdx++}`);
      params.push(cid);
    }

    if (courseId) {
      const coid = Number(courseId);
      if (!Number.isInteger(coid)) {
        return res.status(400).json({ success: false, message: 'Invalid course id' });
      }
      where.push(`rb.course_id = $${paramIdx++}`);
      params.push(coid);
    }

    if (startDate) {
      where.push(`rb.start_time >= $${paramIdx++}`);
      params.push(startDate);
    }

    if (endDate) {
      where.push(`rb.end_time <= $${paramIdx++}`);
      params.push(endDate);
    }

    if (status) {
      where.push(`rb.status = $${paramIdx++}`);
      params.push(status);
    }

    const sql = `
      SELECT rb.*, c.room_number, c.building,
             co.name AS course_name,
             u.name AS booked_by_name
      FROM room_bookings rb
      JOIN classrooms c ON c.id = rb.classroom_id
      LEFT JOIN courses co ON co.id = rb.course_id
      LEFT JOIN users u ON u.id = rb.booked_by_user_id
      ${where.length ? 'WHERE ' + where.join(' AND ') : ''}
      ORDER BY rb.start_time ASC
    `;

    const q = await db.query(sql, params);
    res.json({ success: true, data: q.rows.map(mapBookingRow) });
  } catch (err) {
    next(err);
  }
};

// Cancel booking
exports.cancelBooking = async (req, res, next) => {
  try {
    const bookingId = Number(req.params.bookingId);
    if (!Number.isInteger(bookingId)) {
      return res.status(400).json({ success: false, message: 'Invalid booking id' });
    }

    const userId = req.user ? Number(req.user.id || req.user._id) : null;
    const role = getRequestRole(req);

    // Check if booking exists
    const booking = await db.query('SELECT * FROM room_bookings WHERE id=$1', [bookingId]);
    if (!booking.rowCount) {
      return res.status(404).json({ success: false, message: 'Booking not found' });
    }

    // Only admin/staff or the person who booked can cancel
    if (role !== 'admin' && role !== 'staff' && booking.rows[0].booked_by_user_id !== userId) {
      return res.status(403).json({ success: false, message: 'Forbidden: You can only cancel your own bookings' });
    }

    const upd = await db.query(
      `UPDATE room_bookings SET status='cancelled', updated_at=CURRENT_TIMESTAMP WHERE id=$1 RETURNING *`,
      [bookingId]
    );

    // Return full booking with joins
    const q = await db.query(
      `SELECT rb.*, c.room_number, c.building,
              co.name AS course_name,
              u.name AS booked_by_name
       FROM room_bookings rb
       JOIN classrooms c ON c.id = rb.classroom_id
       LEFT JOIN courses co ON co.id = rb.course_id
       LEFT JOIN users u ON u.id = rb.booked_by_user_id
       WHERE rb.id = $1`,
      [bookingId]
    );

    res.json({ success: true, data: mapBookingRow(q.rows[0]) });
  } catch (err) {
    next(err);
  }
};

// Update booking status (e.g. for approval)
exports.updateBookingStatus = async (req, res, next) => {
  try {
    ensureRole(req, ['admin', 'staff']);
    const bookingId = Number(req.params.bookingId);
    const { status } = req.body;

    if (!['pending', 'confirmed', 'cancelled', 'completed'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid status' });
    }

    const upd = await db.query(
      `UPDATE room_bookings SET status=$1, updated_at=CURRENT_TIMESTAMP WHERE id=$2 RETURNING *`,
      [status, bookingId]
    );

    if (upd.rowCount === 0) {
      return res.status(404).json({ success: false, message: 'Booking not found' });
    }

    res.json({ success: true, data: mapBookingRow(upd.rows[0]) });
  } catch (err) {
    next(err);
  }
};
