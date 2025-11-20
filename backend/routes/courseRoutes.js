const express = require('express');
const { body, param } = require('express-validator');

const courseController = require('../controllers/courseController');
const validateRequest = require('../middleware/validateRequest');

const router = express.Router();

//validators for creating
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

//validators for updating
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

router.get('/', courseController.listCourses);
router.post('/', createCourseValidators, validateRequest, courseController.createCourse);

router.get(
  '/:courseId',
  param('courseId').isMongoId(),
  validateRequest,
  courseController.getCourseById
);


router.patch(
  '/:courseId',
  [param('courseId').isMongoId(), ...updateCourseValidators],
  validateRequest,
  courseController.updateCourse
);

router.delete(
  '/:courseId',
  param('courseId').isMongoId(),
  validateRequest,
  courseController.deleteCourse
);

router.get(
  '/:courseId/details',
  param('courseId').isMongoId(),
  validateRequest,
  courseController.getCourseDetails
);

router.post(
  '/:courseId/enroll',
  [param('courseId').isMongoId(), body('studentId').isMongoId()],
  validateRequest,
  courseController.enrollStudent
);

router.post(
  '/:courseId/unenroll',
  [param('courseId').isMongoId(), body('studentId').isMongoId()],
  validateRequest,
  courseController.unenrollStudent
);

module.exports = router;

