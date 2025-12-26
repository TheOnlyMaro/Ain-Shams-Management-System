// helper funnctions
const db = require('../db/sql');
const { validationResult } = require('express-validator');

// Get user role from request (prefer req.user from middleware, fallback to headers)
const getRequestRole = (req) => (req.user && req.user.role) || req.headers['x-user-role'] || null;

// Get user ID from request (prefer req.user from middleware, fallback to headers)
const getRequestUserId = (req) => {
  if (req.user && req.user.id) {
    return Number(req.user.id);
  }
  const id = req.headers['x-user-id'];
  return id ? Number(id) : null;
};

// Get user name from request (prefer req.user from middleware, fallback to headers)
const getRequestUserName = (req) => {
  if (req.user && req.user.name) {
    return req.user.name;
  }
  return req.headers['x-user-name'] || 'Unknown';
};

// Verify user has required role (role check is now handled by middleware, but keep for compatibility)
const ensureRole = (req, ...allowedRoles) => {
  const role = getRequestRole(req);
  if (!role || !allowedRoles.includes(role)) {
    const err = new Error('Forbidden');
    err.statusCode = 403;
    throw err;
  }
};

// Verify student is enrolled in course
const ensureEnrolled = async (req, courseId) => {
  const userId = getRequestUserId(req);
  const result = await db.query(
    'SELECT 1 FROM course_enrollments WHERE course_id=$1 AND student_id=$2',
    [courseId, userId]
  );
  if (!result.rowCount) {
    const err = new Error('You are not enrolled in this course');
    err.statusCode = 403;
    throw err;
  }
};

//upload material POST /courses/:courseId/materials
exports.uploadMaterial = async (req, res, next) => {
  try {
    // Role check is handled by middleware in routes

    // Validate request body
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    // Extract data from request
    console.log('[uploadMaterial] Request:', {
      params: req.params,
      body: req.body,
      user: req.user,
    });
    const courseId = Number(req.params.courseId);
    const { title, type, fileUrl, fileSize, description } = req.body;
    const uploadedBy = getRequestUserName(req);

    // Verify course exists
    const courseCheck = await db.query('SELECT 1 FROM courses WHERE id=$1', [courseId]);
    if (!courseCheck.rowCount) {
      return res.status(404).json({ success: false, message: 'Course not found' });
    }

    // Insert into database
    const result = await db.query(
      `INSERT INTO course_materials (course_id, title, type, file_url, file_size, uploaded_by, description)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id, course_id, title, type, file_url, file_size, uploaded_by, description, uploaded_at`,
      [courseId, title, type, fileUrl, fileSize || '', uploadedBy, description || '']
    );

    // Return created material
    const row = result.rows[0];
    res.status(201).json({
      success: true,
      data: {
        id: row.id,
        courseId: row.course_id,
        title: row.title,
        type: row.type,
        fileUrl: row.file_url,
        fileSize: row.file_size,
        uploadedBy: row.uploaded_by,
        description: row.description,
        uploadedAt: row.uploaded_at
      }
    });
  } catch (err) {
    // Handle database constraint violations
    if (err.code === '23514') { // CHECK constraint (invalid type)
      err.statusCode = 400;
      err.message = 'Invalid material type';
    }
    next(err);
  }
};

/**
 * Get all materials for a course
 * GET /courses/:courseId/materials
 */
exports.getMaterials = async (req, res, next) => {
  try {
    const courseId = Number(req.params.courseId);
    const role = getRequestRole(req);

    // Step 1: Verify course exists
    const courseCheck = await db.query('SELECT 1 FROM courses WHERE id=$1', [courseId]);
    if (!courseCheck.rowCount) {
      return res.status(404).json({ success: false, message: 'Course not found' });
    }

    // Step 2: Students must be enrolled to see materials
    if (role === 'student') {
      await ensureEnrolled(req, courseId);
    }

    // Step 3: Query all materials for this course (newest first)
    const result = await db.query(
      `SELECT id, course_id, title, type, file_url, file_size, uploaded_by, description, uploaded_at
       FROM course_materials
       WHERE course_id=$1
       ORDER BY uploaded_at DESC`,
      [courseId]
    );

    // Step 4: Format and return response
    const materials = result.rows.map(row => ({
      id: row.id,
      courseId: row.course_id,
      title: row.title,
      type: row.type,
      fileUrl: row.file_url,
      fileSize: row.file_size,
      uploadedBy: row.uploaded_by,
      description: row.description,
      uploadedAt: row.uploaded_at
    }));

    res.json({ success: true, data: materials });
  } catch (err) {
    next(err);
  }
};

/**
 * Get a specific material
 * GET /courses/:courseId/materials/:materialId
 */
exports.getMaterialById = async (req, res, next) => {
  try {
    const courseId = Number(req.params.courseId);
    const materialId = Number(req.params.materialId);
    const role = getRequestRole(req);

    // Step 1: Students must be enrolled
    if (role === 'student') {
      await ensureEnrolled(req, courseId);
    }

    // Step 2: Query the specific material
    const result = await db.query(
      `SELECT id, course_id, title, type, file_url, file_size, uploaded_by, description, uploaded_at
       FROM course_materials
       WHERE id=$1 AND course_id=$2`,
      [materialId, courseId]
    );

    // Step 3: Check if material exists
    if (!result.rowCount) {
      return res.status(404).json({ success: false, message: 'Material not found' });
    }

    // Step 4: Format and return
    const row = result.rows[0];
    res.json({
      success: true,
      data: {
        id: row.id,
        courseId: row.course_id,
        title: row.title,
        type: row.type,
        fileUrl: row.file_url,
        fileSize: row.file_size,
        uploadedBy: row.uploaded_by,
        description: row.description,
        uploadedAt: row.uploaded_at
      }
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Download a material (returns file URL)
 * GET /courses/:courseId/materials/:materialId/download
 */
exports.downloadMaterial = async (req, res, next) => {
  try {
    const courseId = Number(req.params.courseId);
    const materialId = Number(req.params.materialId);
    const role = getRequestRole(req);

    // Step 1: Students must be enrolled
    if (role === 'student') {
      await ensureEnrolled(req, courseId);
    }

    // Step 2: Get the material
    const result = await db.query(
      `SELECT id, course_id, title, type, file_url, file_size, uploaded_by, description, uploaded_at
       FROM course_materials
       WHERE id=$1 AND course_id=$2`,
      [materialId, courseId]
    );

    // Step 3: Check if material exists
    if (!result.rowCount) {
      return res.status(404).json({ success: false, message: 'Material not found' });
    }

    // Step 4: Return file URL for download
    const row = result.rows[0];
    res.json({
      success: true,
      data: {
        id: row.id,
        courseId: row.course_id,
        title: row.title,
        type: row.type,
        fileUrl: row.file_url,
        fileSize: row.file_size,
        uploadedBy: row.uploaded_by,
        description: row.description,
        uploadedAt: row.uploaded_at,
        downloadUrl: row.file_url  // Client uses this to download
      }
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Update material metadata (title, type, description)
 * PATCH /courses/:courseId/materials/:materialId
 */
exports.updateMaterial = async (req, res, next) => {
  try {
    // Role check is handled by middleware in routes

    // Step 2: Validate request
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const courseId = Number(req.params.courseId);
    const materialId = Number(req.params.materialId);
    const { title, type, description } = req.body;

    // Step 3: Get current material
    const current = await db.query(
      'SELECT uploaded_by FROM course_materials WHERE id=$1 AND course_id=$2',
      [materialId, courseId]
    );

    if (!current.rowCount) {
      return res.status(404).json({ success: false, message: 'Material not found' });
    }

    // Step 4: Build dynamic UPDATE query (only update provided fields)
    const updates = [];
    const params = [];
    let paramCount = 1;

    if (title !== undefined) {
      updates.push(`title=$${paramCount++}`);
      params.push(title);
    }
    if (type !== undefined) {
      updates.push(`type=$${paramCount++}`);
      params.push(type);
    }
    if (description !== undefined) {
      updates.push(`description=$${paramCount++}`);
      params.push(description);
    }

    // Step 5: Check if there's anything to update
    if (updates.length === 0) {
      return res.status(400).json({ success: false, message: 'No fields to update' });
    }

    // Step 6: Add WHERE clause parameters
    params.push(materialId);
    params.push(courseId);

    // Step 7: Execute update
    const updateSql = `UPDATE course_materials 
                       SET ${updates.join(', ')}
                       WHERE id=$${paramCount++} AND course_id=$${paramCount++}
                       RETURNING id, course_id, title, type, file_url, file_size, uploaded_by, description, uploaded_at`;

    const result = await db.query(updateSql, params);

    // Step 8: Format and return updated material
    const row = result.rows[0];
    res.json({
      success: true,
      data: {
        id: row.id,
        courseId: row.course_id,
        title: row.title,
        type: row.type,
        fileUrl: row.file_url,
        fileSize: row.file_size,
        uploadedBy: row.uploaded_by,
        description: row.description,
        uploadedAt: row.uploaded_at
      }
    });
  } catch (err) {
    if (err.code === '23514') { // CHECK constraint
      err.statusCode = 400;
      err.message = 'Invalid material type';
    }
    next(err);
  }
};

/**
 * Delete a material
 * DELETE /courses/:courseId/materials/:materialId
 */
exports.deleteMaterial = async (req, res, next) => {
  try {
    // Role check is handled by middleware in routes

    const courseId = Number(req.params.courseId);
    const materialId = Number(req.params.materialId);

    // Step 2: Verify material exists before deleting
    const check = await db.query(
      'SELECT 1 FROM course_materials WHERE id=$1 AND course_id=$2',
      [materialId, courseId]
    );

    if (!check.rowCount) {
      return res.status(404).json({ success: false, message: 'Material not found' });
    }

    // Step 3: Delete the material
    await db.query(
      'DELETE FROM course_materials WHERE id=$1 AND course_id=$2',
      [materialId, courseId]
    );

    // Step 4: Return 204 No Content
    res.status(204).send();
  } catch (err) {
    next(err);
  }
};