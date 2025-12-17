const path = require('path');
const db = require('../db/sql');
const { mapApplicationRowToApi } = require('../middleware/transformers');

function validateApplicationBody(body) {
  const errors = [];
  if (!body.nationalId || !/^\d{16}$/.test(body.nationalId)) errors.push('nationalId must be 16 digits');
  if (body.testScore !== undefined && body.testScore !== '') {
    const s = Number(body.testScore);
    if (!Number.isFinite(s) || s < 0 || s > 100) errors.push('testScore must be number 0-100');
  }
  if (body.gpa !== undefined && body.gpa !== '') {
    const g = Number(body.gpa);
    if (!Number.isFinite(g) || g < 0 || g > 4) errors.push('gpa must be number 0-4');
  }
  if (body.age !== undefined && body.age !== '') {
    const a = Number(body.age);
    if (!Number.isInteger(a) || a < 0) errors.push('age must be a non-negative integer');
  }
  if (body.email) {
    const ok = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(body.email);
    if (!ok) errors.push('email invalid');
  }
  return errors;
}

exports.health = async (req, res) => {
  try {
    await db.query('SELECT 1 as ok');
    return res.json({ mode: 'sql', mongoConnected: false, mongoFailed: true, inMemoryCount: 0 });
  } catch (e) {
    return res.status(500).json({ mode: 'sql', error: e.message });
  }
};

exports.getAllApplications = async (req, res) => {
  try {
    const q = await db.query(
      `SELECT a.*,
        COALESCE(json_agg(DISTINCT jsonb_build_object('document_type', ad.document_type, 'url', ad.url, 'originalName', ad.original_name, 'filename', ad.filename))
          FILTER (WHERE ad.id IS NOT NULL AND ad.document_type='certificate'), '[]') AS certificates,
        COALESCE(json_agg(DISTINCT jsonb_build_object('document_type', ad.document_type, 'url', ad.url, 'originalName', ad.original_name, 'filename', ad.filename))
          FILTER (WHERE ad.id IS NOT NULL AND ad.document_type='document'), '[]') AS documents
      FROM applications a
      LEFT JOIN application_documents ad ON ad.application_id = a.id
      GROUP BY a.id
      ORDER BY a.submitted_at DESC`
    );
    return res.json(q.rows.map(mapApplicationRowToApi));
  } catch (err) {
    console.error('[apps:list]', err);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.getApplicationById = async (req, res) => {
  try {
    const key = req.params.id;
    const isNationalId = /^\d{16}$/.test(key);
    const where = isNationalId ? 'a.national_id=$1' : 'a.id=$1::int';
    const q = await db.query(
      `SELECT a.*,
        COALESCE(json_agg(DISTINCT jsonb_build_object('document_type', ad.document_type, 'url', ad.url, 'originalName', ad.original_name, 'filename', ad.filename))
          FILTER (WHERE ad.id IS NOT NULL AND ad.document_type='certificate'), '[]') AS certificates,
        COALESCE(json_agg(DISTINCT jsonb_build_object('document_type', ad.document_type, 'url', ad.url, 'originalName', ad.original_name, 'filename', ad.filename))
          FILTER (WHERE ad.id IS NOT NULL AND ad.document_type='document'), '[]') AS documents
       FROM applications a
       LEFT JOIN application_documents ad ON ad.application_id = a.id
       WHERE ${where}
       GROUP BY a.id`,
      [key]
    );
    if (!q.rowCount) return res.status(404).json({ message: 'Not found' });
    return res.json(mapApplicationRowToApi(q.rows[0]));
  } catch (err) {
    console.error('[apps:getOne]', err);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.searchByNationalId = async (req, res) => {
  const nationalId = req.query.nationalId;
  if (!nationalId) return res.status(400).json({ message: 'nationalId required' });
  try {
    const q = await db.query('SELECT * FROM applications WHERE national_id=$1', [nationalId]);
    if (!q.rowCount) return res.status(404).json({ message: 'Not found' });
    return res.json(mapApplicationRowToApi(q.rows[0]));
  } catch (err) {
    console.error('[apps:search]', err);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.createApplication = async (req, res) => {
  try {
    const body = req.body || {};
    const files = req.files || {};
    const errors = validateApplicationBody(body);
    if (errors.length) return res.status(400).json({ message: 'Validation failed', errors });

    const nationalId = String(body.nationalId || '');
    const exists = await db.query('SELECT 1 FROM applications WHERE national_id=$1', [nationalId]);
    if (exists.rowCount) return res.status(409).json({ message: 'nationalId already exists' });

    const idPhotoFile = files.idPhoto && files.idPhoto[0];
    const selfieFile = files.selfiePhoto && files.selfiePhoto[0];
    const certFiles = files.certificates || [];

    const ins = await db.query(
      `INSERT INTO applications(student_name, email, phone_number, applied_program, gpa, test_score, age, national_id, id_photo, selfie_photo, application_status, submitted_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
       RETURNING *`,
      [
        body.studentName || '',
        body.email || '',
        body.phoneNumber || '',
        body.appliedProgram || '',
        body.gpa !== undefined && body.gpa !== '' ? Number(body.gpa) : 0,
        body.testScore !== undefined && body.testScore !== '' ? Number(body.testScore) : 0,
        body.age !== undefined && body.age !== '' ? Number(body.age) : 0,
        nationalId,
        idPhotoFile ? `/uploads/${idPhotoFile.filename}` : '',
        selfieFile ? `/uploads/${selfieFile.filename}` : '',
        body.applicationStatus || 'pending',
        body.submittedAt || new Date(),
      ]
    );

    const app = ins.rows[0];
    // documents
    const docs = [];
    for (const f of certFiles) {
      docs.push({
        document_type: 'certificate',
        url: `/uploads/${f.filename}`,
        original_name: f.originalname,
        filename: f.filename,
      });
    }
    for (const d of docs) {
      await db.query(
        `INSERT INTO application_documents(application_id, document_type, url, original_name, filename)
         VALUES ($1,$2,$3,$4,$5)`,
        [app.id, d.document_type, d.url, d.original_name, d.filename]
      );
    }

    // Return full aggregate
    const q = await db.query(
      `SELECT a.*,
        COALESCE(json_agg(DISTINCT jsonb_build_object('document_type', ad.document_type, 'url', ad.url, 'originalName', ad.original_name, 'filename', ad.filename))
          FILTER (WHERE ad.id IS NOT NULL AND ad.document_type='certificate'), '[]') AS certificates,
        COALESCE(json_agg(DISTINCT jsonb_build_object('document_type', ad.document_type, 'url', ad.url, 'originalName', ad.original_name, 'filename', ad.filename))
          FILTER (WHERE ad.id IS NOT NULL AND ad.document_type='document'), '[]') AS documents
       FROM applications a
       LEFT JOIN application_documents ad ON ad.application_id = a.id
       WHERE a.id=$1
       GROUP BY a.id`,
      [app.id]
    );
    return res.status(201).json(mapApplicationRowToApi(q.rows[0]));
  } catch (err) {
    console.error('[apps:create]', err);
    res.status(500).json({ message: 'Upload failed', error: err.message });
  }
};

exports.updateApplicationStatus = async (req, res) => {
  try {
    const id = req.params.id;
    const { status, note } = req.body || {};
    if (!status) return res.status(400).json({ message: 'status is required' });
    const isNationalId = /^\d{16}$/.test(id);
    const find = await db.query(isNationalId ? 'SELECT id, email FROM applications WHERE national_id=$1' : 'SELECT id, email FROM applications WHERE id=$1', [id]);
    if (!find.rowCount) return res.status(404).json({ message: 'Not found' });
    const appId = find.rows[0].id;
    await db.query('UPDATE applications SET application_status=$1 WHERE id=$2', [status, appId]);
    await db.query(
      `INSERT INTO application_activity_logs(application_id, staff_id, action, note)
       VALUES ($1,$2,$3,$4)`,
      [appId, req.user?.id || null, `status:${status}`, note || '']
    );
    const message = `Your application status has been updated to: ${status}`;
    await db.query(
      `INSERT INTO application_notifications(application_id, type, message)
       VALUES ($1,'status-update',$2)`,
      [appId, message]
    );
    const full = await db.query('SELECT * FROM applications WHERE id=$1', [appId]);
    return res.json(mapApplicationRowToApi(full.rows[0]));
  } catch (err) {
    console.error('[apps:updateStatus]', err);
    return res.status(500).json({ message: 'Failed to update status', error: err.message });
  }
};

exports.getActivityLogs = async (req, res) => {
  try {
    const id = req.params.id;
    const isNationalId = /^\d{16}$/.test(id);
    const app = await db.query(isNationalId ? 'SELECT id FROM applications WHERE national_id=$1' : 'SELECT id FROM applications WHERE id=$1', [id]);
    if (!app.rowCount) return res.status(404).json({ message: 'Not found' });
    const logs = await db.query('SELECT action as action, note as note, created_at as timestamp FROM application_activity_logs WHERE application_id=$1 ORDER BY created_at DESC', [app.rows[0].id]);
    return res.json({ activityLogs: logs.rows });
  } catch (err) {
    console.error('[apps:getLogs]', err);
    return res.status(500).json({ message: 'Failed to fetch activity logs', error: err.message });
  }
};
