const db = require('../db/sql');
const { validationResult } = require('express-validator');

// Helper: Get user ID from request
const getRequestUserId = (req) => {
    if (req.user && req.user.id) return Number(req.user.id);
    const id = req.headers['x-user-id'];
    return id ? Number(id) : null;
};

exports.reportMaintenanceIssue = async (req, res, next) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ success: false, errors: errors.array() });
        }

        const { classroomId, location, issueType, title, description, priority } = req.body;
        const reportedBy = getRequestUserId(req);

        // Validate: Either classroomId OR location must be provided
        if (!classroomId && !location) {
            return res.status(400).json({ success: false, message: 'Either classroomId or location must be provided' });
        }

        const result = await db.query(
            `INSERT INTO maintenance_issues 
       (classroom_id, location, reported_by_user_id, issue_type, title, description, priority, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, 'reported')
       RETURNING *`,
            [
                classroomId || null,
                location || null,
                reportedBy,
                issueType || 'general',
                title,
                description || '',
                priority || 'medium'
            ]
        );

        res.status(201).json({ success: true, data: result.rows[0] });
    } catch (err) {
        next(err);
    }
};

exports.listMaintenanceIssues = async (req, res, next) => {
    try {
        const userId = getRequestUserId(req);
        const { role } = req.user || {}; // Assuming auth middleware attaches full user

        let queryText = `
      SELECT m.*, u.name as reported_by_name, c.room_number 
      FROM maintenance_issues m
      LEFT JOIN users u ON m.reported_by_user_id = u.id
      LEFT JOIN classrooms c ON m.classroom_id = c.id
      WHERE 1=1
    `;
        const params = [];
        let pIdx = 1;

        // Filter logic: Standard users see only their own issues (unless public view is desired?)
        // Requirement says "report issues around campus and track status", implied publicly or personally.
        // Existing frontend uses "myMaintenanceIssues".
        // Admin/Staff see all.

        // For specific filters passed in query
        if (req.query.status) {
            queryText += ` AND m.status = $${pIdx++}`;
            params.push(req.query.status);
        }

        // If not admin/staff, strictly filter by my issues? 
        // Usually maintenance is public-read or reporter-read. Let's assume reporter-read for "My Reports"
        // But admin dashboard needs all.

        // We'll return ALL issues if the requester is admin/staff.
        // If student/user, we MIGHT return all to show transparency, OR only theirs.
        // The frontend has "myMaintenanceIssues" context variable.
        // Let's implement getting ALL issues, and let frontend filter, OR support ?reportedBy=me

        if (req.query.mine === 'true') {
            queryText += ` AND m.reported_by_user_id = $${pIdx++}`;
            params.push(userId);
        }

        queryText += ` ORDER BY m.created_at DESC`;

        const result = await db.query(queryText, params);

        res.json({ success: true, data: result.rows });
    } catch (err) {
        next(err);
    }
};

exports.updateMaintenanceIssue = async (req, res, next) => {
    try {
        const { issueId } = req.params;
        const { status, resolutionNotes, assignedToUserId } = req.body;

        const updates = [];
        const params = [];
        let pIdx = 1;

        if (status) {
            updates.push(`status = $${pIdx++}`);
            params.push(status);

            if (status === 'resolved') {
                updates.push(`resolved_at = NOW()`);
            }
        }
        if (resolutionNotes !== undefined) {
            updates.push(`resolution_notes = $${pIdx++}`);
            params.push(resolutionNotes);
        }
        if (assignedToUserId !== undefined) {
            updates.push(`assigned_to_user_id = $${pIdx++}`);
            params.push(assignedToUserId);
        }

        if (updates.length === 0) {
            return res.status(400).json({ success: false, message: 'No updates provided' });
        }

        params.push(issueId); // last param for WHERE

        const queryText = `
      UPDATE maintenance_issues 
      SET ${updates.join(', ')}
      WHERE id = $${pIdx}
      RETURNING *
    `;

        const result = await db.query(queryText, params);

        if (result.rowCount === 0) {
            return res.status(404).json({ success: false, message: 'Issue not found' });
        }

        res.json({ success: true, data: result.rows[0] });
    } catch (err) {
        next(err);
    }
};
