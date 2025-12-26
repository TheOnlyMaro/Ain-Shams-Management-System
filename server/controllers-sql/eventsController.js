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

// Map database row to API response format
const mapEventRow = (row) => {
  if (!row) return null;
  return {
    id: row.id,
    title: row.title || '',
    description: row.description || '',
    eventDate: row.event_date,
    location: row.location || '',
    eventType: row.event_type || 'event',
    status: row.status || 'published',
    createdByUserId: row.created_by_user_id,
    createdByName: row.created_by_name || '',
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
};

// Map API request body to SQL format
const mapEventApiToSql = (body) => ({
  title: body.title || '',
  description: body.description || '',
  event_date: body.eventDate || body.event_date,
  location: body.location || '',
  event_type: body.eventType || body.event_type || 'event',
  status: body.status || 'published',
});

// List events (all users can view published events)
exports.listEvents = async (req, res, next) => {
  try {
    const { eventType, status, startDate, endDate, search } = req.query || {};
    const where = [];
    const params = [];
    let paramIdx = 1;

    // By default, only show published events to non-admins
    const role = getRequestRole(req);
    if (role !== 'admin') {
      where.push(`e.status = 'published'`);
    } else if (status) {
      where.push(`e.status = $${paramIdx++}`);
      params.push(status);
    }

    if (eventType) {
      where.push(`e.event_type = $${paramIdx++}`);
      params.push(eventType);
    }

    if (startDate) {
      where.push(`e.event_date >= $${paramIdx++}`);
      params.push(startDate);
    }

    if (endDate) {
      where.push(`e.event_date <= $${paramIdx++}`);
      params.push(endDate);
    }

    if (search) {
      where.push(`(e.title ILIKE $${paramIdx} OR e.description ILIKE $${paramIdx})`);
      params.push(`%${search}%`);
      paramIdx++;
    }

    const sql = `
      SELECT e.*, u.name AS created_by_name
      FROM events e
      LEFT JOIN users u ON u.id = e.created_by_user_id
      ${where.length ? 'WHERE ' + where.join(' AND ') : ''}
      ORDER BY e.event_date ASC, e.created_at DESC
    `;

    const q = await db.query(sql, params);
    res.json({ success: true, data: q.rows.map(mapEventRow) });
  } catch (err) {
    next(err);
  }
};

// Get event by ID
exports.getEventById = async (req, res, next) => {
  try {
    const id = Number(req.params.eventId);
    if (!Number.isInteger(id)) {
      return res.status(400).json({ success: false, message: 'Invalid event id' });
    }

    const role = getRequestRole(req);
    const whereClause = role === 'admin' ? 'e.id = $1' : 'e.id = $1 AND e.status = $2';
    const params = role === 'admin' ? [id] : [id, 'published'];

    const sql = `
      SELECT e.*, u.name AS created_by_name
      FROM events e
      LEFT JOIN users u ON u.id = e.created_by_user_id
      WHERE ${whereClause}
    `;

    const q = await db.query(sql, params);
    if (!q.rowCount) {
      return res.status(404).json({ success: false, message: 'Event not found' });
    }

    res.json({ success: true, data: mapEventRow(q.rows[0]) });
  } catch (err) {
    next(err);
  }
};

// Create event (admin only)
exports.createEvent = async (req, res, next) => {
  try {
    ensureRole(req, 'admin');
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const userId = req.user ? Number(req.user.id || req.user._id) : null;
    if (!userId) {
      return res.status(401).json({ success: false, message: 'User not authenticated' });
    }

    const event = mapEventApiToSql(req.body || {});
    const eventDate = new Date(event.event_date);
    
    if (isNaN(eventDate.getTime())) {
      return res.status(400).json({ success: false, message: 'Invalid event date format' });
    }

    const ins = await db.query(
      `INSERT INTO events(title, description, event_date, location, event_type, status, created_by_user_id)
       VALUES($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [event.title, event.description, eventDate, event.location, event.event_type, event.status, userId]
    );

    // Return full event with creator name
    const q = await db.query(
      `SELECT e.*, u.name AS created_by_name
       FROM events e
       LEFT JOIN users u ON u.id = e.created_by_user_id
       WHERE e.id = $1`,
      [ins.rows[0].id]
    );

    res.status(201).json({ success: true, data: mapEventRow(q.rows[0]) });
  } catch (err) {
    next(err);
  }
};

// Update event (admin only)
exports.updateEvent = async (req, res, next) => {
  try {
    ensureRole(req, 'admin');
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const id = Number(req.params.eventId);
    if (!Number.isInteger(id)) {
      return res.status(400).json({ success: false, message: 'Invalid event id' });
    }

    // Check if event exists
    const existing = await db.query('SELECT * FROM events WHERE id=$1', [id]);
    if (!existing.rowCount) {
      return res.status(404).json({ success: false, message: 'Event not found' });
    }

    // Prepare dynamic update
    const updates = [];
    const values = [];
    let idx = 1;

    const body = req.body || {};
    const mappings = {
      title: 'title',
      description: 'description',
      eventDate: 'event_date',
      location: 'location',
      eventType: 'event_type',
      status: 'status',
    };

    for (const [apiKey, dbKey] of Object.entries(mappings)) {
      if (body[apiKey] !== undefined || body[dbKey] !== undefined) {
        const value = body[apiKey] !== undefined ? body[apiKey] : body[dbKey];
        
        if (dbKey === 'event_date') {
          const eventDate = new Date(value);
          if (isNaN(eventDate.getTime())) {
            return res.status(400).json({ success: false, message: 'Invalid event date format' });
          }
          updates.push(`${dbKey} = $${idx++}`);
          values.push(eventDate);
        } else {
          updates.push(`${dbKey} = $${idx++}`);
          values.push(value);
        }
      }
    }

    if (updates.length === 0) {
      return res.status(400).json({ success: false, message: 'No fields to update' });
    }

    updates.push(`updated_at = CURRENT_TIMESTAMP`);
    values.push(id);

    const sql = `UPDATE events SET ${updates.join(', ')} WHERE id = $${idx} RETURNING *`;
    const upd = await db.query(sql, values);

    // Return full event with creator name
    const q = await db.query(
      `SELECT e.*, u.name AS created_by_name
       FROM events e
       LEFT JOIN users u ON u.id = e.created_by_user_id
       WHERE e.id = $1`,
      [id]
    );

    res.json({ success: true, data: mapEventRow(q.rows[0]) });
  } catch (err) {
    next(err);
  }
};

// Delete event (admin only)
exports.deleteEvent = async (req, res, next) => {
  try {
    ensureRole(req, 'admin');

    const id = Number(req.params.eventId);
    if (!Number.isInteger(id)) {
      return res.status(400).json({ success: false, message: 'Invalid event id' });
    }

    const existing = await db.query('SELECT * FROM events WHERE id=$1', [id]);
    if (!existing.rowCount) {
      return res.status(404).json({ success: false, message: 'Event not found' });
    }

    await db.query('DELETE FROM events WHERE id=$1', [id]);
    res.json({ success: true, message: 'Event deleted successfully' });
  } catch (err) {
    next(err);
  }
};