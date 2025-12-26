const db = require('../db/sql');

exports.listResourceTypes = async (req, res) => {
  try {
    const q = await db.query('SELECT * FROM resource_types ORDER BY name ASC');
    return res.json({ success: true, data: q.rows });
  } catch (err) {
    console.error('[resourceTypes:list]', err);
    return res.status(500).json({ message: 'Server error' });
  }
};

exports.getResourceType = async (req, res) => {
  try {
    const id = Number(req.params.typeId);
    if (!Number.isInteger(id)) return res.status(400).json({ message: 'Invalid id' });
    const q = await db.query('SELECT * FROM resource_types WHERE id=$1', [id]);
    if (!q.rowCount) return res.status(404).json({ message: 'Not found' });
    return res.json({ success: true, data: q.rows[0] });
  } catch (err) {
    console.error('[resourceTypes:get]', err);
    return res.status(500).json({ message: 'Server error' });
  }
};

exports.createResourceType = async (req, res) => {
  try {
    const b = req.body || {};
    if (!b.name) return res.status(400).json({ message: 'name is required' });
    const exists = await db.query('SELECT 1 FROM resource_types WHERE name=$1', [b.name]);
    if (exists.rowCount) return res.status(409).json({ message: 'Resource type already exists' });
    const ins = await db.query('INSERT INTO resource_types(name, description) VALUES ($1,$2) RETURNING *', [b.name, b.description || '']);
    return res.status(201).json({ success: true, data: ins.rows[0] });
  } catch (err) {
    console.error('[resourceTypes:create]', err);
    return res.status(500).json({ message: 'Server error', error: err.message });
  }
};

exports.updateResourceType = async (req, res) => {
  try {
    const id = Number(req.params.typeId);
    if (!Number.isInteger(id)) return res.status(400).json({ message: 'Invalid id' });
    const b = req.body || {};
    const existing = await db.query('SELECT * FROM resource_types WHERE id=$1', [id]);
    if (!existing.rowCount) return res.status(404).json({ message: 'Not found' });
    const fields = [];
    const vals = [];
    let idx = 1;
    if (b.name !== undefined) { fields.push(`name=$${idx++}`); vals.push(b.name); }
    if (b.description !== undefined) { fields.push(`description=$${idx++}`); vals.push(b.description); }
    if (fields.length) {
      vals.push(id);
      const sql = `UPDATE resource_types SET ${fields.join(', ')}, created_at=COALESCE(created_at, CURRENT_TIMESTAMP) WHERE id=$${idx} RETURNING *`;
      const up = await db.query(sql, vals);
      return res.json({ success: true, data: up.rows[0] });
    }
    return res.json({ success: true, data: existing.rows[0] });
  } catch (err) {
    console.error('[resourceTypes:update]', err);
    if (err.code === '23505') return res.status(409).json({ message: 'Name conflict' });
    return res.status(500).json({ message: 'Server error', error: err.message });
  }
};

module.exports = exports;
