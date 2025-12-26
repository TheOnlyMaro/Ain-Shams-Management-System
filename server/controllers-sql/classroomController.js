const db = require('../db/sql');

const mapClassroomRow = (row) => {
  if (!row) return null;
  return {
    id: row.id,
    roomNumber: row.room_number,
    building: row.building || '',
    floor: Number(row.floor) || 0,
    roomType: row.room_type || 'classroom',
    capacity: Number(row.capacity) || 0,
    amenities: row.amenities || '',
    equipment: row.equipment || '',
    isActive: row.is_active !== false,
    notes: row.notes || '',
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
};

// Helper function to map booking row (used in availability/schedule)
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

// List all classrooms
exports.listClassrooms = async (req, res, next) => {
  try {
    const { building, roomType, isActive } = req.query || {};
    const where = [];
    const params = [];
    let paramIdx = 1;

    if (building) {
      where.push(`building = $${paramIdx++}`);
      params.push(building);
    }

    if (roomType) {
      where.push(`room_type = $${paramIdx++}`);
      params.push(roomType);
    }

    if (isActive !== undefined) {
      where.push(`is_active = $${paramIdx++}`);
      params.push(isActive === 'true' || isActive === true);
    }

    const sql = `SELECT * FROM classrooms ${where.length ? 'WHERE ' + where.join(' AND ') : ''} ORDER BY building, room_number`;
    const q = await db.query(sql, params);
    res.json({ success: true, data: q.rows.map(mapClassroomRow) });
  } catch (err) {
    next(err);
  }
};

// Get classroom by ID
exports.getClassroomById = async (req, res, next) => {
  try {
    const id = Number(req.params.classroomId);
    if (!Number.isInteger(id)) {
      return res.status(400).json({ success: false, message: 'Invalid classroom id' });
    }
    const q = await db.query('SELECT * FROM classrooms WHERE id=$1', [id]);
    if (!q.rowCount) {
      return res.status(404).json({ success: false, message: 'Classroom not found' });
    }
    res.json({ success: true, data: mapClassroomRow(q.rows[0]) });
  } catch (err) {
    next(err);
  }
};

// Get classroom availability for a time range
exports.getClassroomAvailability = async (req, res, next) => {
  try {
    const { classroomId, startTime, endTime, date } = req.query || {};

    if (!startTime || !endTime) {
      return res.status(400).json({ success: false, message: 'startTime and endTime are required' });
    }

    const start = new Date(startTime);
    const end = new Date(endTime);

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return res.status(400).json({ success: false, message: 'Invalid date format' });
    }

    if (start >= end) {
      return res.status(400).json({ success: false, message: 'endTime must be after startTime' });
    }

    let sql, params;

    if (classroomId) {
      // Check availability for specific classroom
      const cid = Number(classroomId);
      if (!Number.isInteger(cid)) {
        return res.status(400).json({ success: false, message: 'Invalid classroom id' });
      }

      // Check for conflicting bookings
      sql = `
        SELECT rb.*, c.room_number, c.building
        FROM room_bookings rb
        JOIN classrooms c ON c.id = rb.classroom_id
        WHERE rb.classroom_id = $1
          AND rb.status = 'confirmed'
          AND (
            (rb.start_time < $2 AND rb.end_time > $3) OR
            (rb.start_time >= $2 AND rb.start_time < $3) OR
            (rb.end_time > $2 AND rb.end_time <= $3)
          )
      `;
      params = [cid, end, start];

      const conflicts = await db.query(sql, params);

      // Get classroom info
      const classroom = await db.query('SELECT * FROM classrooms WHERE id=$1', [cid]);
      if (!classroom.rowCount) {
        return res.status(404).json({ success: false, message: 'Classroom not found' });
      }

      res.json({
        success: true,
        data: {
          classroom: mapClassroomRow(classroom.rows[0]),
          available: conflicts.rowCount === 0,
          conflictingBookings: conflicts.rows.map(mapBookingRow),
        },
      });
    } else {
      // Get all available classrooms for the time range
      sql = `
        SELECT c.*,
          COUNT(rb.id) FILTER (WHERE rb.status = 'confirmed' AND (
            (rb.start_time < $1 AND rb.end_time > $2) OR
            (rb.start_time >= $1 AND rb.start_time < $2) OR
            (rb.end_time > $1 AND rb.end_time <= $2)
          )) AS conflict_count
        FROM classrooms c
        LEFT JOIN room_bookings rb ON rb.classroom_id = c.id
        WHERE c.is_active = TRUE
        GROUP BY c.id
        HAVING COUNT(rb.id) FILTER (WHERE rb.status = 'confirmed' AND (
          (rb.start_time < $1 AND rb.end_time > $2) OR
          (rb.start_time >= $1 AND rb.start_time < $2) OR
          (rb.end_time > $1 AND rb.end_time <= $2)
        )) = 0
        ORDER BY c.building, c.room_number
      `;
      params = [end, start];

      const q = await db.query(sql, params);
      res.json({
        success: true,
        data: {
          availableClassrooms: q.rows.map(mapClassroomRow),
          timeRange: { startTime, endTime },
        },
      });
    }
  } catch (err) {
    next(err);
  }
};

// Get classroom schedule
exports.getClassroomSchedule = async (req, res, next) => {
  try {
    const classroomId = Number(req.params.classroomId);
    if (!Number.isInteger(classroomId)) {
      return res.status(400).json({ success: false, message: 'Invalid classroom id' });
    }

    const { startDate, endDate } = req.query || {};
    let sql, params;

    if (startDate && endDate) {
      // Get schedule for specific date range
      sql = `
        SELECT rb.*, c.room_number, c.building, 
               co.name AS course_name,
               u.name AS booked_by_name
        FROM room_bookings rb
        JOIN classrooms c ON c.id = rb.classroom_id
        LEFT JOIN courses co ON co.id = rb.course_id
        LEFT JOIN users u ON u.id = rb.booked_by_user_id
        WHERE rb.classroom_id = $1
          AND rb.start_time >= $2
          AND rb.end_time <= $3
          AND rb.status != 'cancelled'
        ORDER BY rb.start_time ASC
      `;
      params = [classroomId, startDate, endDate];
    } else {
      // Get all future bookings
      sql = `
        SELECT rb.*, c.room_number, c.building,
               co.name AS course_name,
               u.name AS booked_by_name
        FROM room_bookings rb
        JOIN classrooms c ON c.id = rb.classroom_id
        LEFT JOIN courses co ON co.id = rb.course_id
        LEFT JOIN users u ON u.id = rb.booked_by_user_id
        WHERE rb.classroom_id = $1
          AND rb.end_time >= CURRENT_TIMESTAMP
          AND rb.status != 'cancelled'
        ORDER BY rb.start_time ASC
      `;
      params = [classroomId];
    }

    const q = await db.query(sql, params);

    // Get classroom info
    const classroom = await db.query('SELECT * FROM classrooms WHERE id=$1', [classroomId]);
    if (!classroom.rowCount) {
      return res.status(404).json({ success: false, message: 'Classroom not found' });
    }

    res.json({
      success: true,
      data: {
        classroom: mapClassroomRow(classroom.rows[0]),
        bookings: q.rows.map(mapBookingRow),
      },
    });
  } catch (err) {
    next(err);
  }
};
