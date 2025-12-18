const db = require('../db/sql');
const { validationResult } = require('express-validator');
const { mapCourseRowToApi, mapCourseApiToSql } = require('../middleware/transformers');

const getRequestRole = (req) => req.headers['x-user-role'] || (req.user && req.user.role) || null;
const ensureRole = (req, expected) => {
  const role = getRequestRole(req);
  if (role !== expected) {
    const err = new Error('Forbidden');
    err.statusCode = 403;
    throw err;
  }
};

const baseCourseSelect = `
SELECT c.*, 
  COALESCE(json_agg(DISTINCT jsonb_build_object(
    'title', cm.title, 'type', cm.type, 'fileUrl', cm.file_url,
    'fileSize', cm.file_size, 'uploadedBy', cm.uploaded_by,
    'uploadedAt', cm.uploaded_at, 'description', cm.description
  )) FILTER (WHERE cm.id IS NOT NULL), '[]') AS materials,
  COALESCE(array_agg(DISTINCT t.name) FILTER (WHERE t.id IS NOT NULL), ARRAY[]::varchar[]) AS tags,
  COALESCE(array_agg(DISTINCT ce.student_id) FILTER (WHERE ce.id IS NOT NULL), ARRAY[]::int[]) AS student_ids
FROM courses c
LEFT JOIN course_materials cm ON cm.course_id = c.id
LEFT JOIN course_tags ct ON ct.course_id = c.id
LEFT JOIN tags t ON t.id = ct.tag_id
LEFT JOIN course_enrollments ce ON ce.course_id = c.id`;

exports.listCourses = async (req, res, next) => {
  try {
    const { search } = req.query || {};
    const where = [];
    const params = [];
    if (search) {
      params.push(`%${search}%`);
      params.push(`%${search}%`);
      params.push(`%${search}%`);
      where.push('(c.name ILIKE $1 OR c.code ILIKE $2 OR c.description ILIKE $3)');
    }
    const sql = `${baseCourseSelect} ${where.length ? 'WHERE ' + where.join(' AND ') : ''} GROUP BY c.id ORDER BY c.created_at DESC`;
    const q = await db.query(sql, params);
    const data = q.rows.map(mapCourseRowToApi);
    res.json({ success: true, data });
  } catch (err) { next(err); }
};

exports.createCourse = async (req, res, next) => {
  try {
    ensureRole(req, 'admin');
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ success: false, errors: errors.array() });

    const c = mapCourseApiToSql(req.body || {});
    const ins = await db.query(
      `INSERT INTO courses(code, name, description, instructor_name, instructor_email, schedule, location, credits, capacity, enrolled, status, department, level, semester)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)
       RETURNING *`,
      [c.code, c.name, c.description, c.instructor_name, c.instructor_email, c.schedule, c.location, c.credits, c.capacity, c.enrolled, c.status, c.department, c.level, c.semester]
    );
    res.status(201).json({ success: true, data: mapCourseRowToApi(ins.rows[0]) });
  } catch (err) {
    if (err.code === '23505') { // unique_violation
      err.statusCode = 409; err.message = 'Course code already exists';
    }
    next(err);
  }
};

exports.getCourseById = async (req, res, next) => {
  try {
    const id = Number(req.params.courseId);
    const q = await db.query(`${baseCourseSelect} WHERE c.id=$1 GROUP BY c.id`, [id]);
    if (!q.rowCount) return res.status(404).json({ success: false, message: 'Course not found' });
    res.json({ success: true, data: mapCourseRowToApi(q.rows[0]) });
  } catch (err) { next(err); }
};

exports.updateCourse = async (req, res, next) => {
  try {
    ensureRole(req, 'admin');
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ success: false, errors: errors.array() });
    
    const id = Number(req.params.courseId);
    
    // Fetch existing course to check existence
    const existing = await db.query('SELECT * FROM courses WHERE id=$1', [id]);
    if (!existing.rowCount) return res.status(404).json({ success: false, message: 'Course not found' });
    
    // Prepare dynamic update
    const updates = [];
    const values = [];
    let idx = 1;
    
    const mappings = {
      code: 'code',
      name: 'name',
      description: 'description',
      instructorName: 'instructor_name', // Handle both aliases
      instructor: 'instructor_name',
      instructorEmail: 'instructor_email',
      schedule: 'schedule',
      location: 'location',
      credits: 'credits',
      capacity: 'capacity',
      enrolled: 'enrolled',
      status: 'status',
      'metadata.department': 'department',
      'metadata.level': 'level',
      'metadata.semester': 'semester'
    };

    const body = req.body || {};
    
    // Helper to get nested value
    const getValue = (obj, path) => path.split('.').reduce((o, k) => (o || {})[k], obj);

    Object.keys(mappings).forEach(key => {
      const val = getValue(body, key);
      if (val !== undefined) {
        updates.push(`${mappings[key]}=$${idx++}`);
        values.push(val);
      }
    });

    if (updates.length === 0) {
      // No updates provided, just return existing
      const q = await db.query(`${baseCourseSelect} WHERE c.id=$1 GROUP BY c.id`, [id]);
      return res.json({ success: true, data: mapCourseRowToApi(q.rows[0]) });
    }

    values.push(id);
    const sql = `UPDATE courses SET ${updates.join(', ')}, updated_at=CURRENT_TIMESTAMP WHERE id=$${idx} RETURNING *`;
    
    const upd = await db.query(sql, values);
    
    // Return full object with joins
    const q = await db.query(`${baseCourseSelect} WHERE c.id=$1 GROUP BY c.id`, [id]);
    res.json({ success: true, data: mapCourseRowToApi(q.rows[0]) });
  } catch (err) { next(err); }
};

exports.getEnrolledCourses = async (req, res, next) => {
  try {
    const studentId = Number(req.params.studentId);
    if (!Number.isInteger(studentId)) return res.status(400).json({ success: false, message: 'Invalid student id' });
    
    // Check if requester is authorized to view these courses (admin or the student themselves)
    const requesterRole = getRequestRole(req);
    const requesterId = req.user ? (req.user.id || req.user._id) : null;
    
    // Allow admin or the student themselves
    if (requesterRole !== 'admin') {
       // If we have req.user, check ID. If not authenticated, fail (handled by middleware usually, but check here too)
       if (!req.user) return res.status(401).json({ success: false, message: 'Unauthorized' });
       if (Number(requesterId) !== studentId) return res.status(403).json({ success: false, message: 'Forbidden' });
    }

    const sql = `${baseCourseSelect} 
                 INNER JOIN course_enrollments ce_filter ON ce_filter.course_id = c.id 
                 WHERE ce_filter.student_id = $1 
                 GROUP BY c.id 
                 ORDER BY c.created_at DESC`;
                 
    const q = await db.query(sql, [studentId]);
    const data = q.rows.map(mapCourseRowToApi);
    res.json({ success: true, data });
  } catch (err) { next(err); }
};

exports.deleteCourse = async (req, res, next) => {
  try {
    ensureRole(req, 'admin');
    const id = Number(req.params.courseId);
    const del = await db.query('DELETE FROM courses WHERE id=$1', [id]);
    if (!del.rowCount) return res.status(404).json({ success: false, message: 'Course not found' });
    res.status(204).send();
  } catch (err) { next(err); }
};

exports.getCourseDetails = async (req, res, next) => {
  try {
    const id = Number(req.params.courseId);
    const c = await db.query(`${baseCourseSelect} WHERE c.id=$1 GROUP BY c.id`, [id]);
    if (!c.rowCount) return res.status(404).json({ success: false, message: 'Course not found' });
    const a = await db.query('SELECT * FROM assignments WHERE course_id=$1 ORDER BY due_date ASC', [id]);
    res.json({ success: true, data: { course: mapCourseRowToApi(c.rows[0]), assignments: a.rows } });
  } catch (err) { next(err); }
};

exports.enrollStudent = async (req, res, next) => {
  try {
    const id = Number(req.params.courseId);
    const { studentId } = req.body || {};
    const sid = Number(studentId);
    if (!Number.isInteger(sid)) return res.status(400).json({ success: false, message: 'Invalid student id' });
    const exists = await db.query('SELECT 1 FROM course_enrollments WHERE course_id=$1 AND student_id=$2', [id, sid]);
    if (exists.rowCount) return res.status(409).json({ success: false, message: 'Student already enrolled in this course' });
    await db.query('INSERT INTO course_enrollments(course_id, student_id) VALUES ($1,$2)', [id, sid]);
    await db.query('UPDATE courses SET enrolled = (SELECT COUNT(*) FROM course_enrollments WHERE course_id=$1) WHERE id=$1', [id]);
    const q = await db.query(`${baseCourseSelect} WHERE c.id=$1 GROUP BY c.id`, [id]);
    res.json({ success: true, data: mapCourseRowToApi(q.rows[0]) });
  } catch (err) { next(err); }
};

exports.unenrollStudent = async (req, res, next) => {
  try {
    const id = Number(req.params.courseId);
    const { studentId } = req.body || {};
    const sid = Number(studentId);
    if (!Number.isInteger(sid)) return res.status(400).json({ success: false, message: 'Invalid student id' });
    const del = await db.query('DELETE FROM course_enrollments WHERE course_id=$1 AND student_id=$2', [id, sid]);
    if (!del.rowCount) return res.status(404).json({ success: false, message: 'Student is not enrolled in this course' });
    await db.query('UPDATE courses SET enrolled = (SELECT COUNT(*) FROM course_enrollments WHERE course_id=$1) WHERE id=$1', [id]);
    const q = await db.query(`${baseCourseSelect} WHERE c.id=$1 GROUP BY c.id`, [id]);
    res.json({ success: true, data: mapCourseRowToApi(q.rows[0]) });
  } catch (err) { next(err); }
};
