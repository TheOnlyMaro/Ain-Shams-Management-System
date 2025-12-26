const db = require('../db/sql');

// List leave requests with optional filters
exports.listLeaves = async (req, res) => {
  try {
    const { userId, status } = req.query || {};
    const where = [];
    const params = [];
    let idx = 1;
    if (userId) { where.push(`lr.user_id = $${idx++}`); params.push(Number(userId)); }
    if (status) { where.push(`lr.status = $${idx++}`); params.push(status); }

    const sql = `SELECT lr.*, u.name as user_name, au.name as approver_name
      FROM leave_requests lr
      LEFT JOIN users u ON u.id = lr.user_id
      LEFT JOIN users au ON au.id = lr.approver_id
      ${where.length ? 'WHERE ' + where.join(' AND ') : ''}
      ORDER BY lr.created_at DESC`;
    const q = await db.query(sql, params);
    return res.json({ success: true, data: q.rows });
  } catch (err) {
    console.error('[leaves:list]', err);
    return res.status(500).json({ message: 'Server error' });
  }
};

exports.getLeave = async (req, res) => {
  try {
    const id = Number(req.params.leaveId);
    if (!Number.isInteger(id)) return res.status(400).json({ message: 'Invalid id' });
    const q = await db.query('SELECT * FROM leave_requests WHERE id=$1', [id]);
    if (!q.rowCount) return res.status(404).json({ message: 'Not found' });
    return res.json({ success: true, data: q.rows[0] });
  } catch (err) {
    console.error('[leaves:get]', err);
    return res.status(500).json({ message: 'Server error' });
  }
};

// Create leave request (students/staff create for themselves)
exports.createLeave = async (req, res) => {
  try {
    const b = req.body || {};
    const userId = req.user && req.user.id ? Number(req.user.id) : (b.userId ? Number(b.userId) : null);
    if (!userId) return res.status(401).json({ message: 'Authentication required' });
    if (!b.startDate || !b.endDate) return res.status(400).json({ message: 'startDate and endDate required' });

    const start = new Date(b.startDate);
    const end = new Date(b.endDate);
    if (isNaN(start.getTime()) || isNaN(end.getTime()) || start >= end) return res.status(400).json({ message: 'Invalid date range' });

    const ins = await db.query(
      `INSERT INTO leave_requests(user_id, start_date, end_date, leave_type, reason, status)
       VALUES ($1,$2,$3,$4,$5,'pending') RETURNING *`,
      [userId, start.toISOString(), end.toISOString(), b.leaveType || 'vacation', b.reason || '']
    );
    return res.status(201).json({ success: true, data: ins.rows[0] });
  } catch (err) {
    console.error('[leaves:create]', err);
    return res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// Update leave: approve/deny/cancel or modify dates (role checks)
exports.updateLeave = async (req, res) => {
  try {
    const id = Number(req.params.leaveId);
    if (!Number.isInteger(id)) return res.status(400).json({ message: 'Invalid id' });
    const b = req.body || {};

    const existing = await db.query('SELECT * FROM leave_requests WHERE id=$1', [id]);
    if (!existing.rowCount) return res.status(404).json({ message: 'Not found' });
    const row = existing.rows[0];

    const fields = [];
    const vals = [];
    let idx = 1;
    // allow owner to cancel or modify their own request
    if (b.startDate !== undefined) { fields.push(`start_date=$${idx++}`); vals.push(b.startDate); }
    if (b.endDate !== undefined) { fields.push(`end_date=$${idx++}`); vals.push(b.endDate); }
    if (b.leaveType !== undefined) { fields.push(`leave_type=$${idx++}`); vals.push(b.leaveType); }
    if (b.reason !== undefined) { fields.push(`reason=$${idx++}`); vals.push(b.reason); }

    // Status changes (approve/deny) must be performed by admin/staff
    if (b.status !== undefined) {
      const role = req.user && req.user.role;
      if (role !== 'admin' && role !== 'staff') return res.status(403).json({ message: 'Forbidden: cannot change status' });
      fields.push(`status=$${idx++}`); vals.push(b.status);
      fields.push(`approver_id=$${idx++}`); vals.push(req.user.id || null);
      if (b.approverNote !== undefined) { fields.push(`approver_note=$${idx++}`); vals.push(b.approverNote); }
    }

    if (fields.length) {
      vals.push(id);
      await db.query(`UPDATE leave_requests SET ${fields.join(', ')}, updated_at=CURRENT_TIMESTAMP WHERE id=$${idx}`, vals);
    }

    const q = await db.query('SELECT * FROM leave_requests WHERE id=$1', [id]);
    return res.json({ success: true, data: q.rows[0] });
  } catch (err) {
    console.error('[leaves:update]', err);
    return res.status(500).json({ message: 'Server error', error: err.message });
  }
};

exports.deleteLeave = async (req, res) => {
  try {
    const id = Number(req.params.leaveId);
    if (!Number.isInteger(id)) return res.status(400).json({ message: 'Invalid id' });
    const existing = await db.query('SELECT * FROM leave_requests WHERE id=$1', [id]);
    if (!existing.rowCount) return res.status(404).json({ message: 'Not found' });
    const row = existing.rows[0];
    const role = req.user && req.user.role;
    const userId = req.user && req.user.id;
    // owner or admin/staff can delete/cancel
    if (Number(row.user_id) !== Number(userId) && role !== 'admin' && role !== 'staff') return res.status(403).json({ message: 'Forbidden' });
    await db.query('DELETE FROM leave_requests WHERE id=$1', [id]);
    return res.status(204).send();
  } catch (err) {
    console.error('[leaves:delete]', err);
    return res.status(500).json({ message: 'Server error' });
  }
};

module.exports = exports;
