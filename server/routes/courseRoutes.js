const express = require('express');
const { body, param } = require('express-validator');
const { authenticate, authorizeRole, optionalAuthenticate } = require('../middleware/authMiddleware');

// Switch to SQL-based controller; legacy Mongo controller kept for reference
const courseController = require('../controllers-sql/courseController');
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
  body('code').optional().isString().trim(),
  body('name').optional().isString().trim(),
  body('description').optional().isString().trim(),
  body('instructorName').optional().isString().trim(),
  body('schedule').optional().isString().trim(),
  body('credits').optional().isInt({ min: 1, max: 6 }),
  body('capacity').optional().isInt({ min: 1 }),
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

// ============================================================================
// COURSE METADATA ROUTES (EAV via SQL view) can be added later if required

module.exports = router;
