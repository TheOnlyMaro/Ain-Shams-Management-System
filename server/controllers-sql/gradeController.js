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

const mapGradeRow = (row) => {
  if (!row) return null;
  return {
    id: row.id,
    courseId: row.course_id,
    assignmentId: row.assignment_id,
    studentId: row.student_id,
    studentName: row.student_name || '',
    studentEmail: row.student_email || '',
    points: Number(row.points) || 0,
    feedback: row.feedback || '',
    assignmentTitle: row.assignment_title || '',
    assignmentTotalPoints: Number(row.assignment_total_points) || 0,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
};

// List grades with optional filters (courseId, assignmentId, studentId)
exports.listGrades = async (req, res, next) => {
  try {
    const { courseId, assignmentId, studentId } = req.query || {};
    const role = getRequestRole(req);
    const userId = req.user ? Number(req.user.id || req.user._id) : null;

    // Students can only see their own grades
    if (role === 'student' && userId) {
      // Override studentId filter to ensure they only see their own
      const where = ['g.student_id = $1'];
      const params = [userId];
      let paramIdx = 2;

      if (courseId) {
        const cid = Number(courseId);
        if (!Number.isInteger(cid)) {
          return res.status(400).json({ success: false, message: 'Invalid courseId' });
        }
        where.push(`g.course_id = $${paramIdx++}`);
        params.push(cid);
      }

      if (assignmentId) {
        const aid = Number(assignmentId);
        if (!Number.isInteger(aid)) {
          return res.status(400).json({ success: false, message: 'Invalid assignmentId' });
        }
        where.push(`g.assignment_id = $${paramIdx++}`);
        params.push(aid);
      }

      const q = await db.query(
        `SELECT g.*, u.name AS student_name, u.email AS student_email, 
                a.title AS assignment_title, a.total_points AS assignment_total_points
         FROM grades g
         LEFT JOIN users u ON u.id = g.student_id
         LEFT JOIN assignments a ON a.id = g.assignment_id
         WHERE ${where.join(' AND ')}
         ORDER BY g.updated_at DESC, g.created_at DESC`,
        params
      );
      return res.json({ success: true, data: q.rows.map(mapGradeRow) });
    }

    // Staff/Admin can see all grades with filters
    const where = [];
    const params = [];
    let paramIdx = 1;

    if (courseId) {
      const cid = Number(courseId);
      if (!Number.isInteger(cid)) {
        return res.status(400).json({ success: false, message: 'Invalid courseId' });
      }
      where.push(`g.course_id = $${paramIdx++}`);
      params.push(cid);
    }

    if (assignmentId) {
      const aid = Number(assignmentId);
      if (!Number.isInteger(aid)) {
        return res.status(400).json({ success: false, message: 'Invalid assignmentId' });
      }
      where.push(`g.assignment_id = $${paramIdx++}`);
      params.push(aid);
    }

    if (studentId) {
      const sid = Number(studentId);
      if (!Number.isInteger(sid)) {
        return res.status(400).json({ success: false, message: 'Invalid studentId' });
      }
      where.push(`g.student_id = $${paramIdx++}`);
      params.push(sid);
    }

    const sql = `SELECT g.*, u.name AS student_name, u.email AS student_email, 
                        a.title AS assignment_title, a.total_points AS assignment_total_points
                 FROM grades g
                 LEFT JOIN users u ON u.id = g.student_id
                 LEFT JOIN assignments a ON a.id = g.assignment_id
                 ${where.length ? 'WHERE ' + where.join(' AND ') : ''}
                 ORDER BY g.updated_at DESC, g.created_at DESC`;

    const q = await db.query(sql, params);
    res.json({ success: true, data: q.rows.map(mapGradeRow) });
  } catch (err) {
    next(err);
  }
};

// Get grade by ID
exports.getGradeById = async (req, res, next) => {
  try {
    const id = Number(req.params.gradeId);
    if (!Number.isInteger(id)) {
      return res.status(400).json({ success: false, message: 'Invalid grade id' });
    }

    const q = await db.query(
      `SELECT g.*, u.name AS student_name, u.email AS student_email, 
              a.title AS assignment_title, a.total_points AS assignment_total_points
       FROM grades g
       LEFT JOIN users u ON u.id = g.student_id
       LEFT JOIN assignments a ON a.id = g.assignment_id
       WHERE g.id=$1`,
      [id]
    );

    if (!q.rowCount) {
      return res.status(404).json({ success: false, message: 'Grade not found' });
    }

    // Authorization: Students can only see their own grades
    const role = getRequestRole(req);
    const grade = mapGradeRow(q.rows[0]);
    if (role === 'student' && req.user) {
      const userId = Number(req.user.id || req.user._id);
      if (grade.studentId !== userId) {
        return res.status(403).json({ success: false, message: 'Forbidden: You can only view your own grades' });
      }
    }

    res.json({ success: true, data: grade });
  } catch (err) {
    next(err);
  }
};

// Create grade (for grading an assignment)
exports.createGrade = async (req, res, next) => {
  try {
    ensureRole(req, ['admin', 'staff']);
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const { courseId, assignmentId, studentId, points, feedback } = req.body || {};
    const cid = Number(courseId);
    const aid = Number(assignmentId);
    const sid = Number(studentId);

    if (!Number.isInteger(cid) || !Number.isInteger(aid) || !Number.isInteger(sid)) {
      return res.status(400).json({ success: false, message: 'Invalid ids' });
    }

    // Verify assignment exists and get total points
    const assignment = await db.query('SELECT * FROM assignments WHERE id=$1', [aid]);
    if (!assignment.rowCount) {
      return res.status(404).json({ success: false, message: 'Assignment not found' });
    }

    // Verify course matches assignment
    if (assignment.rows[0].course_id !== cid) {
      return res.status(400).json({ success: false, message: 'Course ID does not match assignment course' });
    }

    // Verify student exists
    const student = await db.query('SELECT id FROM users WHERE id=$1', [sid]);
    if (!student.rowCount) {
      return res.status(404).json({ success: false, message: 'Student not found' });
    }

    const pts = Number(points) || 0;
    const totalPoints = Number(assignment.rows[0].total_points) || 0;

    // Check if points exceed total points
    if (pts > totalPoints) {
      return res.status(400).json({
        success: false,
        message: `Points cannot exceed total points (${totalPoints})`,
      });
    }

    // Upsert grade (update if exists, insert if not)
    const gr = await db.query(
      `INSERT INTO grades(course_id, assignment_id, student_id, points, feedback)
       VALUES($1,$2,$3,$4,$5)
       ON CONFLICT (assignment_id, student_id) 
       DO UPDATE SET points=EXCLUDED.points, feedback=EXCLUDED.feedback, updated_at=CURRENT_TIMESTAMP
       RETURNING *`,
      [cid, aid, sid, pts, feedback || '']
    );

    // Return full object with joins
    const q = await db.query(
      `SELECT g.*, u.name AS student_name, u.email AS student_email, 
              a.title AS assignment_title, a.total_points AS assignment_total_points
       FROM grades g
       LEFT JOIN users u ON u.id = g.student_id
       LEFT JOIN assignments a ON a.id = g.assignment_id
       WHERE g.id=$1`,
      [gr.rows[0].id]
    );

    res.status(201).json({ success: true, data: mapGradeRow(q.rows[0]) });
  } catch (err) {
    next(err);
  }
};

// Update grade
exports.updateGrade = async (req, res, next) => {
  try {
    ensureRole(req, ['admin', 'staff']);
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const id = Number(req.params.gradeId);
    if (!Number.isInteger(id)) {
      return res.status(400).json({ success: false, message: 'Invalid grade id' });
    }

    const { points, feedback } = req.body || {};

    // Check if grade exists and get assignment info
    const existing = await db.query(
      `SELECT g.*, a.total_points 
       FROM grades g
       LEFT JOIN assignments a ON a.id = g.assignment_id
       WHERE g.id=$1`,
      [id]
    );

    if (!existing.rowCount) {
      return res.status(404).json({ success: false, message: 'Grade not found' });
    }

    const totalPoints = Number(existing.rows[0].total_points) || 0;

    // If points are being updated, verify they don't exceed total
    if (points !== undefined) {
      const pts = Number(points) || 0;
      if (pts > totalPoints) {
        return res.status(400).json({
          success: false,
          message: `Points cannot exceed total points (${totalPoints})`,
        });
      }
    }

    // Build update query dynamically
    const updates = [];
    const values = [];
    let paramIdx = 1;

    if (points !== undefined) {
      updates.push(`points = $${paramIdx++}`);
      values.push(Number(points) || 0);
    }

    if (feedback !== undefined) {
      updates.push(`feedback = $${paramIdx++}`);
      values.push(feedback || '');
    }

    if (updates.length === 0) {
      // No updates provided, just return existing
      const q = await db.query(
        `SELECT g.*, u.name AS student_name, u.email AS student_email, 
                a.title AS assignment_title, a.total_points AS assignment_total_points
         FROM grades g
         LEFT JOIN users u ON u.id = g.student_id
         LEFT JOIN assignments a ON a.id = g.assignment_id
         WHERE g.id=$1`,
        [id]
      );
      return res.json({ success: true, data: mapGradeRow(q.rows[0]) });
    }

    values.push(id);
    const sql = `UPDATE grades SET ${updates.join(', ')}, updated_at=CURRENT_TIMESTAMP WHERE id=$${paramIdx} RETURNING *`;

    const upd = await db.query(sql, values);

    // Return full object with joins
    const q = await db.query(
      `SELECT g.*, u.name AS student_name, u.email AS student_email, 
              a.title AS assignment_title, a.total_points AS assignment_total_points
       FROM grades g
       LEFT JOIN users u ON u.id = g.student_id
       LEFT JOIN assignments a ON a.id = g.assignment_id
       WHERE g.id=$1`,
      [id]
    );

    res.json({ success: true, data: mapGradeRow(q.rows[0]) });
  } catch (err) {
    next(err);
  }
};

// Delete grade
exports.deleteGrade = async (req, res, next) => {
  try {
    ensureRole(req, ['admin', 'staff']);
    const id = Number(req.params.gradeId);
    if (!Number.isInteger(id)) {
      return res.status(400).json({ success: false, message: 'Invalid grade id' });
    }

    const del = await db.query('DELETE FROM grades WHERE id=$1', [id]);
    if (!del.rowCount) {
      return res.status(404).json({ success: false, message: 'Grade not found' });
    }

    res.status(204).send();
  } catch (err) {
    next(err);
  }
};

