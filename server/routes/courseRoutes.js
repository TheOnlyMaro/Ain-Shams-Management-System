const express = require('express');
const { body, param } = require('express-validator');
const { authenticate, authorizeRole, optionalAuthenticate } = require('../middleware/authMiddleware');

// Switch to SQL-based controller; legacy Mongo controller kept for reference
const courseController = require('../controllers-sql/courseController');
const assignmentController = require('../controllers-sql/assignmentController');
const validateRequest = require('../middleware/validateRequest');

const router = express.Router();

const createCourseValidators = [
  body('code').isString().trim().notEmpty(),
  body('name').isString().trim().notEmpty(),
  body('description').isString().trim().notEmpty(),
  body('instructorName').isString().trim().notEmpty(),
  body('schedule').isString().trim().notEmpty(),
  body('credits').isInt({ min: 1, max: 6 }),
  body('capacity').isInt({ min: 1 }),
  body('status').optional().isIn(['draft', 'published', 'archived']),
  body('materials').optional().isArray(),
  body('materials.*.title').optional().isString(),
  body('materials.*.fileUrl').optional().isString(),
];

const updateCourseValidators = [
  body('code').optional({ checkFalsy: true }).isString().trim().notEmpty(),
  body('name').optional({ checkFalsy: true }).isString().trim().notEmpty(),
  body('description').optional().isString().trim(),
  body('instructorName').optional({ checkFalsy: true }).isString().trim().notEmpty(),
  body('schedule').optional({ checkFalsy: true }).isString().trim().notEmpty(),
  body('credits').optional({ checkFalsy: true }).isInt({ min: 1, max: 6 }),
  body('capacity').optional({ checkFalsy: true }).isInt({ min: 1 }),
  body('status').optional().isIn(['draft', 'published', 'archived']),
  body('materials').optional().isArray(),
  body('materials.*.title').optional().isString(),
  body('materials.*.fileUrl').optional().isString(),
];

// Prefix with /courses to match frontend API paths
router.get('/courses', optionalAuthenticate, courseController.listCourses);
router.post('/courses', authenticate, authorizeRole('admin'), createCourseValidators, validateRequest, courseController.createCourse);

router.get('/courses/:courseId', optionalAuthenticate, param('courseId').isInt(), validateRequest, courseController.getCourseById);

router.patch('/courses/:courseId', authenticate, authorizeRole('admin'), [param('courseId').isInt(), ...updateCourseValidators], validateRequest, courseController.updateCourse);

router.delete('/courses/:courseId', authenticate, authorizeRole('admin'), param('courseId').isInt(), validateRequest, courseController.deleteCourse);

router.get('/courses/:courseId/details', authenticate, param('courseId').isInt(), validateRequest, courseController.getCourseDetails);

router.post('/courses/:courseId/enroll', authenticate, authorizeRole('student'), [param('courseId').isInt(), body('studentId').isInt()], validateRequest, courseController.enrollStudent);

router.post('/courses/:courseId/unenroll', authenticate, authorizeRole('student'), [param('courseId').isInt(), body('studentId').isInt()], validateRequest, courseController.unenrollStudent);

router.get('/courses/enrolled/:studentId', authenticate, param('studentId').isInt(), validateRequest, courseController.getEnrolledCourses);

// ASSIGNMENTS
router.get('/assignments', assignmentController.listAssignments);
router.post('/assignments', [
  body('courseId').isInt(),
  body('title').isString().trim().notEmpty(),
  body('description').optional().isString(),
  body('dueDate').isISO8601(),
  body('totalPoints').isInt({ min: 1 }),
], validateRequest, assignmentController.createAssignment);

router.get('/assignments/:assignmentId', param('assignmentId').isInt(), validateRequest, assignmentController.getAssignmentById);

router.patch('/assignments/:assignmentId', [
  param('assignmentId').isInt(),
  body('title').optional().isString().trim(),
  body('description').optional().isString(),
  body('dueDate').optional().isISO8601(),
  body('totalPoints').optional().isInt({ min: 1 }),
], validateRequest, assignmentController.updateAssignment);

router.delete('/assignments/:assignmentId', param('assignmentId').isInt(), validateRequest, assignmentController.deleteAssignment);

router.post('/assignments/:assignmentId/submit', [param('assignmentId').isInt(), body('studentId').isInt()], validateRequest, assignmentController.submitAssignment);

router.post('/assignments/:assignmentId/grade', [
  param('assignmentId').isInt(),
  body('studentId').isInt(),
  body('points').isFloat({ min: 0 }),
  body('feedback').optional().isString(),
], validateRequest, assignmentController.gradeAssignment);

// ============================================================================
// COURSE METADATA ROUTES (EAV via SQL view) can be added later if required

module.exports = router;
