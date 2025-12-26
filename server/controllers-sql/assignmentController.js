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

const mapAssignmentRow = (row) => {
  if (!row) return null;
  return {
    id: row.id,
    title: row.title,
    description: row.description || '',
    dueDate: row.due_date,
    totalPoints: Number(row.total_points) || 0,
    courseId: row.course_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
};

exports.listAssignments = async (req, res, next) => {
  try {
    const { courseId } = req.query || {};
    if (courseId) {
      const cid = Number(courseId);
      if (!Number.isInteger(cid))
        return res.status(400).json({ success: false, message: 'Invalid courseId' });

      const q = await db.query('SELECT * FROM assignments WHERE course_id=$1 ORDER BY due_date ASC', [cid]);
      return res.json({ success: true, data: q.rows.map(mapAssignmentRow) });
    }

    const q = await db.query('SELECT * FROM assignments ORDER BY due_date ASC');
    res.json({ success: true, data: q.rows.map(mapAssignmentRow) });
  } catch (err) { next(err); }
};

exports.getAssignmentById = async (req, res, next) => {
  try {
    const id = Number(req.params.assignmentId);
    if (!Number.isInteger(id)) return res.status(400).json({ success: false, message: 'Invalid assignment id' });
    const q = await db.query('SELECT * FROM assignments WHERE id=$1', [id]);
    if (!q.rowCount) return res.status(404).json({ success: false, message: 'Assignment not found' });
    res.json({ success: true, data: mapAssignmentRow(q.rows[0]) });
  } catch (err) { next(err); }
};

exports.createAssignment = async (req, res, next) => {
  try {
    ensureRole(req, ['admin', 'staff']);
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ success: false, errors: errors.array() });

    const { courseId, title, description, dueDate, totalPoints } = req.body || {};
    console.log('[assignmentController] creating assignment:', { courseId, title, dueDate, totalPoints });
    const cid = Number(courseId);
    if (!Number.isInteger(cid)) {
      console.warn('[assignmentController] invalid course id:', courseId);
      return res.status(400).json({ success: false, message: 'Invalid course id' });
    }

    // ensure course exists
    const course = await db.query('SELECT 1 FROM courses WHERE id=$1', [cid]);
    if (!course.rowCount) {
      console.warn('[assignmentController] course not found:', cid);
      return res.status(404).json({ success: false, message: 'Course not found' });
    }

    const ins = await db.query(
      `INSERT INTO assignments(course_id, title, description, due_date, total_points)
       VALUES($1,$2,$3,$4,$5) RETURNING *`,
      [cid, title, description || '', dueDate, Number(totalPoints) || 0]
    );
    console.log('[assignmentController] assignment created:', ins.rows[0].id);
    res.status(201).json({ success: true, data: mapAssignmentRow(ins.rows[0]) });
  } catch (err) {
    console.error('[assignmentController] create error:', err);
    next(err);
  }
};

exports.updateAssignment = async (req, res, next) => {
  try {
    ensureRole(req, ['admin', 'staff']);
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ success: false, errors: errors.array() });

    const id = Number(req.params.assignmentId);
    if (!Number.isInteger(id)) return res.status(400).json({ success: false, message: 'Invalid assignment id' });
    const { title, description, dueDate, totalPoints } = req.body || {};

    const upd = await db.query(
      `UPDATE assignments SET title=$1, description=$2, due_date=$3, total_points=$4, updated_at=CURRENT_TIMESTAMP
       WHERE id=$5 RETURNING *`,
      [title, description || '', dueDate, Number(totalPoints) || 0, id]
    );
    if (!upd.rowCount) return res.status(404).json({ success: false, message: 'Assignment not found' });
    res.json({ success: true, data: mapAssignmentRow(upd.rows[0]) });
  } catch (err) { next(err); }
};

exports.deleteAssignment = async (req, res, next) => {
  try {
    ensureRole(req, ['admin', 'staff']);
    const id = Number(req.params.assignmentId);
    if (!Number.isInteger(id)) return res.status(400).json({ success: false, message: 'Invalid assignment id' });
    const del = await db.query('DELETE FROM assignments WHERE id=$1', [id]);
    if (!del.rowCount) return res.status(404).json({ success: false, message: 'Assignment not found' });
    res.status(204).send();
  } catch (err) { next(err); }
};

// Marks a student submission by creating/updating a grades row with zero points (acts as a submission record)
exports.submitAssignment = async (req, res, next) => {
  try {
    ensureRole(req, 'student');
    const id = Number(req.params.assignmentId);
    const { studentId } = req.body || {};
    const sid = Number(studentId);
    if (!Number.isInteger(id) || !Number.isInteger(sid)) return res.status(400).json({ success: false, message: 'Invalid ids' });

    // ensure assignment exists
    const a = await db.query('SELECT * FROM assignments WHERE id=$1', [id]);
    if (!a.rowCount) return res.status(404).json({ success: false, message: 'Assignment not found' });

    // upsert a grades row with zero points to indicate submission
    const up = await db.query(
      `INSERT INTO grades(course_id, assignment_id, student_id, points, feedback)
       VALUES($1,$2,$3,$4,$5)
       ON CONFLICT (assignment_id, student_id) DO UPDATE SET updated_at=CURRENT_TIMESTAMP
       RETURNING *`,
      [a.rows[0].course_id, id, sid, 0, '']
    );
    res.status(200).json({ success: true, data: up.rows[0] });
  } catch (err) { next(err); }
};

// Grade (or update grade) for an assignment for a student
exports.gradeAssignment = async (req, res, next) => {
  try {
    ensureRole(req, ['admin', 'staff']);
    const id = Number(req.params.assignmentId);
    const { studentId, points, feedback } = req.body || {};
    const sid = Number(studentId);
    if (!Number.isInteger(id) || !Number.isInteger(sid))
      return res.status(400).json({ success: false, message: 'Invalid ids' });

    // ensure assignment exists
    const a = await db.query('SELECT * FROM assignments WHERE id=$1', [id]);
    if (!a.rowCount)
      return res.status(404).json({ success: false, message: 'Assignment not found' });

    const pts = Number(points) || 0;
    const gr = await db.query(
      `INSERT INTO grades(course_id, assignment_id, student_id, points, feedback)
       VALUES($1,$2,$3,$4,$5)
       ON CONFLICT (assignment_id, student_id) DO UPDATE SET points=EXCLUDED.points, feedback=EXCLUDED.feedback, updated_at=CURRENT_TIMESTAMP
       RETURNING *`,
      [a.rows[0].course_id, id, sid, pts, feedback || '']
    );
    res.json({ success: true, data: gr.rows[0] });
  } catch (err) { next(err); }
};
