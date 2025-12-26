const express = require('express');
const { body, param, query } = require('express-validator');

const { authenticate, authorizeRole, optionalAuthenticate } = require('../middleware/authMiddleware');
const assignmentController = require('../controllers-sql/assignmentController');
const validateRequest = require('../middleware/validateRequest');

const router = express.Router();

// List assignments (optional ?courseId=)
router.get('/assignments', optionalAuthenticate, [query('courseId').optional().isInt()], validateRequest, assignmentController.listAssignments);

// Create assignment (admin/staff expected)
router.post('/assignments',
	authenticate,
	authorizeRole(['admin', 'staff']),
	[
		body('courseId').isInt(),
		body('title').isString().trim().notEmpty(),
		body('description').optional().isString(),
		body('dueDate').isISO8601(),
		body('totalPoints').isInt({ min: 1 }),
	],
	validateRequest,
	assignmentController.createAssignment
);

// Get single assignment
router.get('/assignments/:assignmentId', optionalAuthenticate, [param('assignmentId').isInt()], validateRequest, assignmentController.getAssignmentById);

// Update assignment (admin/staff expected)
router.patch('/assignments/:assignmentId',
	authenticate,
	authorizeRole(['admin', 'staff']),
	[
		param('assignmentId').isInt(),
		body('title').optional().isString().trim(),
		body('description').optional().isString(),
		body('dueDate').optional().isISO8601(),
		body('totalPoints').optional().isInt({ min: 1 }),
	],
	validateRequest,
	assignmentController.updateAssignment
);

// Delete assignment (admin/staff expected)
router.delete('/assignments/:assignmentId',
	authenticate,
	authorizeRole(['admin', 'staff']),
	[param('assignmentId').isInt()],
	validateRequest,
	assignmentController.deleteAssignment
);

// Student submits assignment
router.post('/assignments/:assignmentId/submit',
	authenticate,
	authorizeRole('student'),
	[param('assignmentId').isInt(), body('studentId').isInt()],
	validateRequest,
	assignmentController.submitAssignment
);

// Grade assignment (admin/staff expected)
router.post('/assignments/:assignmentId/grade',
	authenticate,
	authorizeRole(['admin', 'staff']),
	[
		param('assignmentId').isInt(),
		body('studentId').isInt(),
		body('points').isFloat({ min: 0 }),
		body('feedback').optional().isString(),
	],
	validateRequest,
	assignmentController.gradeAssignment
);

module.exports = router;

