// server/controllers-sql/announcementController.js
const db = require('../db/sql');

// ============================================================================
// ANNOUNCEMENTS
// ============================================================================

exports.getAllAnnouncements = async (req, res) => {
  try {
    const { category, priority, target_audience, is_pinned, limit = 50, offset = 0 } = req.query;
    const userId = req.user?.id;
    
    let query = `
      SELECT a.*, 
        CASE WHEN av.user_id IS NOT NULL THEN true ELSE false END as is_viewed_by_user
      FROM announcements a
      LEFT JOIN announcement_views av ON a.id = av.announcement_id AND av.user_id = $1
      WHERE a.is_published = true
        AND (a.expiry_date IS NULL OR a.expiry_date > CURRENT_TIMESTAMP)
    `;
    
    const params = [userId];
    let paramCount = 1;
    
    if (category) {
      params.push(category);
      query += ` AND a.category = $${++paramCount}`;
    }
    
    if (priority) {
      params.push(priority);
      query += ` AND a.priority = $${++paramCount}`;
    }
    
    if (target_audience) {
      params.push(target_audience);
      query += ` AND (a.target_audience = $${++paramCount} OR a.target_audience = 'all')`;
    }
    
    if (is_pinned === 'true') {
      query += ` AND a.is_pinned = true`;
    }
    
    query += ` ORDER BY a.is_pinned DESC, a.publish_date DESC LIMIT $${++paramCount} OFFSET $${++paramCount}`;
    params.push(parseInt(limit), parseInt(offset));
    
    const result = await db.query(query, params);
    
    return res.json({
      success: true,
      data: result.rows,
      pagination: {
        limit: parseInt(limit),
        offset: parseInt(offset),
        total: result.rowCount
      }
    });
  } catch (err) {
    console.error('[announcements:list]', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

exports.getAnnouncementById = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;
    
    const result = await db.query(
      `SELECT a.*, 
        CASE WHEN av.user_id IS NOT NULL THEN true ELSE false END as is_viewed_by_user
      FROM announcements a
      LEFT JOIN announcement_views av ON a.id = av.announcement_id AND av.user_id = $2
      WHERE a.id = $1`,
      [id, userId]
    );
    
    if (!result.rowCount) {
      return res.status(404).json({ success: false, message: 'Announcement not found' });
    }
    
    // Mark as viewed
    if (userId) {
      await db.query(
        `INSERT INTO announcement_views (announcement_id, user_id)
         VALUES ($1, $2)
         ON CONFLICT (announcement_id, user_id) DO NOTHING`,
        [id, userId]
      );
    }
    
    return res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    console.error('[announcements:getOne]', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

exports.createAnnouncement = async (req, res) => {
  try {
    const {
      title,
      content,
      priority = 'medium',
      category = 'general',
      target_audience = 'all',
      specific_courses,
      specific_users,
      event_date,
      event_location,
      event_end_date,
      publish_date,
      expiry_date,
      is_pinned = false,
      tags,
      attachments
    } = req.body;
    
    const author_id = req.user?.id;
    const author_name = req.user?.name || 'System';
    const author_role = req.user?.role || 'admin';
    
    const result = await db.query(
      `INSERT INTO announcements (
        title, content, author_id, author_name, author_role,
        priority, category, target_audience,
        specific_courses, specific_users,
        event_date, event_location, event_end_date,
        publish_date, expiry_date, is_pinned, tags, attachments
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)
      RETURNING *`,
      [
        title, content, author_id, author_name, author_role,
        priority, category, target_audience,
        specific_courses, specific_users,
        event_date, event_location, event_end_date,
        publish_date || new Date(), expiry_date, is_pinned,
        tags || [], JSON.stringify(attachments || [])
      ]
    );
    
    return res.status(201).json({ success: true, data: result.rows[0] });
  } catch (err) {
    console.error('[announcements:create]', err);
    res.status(500).json({ success: false, message: 'Failed to create announcement' });
  }
};

exports.updateAnnouncement = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    
    const fields = [];
    const values = [];
    let paramCount = 1;
    
    Object.keys(updates).forEach(key => {
      if (['title', 'content', 'priority', 'category', 'target_audience', 'is_pinned', 'expiry_date'].includes(key)) {
        fields.push(`${key} = $${paramCount++}`);
        values.push(updates[key]);
      }
    });
    
    if (fields.length === 0) {
      return res.status(400).json({ success: false, message: 'No valid fields to update' });
    }
    
    values.push(id);
    const query = `UPDATE announcements SET ${fields.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = $${paramCount} RETURNING *`;
    
    const result = await db.query(query, values);
    
    if (!result.rowCount) {
      return res.status(404).json({ success: false, message: 'Announcement not found' });
    }
    
    return res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    console.error('[announcements:update]', err);
    res.status(500).json({ success: false, message: 'Failed to update announcement' });
  }
};

exports.deleteAnnouncement = async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await db.query('DELETE FROM announcements WHERE id = $1', [id]);
    
    if (!result.rowCount) {
      return res.status(404).json({ success: false, message: 'Announcement not found' });
    }
    
    return res.status(204).send();
  } catch (err) {
    console.error('[announcements:delete]', err);
    res.status(500).json({ success: false, message: 'Failed to delete announcement' });
  }
};

// ============================================================================
// MESSAGES
// ============================================================================

exports.getMessages = async (req, res) => {
  try {
    const userId = req.user?.id;
    const { type = 'inbox', limit = 50, offset = 0 } = req.query;
    
    let query = `
      SELECT m.*,
        sender.name as sender_name,
        sender.role_id as sender_role_id,
        recipient.name as recipient_name,
        recipient.role_id as recipient_role_id
      FROM messages m
      JOIN users sender ON m.sender_id = sender.id
      JOIN users recipient ON m.recipient_id = recipient.id
      WHERE m.parent_message_id IS NULL
    `;
    
    if (type === 'inbox') {
      query += ` AND m.recipient_id = $1 AND m.is_archived = false`;
    } else if (type === 'sent') {
      query += ` AND m.sender_id = $1 AND m.is_archived = false`;
    } else if (type === 'archived') {
      query += ` AND (m.sender_id = $1 OR m.recipient_id = $1) AND m.is_archived = true`;
    }
    
    query += ` ORDER BY m.created_at DESC LIMIT $2 OFFSET $3`;
    
    const result = await db.query(query, [userId, parseInt(limit), parseInt(offset)]);
    
    return res.json({
      success: true,
      data: result.rows,
      pagination: { limit: parseInt(limit), offset: parseInt(offset) }
    });
  } catch (err) {
    console.error('[messages:list]', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

exports.getMessageThread = async (req, res) => {
  try {
    const { threadId } = req.params;
    const userId = req.user?.id;
    
    const result = await db.query(
      `SELECT m.*,
        sender.name as sender_name,
        recipient.name as recipient_name
      FROM messages m
      JOIN users sender ON m.sender_id = sender.id
      JOIN users recipient ON m.recipient_id = recipient.id
      WHERE m.thread_id = $1
        AND (m.sender_id = $2 OR m.recipient_id = $2)
      ORDER BY m.created_at ASC`,
      [threadId, userId]
    );
    
    // Mark messages as read
    await db.query(
      `UPDATE messages
       SET is_read = true, read_at = CURRENT_TIMESTAMP
       WHERE thread_id = $1 AND recipient_id = $2 AND is_read = false`,
      [threadId, userId]
    );
    
    return res.json({ success: true, data: result.rows });
  } catch (err) {
    console.error('[messages:thread]', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

exports.sendMessage = async (req, res) => {
  try {
    const {
      recipient_id,
      subject,
      body,
      parent_message_id,
      message_type = 'direct',
      priority = 'normal',
      related_course_id,
      related_student_id,
      attachments
    } = req.body;
    
    const sender_id = req.user?.id;
    
    const result = await db.query(
      `INSERT INTO messages (
        sender_id, recipient_id, subject, body,
        parent_message_id, message_type, priority,
        related_course_id, related_student_id, attachments
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *`,
      [
        sender_id, recipient_id, subject, body,
        parent_message_id, message_type, priority,
        related_course_id, related_student_id,
        JSON.stringify(attachments || [])
      ]
    );
    
    return res.status(201).json({ success: true, data: result.rows[0] });
  } catch (err) {
    console.error('[messages:send]', err);
    res.status(500).json({ success: false, message: 'Failed to send message' });
  }
};

exports.markMessageRead = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;
    
    const result = await db.query(
      `UPDATE messages
       SET is_read = true, read_at = CURRENT_TIMESTAMP
       WHERE id = $1 AND recipient_id = $2
       RETURNING *`,
      [id, userId]
    );
    
    if (!result.rowCount) {
      return res.status(404).json({ success: false, message: 'Message not found' });
    }
    
    return res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    console.error('[messages:markRead]', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ============================================================================
// EVENTS
// ============================================================================

exports.getEvents = async (req, res) => {
  try {
    const { start_date, end_date, event_type, target_audience } = req.query;
    
    let query = 'SELECT * FROM events WHERE 1=1';
    const params = [];
    let paramCount = 0;
    
    if (start_date) {
      params.push(start_date);
      query += ` AND start_date >= $${++paramCount}`;
    }
    
    if (end_date) {
      params.push(end_date);
      query += ` AND end_date <= $${++paramCount}`;
    }
    
    if (event_type) {
      params.push(event_type);
      query += ` AND event_type = $${++paramCount}`;
    }
    
    if (target_audience) {
      params.push(target_audience);
      query += ` AND (target_audience = $${++paramCount} OR target_audience = 'all')`;
    }
    
    query += ' ORDER BY start_date ASC';
    
    const result = await db.query(query, params);
    
    return res.json({ success: true, data: result.rows });
  } catch (err) {
    console.error('[events:list]', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

exports.createEvent = async (req, res) => {
  try {
    const {
      title,
      description,
      event_type,
      start_date,
      end_date,
      all_day = false,
      location,
      is_online = false,
      meeting_link,
      target_audience = 'all',
      requires_rsvp = false,
      max_attendees
    } = req.body;
    
    const organizer_id = req.user?.id;
    
    const result = await db.query(
      `INSERT INTO events (
        title, description, event_type, start_date, end_date,
        all_day, location, is_online, meeting_link,
        target_audience, organizer_id, requires_rsvp, max_attendees
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      RETURNING *`,
      [
        title, description, event_type, start_date, end_date,
        all_day, location, is_online, meeting_link,
        target_audience, organizer_id, requires_rsvp, max_attendees
      ]
    );
    
    return res.status(201).json({ success: true, data: result.rows[0] });
  } catch (err) {
    console.error('[events:create]', err);
    res.status(500).json({ success: false, message: 'Failed to create event' });
  }
};

exports.rsvpEvent = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const userId = req.user?.id;
    
    const result = await db.query(
      `INSERT INTO event_rsvps (event_id, user_id, status)
       VALUES ($1, $2, $3)
       ON CONFLICT (event_id, user_id)
       DO UPDATE SET status = $3, response_date = CURRENT_TIMESTAMP
       RETURNING *`,
      [id, userId, status]
    );
    
    return res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    console.error('[events:rsvp]', err);
    res.status(500).json({ success: false, message: 'Failed to RSVP' });
  }
};