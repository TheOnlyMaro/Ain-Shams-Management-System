const express = require('express');
const { body, param } = require('express-validator');
const { authenticate, authorizeRole, optionalAuthenticate } = require('../middleware/authMiddleware');
const materialsController = require('../controllers-sql/materialsController');
const validateRequest = require('../middleware/validateRequest');

const router = express.Router({ mergeParams: true });

// Upload validation (required: title, type, fileUrl)
const uploadValidators = [
  body('title').isString().trim().notEmpty().withMessage('Title required'),
  body('type').isIn(['pdf', 'video', 'document', 'presentation', 'link']).withMessage('Invalid type'),
  body('fileUrl').isString().trim().notEmpty().withMessage('File URL required'),
  body('fileSize').optional().isString().trim(),
  body('description').optional().isString().trim(),
];

// Update validation (all fields optional but must have at least one)
const updateValidators = [
  body('title').optional().isString().trim().notEmpty(),
  body('type').optional().isIn(['pdf', 'video', 'document', 'presentation', 'link']),
  body('description').optional().isString().trim(),
];

// ID validators - isInt() should handle string numbers like "123"
const courseIdValidator = param('courseId')
  .custom((value) => {
    const num = Number(value);
    return Number.isInteger(num) && num > 0;
  })
  .withMessage('Invalid course ID');
const materialIdValidator = param('materialId')
  .custom((value) => {
    const num = Number(value);
    return Number.isInteger(num) && num > 0;
  })
  .withMessage('Invalid material ID');

// Upload material
// POST /courses/:courseId/materials
router.post(
  '/materials',
  authenticate,
  authorizeRole(['admin', 'staff']),
  courseIdValidator,
  uploadValidators,
  validateRequest,
  materialsController.uploadMaterial
);

// Get all materials for a course
// GET /courses/:courseId/materials
router.get(
  '/materials',
  optionalAuthenticate,
  courseIdValidator,
  validateRequest,
  materialsController.getMaterials
);

// Get single material by ID
// GET /courses/:courseId/materials/:materialId
router.get(
  '/materials/:materialId',
  optionalAuthenticate,
  courseIdValidator,
  materialIdValidator,
  validateRequest,
  materialsController.getMaterialById
);

// Download material (returns file URL)
// GET /courses/:courseId/materials/:materialId/download
router.get(
  '/materials/:materialId/download',
  optionalAuthenticate,
  courseIdValidator,
  materialIdValidator,
  validateRequest,
  materialsController.downloadMaterial
);

// Update material metadata
// PATCH /courses/:courseId/materials/:materialId
router.patch(
  '/materials/:materialId',
  authenticate,
  authorizeRole(['admin', 'staff']),
  courseIdValidator,
  materialIdValidator,
  updateValidators,
  validateRequest,
  materialsController.updateMaterial
);

// Delete material
// DELETE /courses/:courseId/materials/:materialId
router.delete(
  '/materials/:materialId',
  authenticate,
  authorizeRole(['admin', 'staff']),
  courseIdValidator,
  materialIdValidator,
  validateRequest,
  materialsController.deleteMaterial
);

module.exports = router;