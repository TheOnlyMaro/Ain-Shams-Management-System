const db = require('../db/sql');

// List resources with optional search
exports.listResources = async (req, res) => {
  try {
    const { search } = req.query || {};
    const params = [];
    let where = '';
    if (search) {
      params.push(`%${search}%`);
      where = `WHERE r.name ILIKE $1 OR r.asset_tag ILIKE $1 OR r.serial_number ILIKE $1`;
    }

    const sql = `
      SELECT r.*, rt.name AS resource_type_name,
        (SELECT boolean_value FROM eav_values ev JOIN eav_attributes ea ON ea.id=ev.attribute_id
          WHERE ev.entity_type='resource' AND ev.entity_id=r.id AND ea.attribute_name='isSoftware' LIMIT 1) AS is_software
      FROM resources r
      LEFT JOIN resource_types rt ON rt.id = r.resource_type_id
      ${where}
      ORDER BY r.created_at DESC
    `;

    const q = await db.query(sql, params);
    return res.json({ success: true, data: q.rows });
  } catch (err) {
    console.error('[resources:list]', err);
    return res.status(500).json({ message: 'Server error' });
  }
};

exports.getResource = async (req, res) => {
  try {
    const id = Number(req.params.resourceId);
    if (!Number.isInteger(id)) return res.status(400).json({ message: 'Invalid id' });

    const q = await db.query('SELECT r.*, rt.name AS resource_type_name FROM resources r LEFT JOIN resource_types rt ON rt.id=r.resource_type_id WHERE r.id=$1', [id]);
    if (!q.rowCount) return res.status(404).json({ message: 'Not found' });
    const resource = q.rows[0];

    const metaQ = await db.query(
      `SELECT a.attribute_name, a.data_type,
        CASE a.data_type WHEN 'string' THEN v.string_value WHEN 'integer' THEN v.integer_value::text
          WHEN 'decimal' THEN v.decimal_value::text WHEN 'boolean' THEN v.boolean_value::text
          WHEN 'datetime' THEN to_char(v.datetime_value,'YYYY-MM-DD"T"HH24:MI:SS') WHEN 'json' THEN v.json_value::text END AS value
       FROM eav_values v JOIN eav_attributes a ON a.id=v.attribute_id
       WHERE v.entity_type='resource' AND v.entity_id=$1`,
      [id]
    );
    const attrs = {};
    for (const r of metaQ.rows) attrs[r.attribute_name] = r.value;
    resource.eav = attrs;
    return res.json({ success: true, data: resource });
  } catch (err) {
    console.error('[resources:get]', err);
    return res.status(500).json({ message: 'Server error' });
  }
};

// Helper: upsert EAV for a resource attribute (boolean or datetime)
async function upsertEav(entityId, attributeName, dataType, value) {
  // fetch attribute id
  const a = await db.query('SELECT id FROM eav_attributes WHERE entity_type=$1 AND attribute_name=$2 LIMIT 1', ['resource', attributeName]);
  if (!a.rowCount) return;
  const attrId = a.rows[0].id;
  if (dataType === 'boolean') {
    await db.query(
      `INSERT INTO eav_values(entity_type, entity_id, attribute_id, boolean_value, created_at, updated_at)
       VALUES ('resource',$1,$2,$3,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP)
       ON CONFLICT (entity_type, entity_id, attribute_id) DO UPDATE SET boolean_value=EXCLUDED.boolean_value, updated_at=CURRENT_TIMESTAMP`,
      [entityId, attrId, !!value]
    );
  } else if (dataType === 'datetime') {
    await db.query(
      `INSERT INTO eav_values(entity_type, entity_id, attribute_id, datetime_value, created_at, updated_at)
       VALUES ('resource',$1,$2,$3,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP)
       ON CONFLICT (entity_type, entity_id, attribute_id) DO UPDATE SET datetime_value=EXCLUDED.datetime_value, updated_at=CURRENT_TIMESTAMP`,
      [entityId, attrId, value || null]
    );
  }
}

exports.createResource = async (req, res) => {
  try {
    const b = req.body || {};
    const ins = await db.query(
      `INSERT INTO resources(resource_type_id, name, asset_tag, serial_number, owner_id, department, status, location, metadata)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
      [b.resourceTypeId || null, b.name || '', b.assetTag || '', b.serialNumber || '', b.ownerId || null, b.department || '', b.status || 'available', b.location || '', b.metadata || {}]
    );
    const resource = ins.rows[0];

    // handle common EAV attributes if provided
    if (b.isSoftware !== undefined) await upsertEav(resource.id, 'isSoftware', 'boolean', b.isSoftware);
    if (b.purchaseDate) await upsertEav(resource.id, 'purchaseDate', 'datetime', b.purchaseDate);
    if (b.warrantyUntil) await upsertEav(resource.id, 'warrantyUntil', 'datetime', b.warrantyUntil);

    return res.status(201).json({ success: true, data: resource });
  } catch (err) {
    console.error('[resources:create]', err);
    return res.status(500).json({ message: 'Server error', error: err.message });
  }
};

exports.updateResource = async (req, res) => {
  try {
    const id = Number(req.params.resourceId);
    if (!Number.isInteger(id)) return res.status(400).json({ message: 'Invalid id' });
    const b = req.body || {};

    const existing = await db.query('SELECT * FROM resources WHERE id=$1', [id]);
    if (!existing.rowCount) return res.status(404).json({ message: 'Not found' });

    const fields = [];
    const vals = [];
    let idx = 1;
    const mappings = {
      resourceTypeId: 'resource_type_id',
      name: 'name',
      assetTag: 'asset_tag',
      serialNumber: 'serial_number',
      ownerId: 'owner_id',
      department: 'department',
      status: 'status',
      location: 'location'
    };
    Object.keys(mappings).forEach(k => {
      if (b[k] !== undefined) { fields.push(`${mappings[k]}=$${idx++}`); vals.push(b[k]); }
    });
    if (b.metadata !== undefined) { fields.push(`metadata=$${idx++}`); vals.push(b.metadata); }

    if (fields.length) {
      vals.push(id);
      await db.query(`UPDATE resources SET ${fields.join(', ')}, updated_at=CURRENT_TIMESTAMP WHERE id=$${idx}`, vals);
    }

    // EAV updates
    if (b.isSoftware !== undefined) await upsertEav(id, 'isSoftware', 'boolean', b.isSoftware);
    if (b.purchaseDate !== undefined) await upsertEav(id, 'purchaseDate', 'datetime', b.purchaseDate);
    if (b.warrantyUntil !== undefined) await upsertEav(id, 'warrantyUntil', 'datetime', b.warrantyUntil);

    const q = await db.query('SELECT * FROM resources WHERE id=$1', [id]);
    return res.json({ success: true, data: q.rows[0] });
  } catch (err) {
    console.error('[resources:update]', err);
    return res.status(500).json({ message: 'Server error', error: err.message });
  }
};

exports.deleteResource = async (req, res) => {
  try {
    const id = Number(req.params.resourceId);
    if (!Number.isInteger(id)) return res.status(400).json({ message: 'Invalid id' });
    await db.query('DELETE FROM eav_values WHERE entity_type=$1 AND entity_id=$2', ['resource', id]);
    const d = await db.query('DELETE FROM resources WHERE id=$1', [id]);
    if (!d.rowCount) return res.status(404).json({ message: 'Not found' });
    return res.status(204).send();
  } catch (err) {
    console.error('[resources:delete]', err);
    return res.status(500).json({ message: 'Server error' });
  }
};

module.exports = exports;
