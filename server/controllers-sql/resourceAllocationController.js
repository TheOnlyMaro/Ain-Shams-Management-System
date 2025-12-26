const db = require('../db/sql');

exports.listAllocations = async (req, res) => {
  try {
    const { resourceId, userId } = req.query || {};
    const where = [];
    const params = [];
    let idx = 1;
    if (resourceId) { where.push(`ra.resource_id = $${idx++}`); params.push(Number(resourceId)); }
    if (userId) { where.push(`ra.allocated_to_user_id = $${idx++}`); params.push(Number(userId)); }

    const sql = `
      SELECT ra.*, r.name as resource_name, r.asset_tag, u.name as allocated_to_name
      FROM resource_allocations ra
      LEFT JOIN resources r ON r.id = ra.resource_id
      LEFT JOIN users u ON u.id = ra.allocated_to_user_id
      ${where.length ? 'WHERE ' + where.join(' AND ') : ''}
      ORDER BY ra.allocated_at DESC
    `;
    const q = await db.query(sql, params);
    return res.json({ success: true, data: q.rows });
  } catch (err) {
    console.error('[allocations:list]', err);
    return res.status(500).json({ message: 'Server error' });
  }
};

exports.getAllocation = async (req, res) => {
  try {
    const id = Number(req.params.allocationId);
    if (!Number.isInteger(id)) return res.status(400).json({ message: 'Invalid id' });
    const q = await db.query('SELECT * FROM resource_allocations WHERE id=$1', [id]);
    if (!q.rowCount) return res.status(404).json({ message: 'Not found' });
    return res.json({ success: true, data: q.rows[0] });
  } catch (err) {
    console.error('[allocations:get]', err);
    return res.status(500).json({ message: 'Server error' });
  }
};

exports.createAllocation = async (req, res) => {
  try {
    const b = req.body || {};
    if (!b.resourceId) return res.status(400).json({ message: 'resourceId required' });
    // determine timestamps
    const allocatedAt = b.allocatedAt || new Date().toISOString();
    const dueBack = b.dueBack || null;

    // fetch resource and isSoftware flag
    const rQ = await db.query(
      `SELECT r.*, (
         SELECT boolean_value FROM eav_values ev JOIN eav_attributes ea ON ea.id=ev.attribute_id
         WHERE ev.entity_type='resource' AND ev.entity_id=r.id AND ea.attribute_name='isSoftware' LIMIT 1
       ) AS is_software
       FROM resources r WHERE r.id=$1 LIMIT 1`,
      [b.resourceId]
    );
    if (!rQ.rowCount) return res.status(404).json({ message: 'Resource not found' });
    const resource = rQ.rows[0];

    // For non-software (hardware) resources, check for overlapping ALLOCATED intervals
    if (!resource.is_software) {
      const overlapQ = await db.query(
        `SELECT COUNT(*)::int as cnt FROM resource_allocations
         WHERE resource_id=$1 AND status='allocated'
           AND tsrange(allocated_at, coalesce(due_back, 'infinity')) && tsrange($2, coalesce($3, 'infinity'))`,
        [b.resourceId, allocatedAt, dueBack]
      );
      if (overlapQ.rows[0].cnt > 0) {
        return res.status(409).json({ message: 'Resource unavailable for requested period' });
      }
    }

    // Determine status: student requests become 'pending' by default
    let status = b.status || 'allocated';
    if (req.user && req.user.role === 'student') status = 'pending';

    const createdBy = (req.user && req.user.id) || b.allocatedBy || null;

    const ins = await db.query(
      `INSERT INTO resource_allocations(resource_id, allocated_to_user_id, allocated_to_department, allocated_by, allocated_at, due_back, status, notes, metadata)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
      [b.resourceId, b.allocatedToUserId || null, b.allocatedToDepartment || '', createdBy, allocatedAt, dueBack, status, b.notes || '', b.metadata || {}]
    );

    // mark resource as allocated only if allocation is actually 'allocated'
    if (status === 'allocated') {
      await db.query('UPDATE resources SET status=$1, updated_at=CURRENT_TIMESTAMP WHERE id=$2', ['allocated', b.resourceId]);
    }

    return res.status(201).json({ success: true, data: ins.rows[0] });
  } catch (err) {
    console.error('[allocations:create]', err);
    return res.status(500).json({ message: 'Server error', error: err.message });
  }
};

exports.updateAllocation = async (req, res) => {
  try {
    const id = Number(req.params.allocationId);
    if (!Number.isInteger(id)) return res.status(400).json({ message: 'Invalid id' });
    const b = req.body || {};

    const existing = await db.query('SELECT * FROM resource_allocations WHERE id=$1', [id]);
    if (!existing.rowCount) return res.status(404).json({ message: 'Not found' });

    const fields = [];
    const vals = [];
    let idx = 1;
    const mappings = {
      allocatedToUserId: 'allocated_to_user_id',
      allocatedToDepartment: 'allocated_to_department',
      allocatedBy: 'allocated_by',
      dueBack: 'due_back',
      returnedAt: 'returned_at',
      status: 'status'
    };
    Object.keys(mappings).forEach(k => {
      if (b[k] !== undefined) { fields.push(`${mappings[k]}=$${idx++}`); vals.push(b[k]); }
    });
    if (b.notes !== undefined) { fields.push(`notes=$${idx++}`); vals.push(b.notes); }
    if (b.metadata !== undefined) { fields.push(`metadata=$${idx++}`); vals.push(b.metadata); }

    if (fields.length) {
      vals.push(id);
      await db.query(`UPDATE resource_allocations SET ${fields.join(', ')}, updated_at=CURRENT_TIMESTAMP WHERE id=$${idx}`, vals);
    }

    // If status changed to returned, update resource status to available
    if (b.status === 'returned') {
      const resId = existing.rows[0].resource_id;
      await db.query('UPDATE resources SET status=$1, updated_at=CURRENT_TIMESTAMP WHERE id=$2', ['available', resId]);
    }

    // If status changed to allocated, ensure no overlapping allocations (for hardware) and set resource status
    if (b.status === 'allocated') {
      const resId = existing.rows[0].resource_id;
      const rQ = await db.query(
        `SELECT (
           SELECT boolean_value FROM eav_values ev JOIN eav_attributes ea ON ea.id=ev.attribute_id
           WHERE ev.entity_type='resource' AND ev.entity_id=r.id AND ea.attribute_name='isSoftware' LIMIT 1
         ) AS is_software FROM resources r WHERE r.id=$1`,
        [resId]
      );
      const isSoftware = rQ.rows[0] && rQ.rows[0].is_software;
      if (!isSoftware) {
        const start = b.allocatedAt || existing.rows[0].allocated_at || new Date().toISOString();
        const end = b.dueBack || existing.rows[0].due_back || null;
        const overlapQ = await db.query(
          `SELECT COUNT(*)::int as cnt FROM resource_allocations
           WHERE resource_id=$1 AND status='allocated' AND id<>$4
             AND tsrange(allocated_at, coalesce(due_back, 'infinity')) && tsrange($2, coalesce($3, 'infinity'))`,
          [resId, start, end, id]
        );
        if (overlapQ.rows[0].cnt > 0) {
          return res.status(409).json({ message: 'Cannot mark allocated: overlapping allocation exists' });
        }
      }
      await db.query('UPDATE resources SET status=$1, updated_at=CURRENT_TIMESTAMP WHERE id=$2', ['allocated', resId]);
    }

    const q = await db.query('SELECT * FROM resource_allocations WHERE id=$1', [id]);
    return res.json({ success: true, data: q.rows[0] });
  } catch (err) {
    console.error('[allocations:update]', err);
    return res.status(500).json({ message: 'Server error', error: err.message });
  }
};

exports.deleteAllocation = async (req, res) => {
  try {
    const id = Number(req.params.allocationId);
    if (!Number.isInteger(id)) return res.status(400).json({ message: 'Invalid id' });
    const d = await db.query('DELETE FROM resource_allocations WHERE id=$1', [id]);
    if (!d.rowCount) return res.status(404).json({ message: 'Not found' });
    return res.status(204).send();
  } catch (err) {
    console.error('[allocations:delete]', err);
    return res.status(500).json({ message: 'Server error' });
  }
};

module.exports = exports;
