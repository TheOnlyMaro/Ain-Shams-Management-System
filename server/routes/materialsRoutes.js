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

// ID validators
const courseIdValidator = param('courseId').isInt().withMessage('Invalid course ID');
const materialIdValidator = param('materialId').isInt().withMessage('Invalid material ID');

// Upload material
// POST /courses/:courseId/materials
router.post(
  '/materials',
  courseIdValidator,
  uploadValidators,
  validateRequest,
  materialsController.uploadMaterial
);

// Get all materials for a course
// GET /courses/:courseId/materials
router.get(
  '/materials',
  courseIdValidator,
  validateRequest,
  materialsController.getMaterials
);

// Get single material by ID
// GET /courses/:courseId/materials/:materialId
router.get(
  '/materials/:materialId',
  courseIdValidator,
  materialIdValidator,
  validateRequest,
  materialsController.getMaterialById
);

// Download material (returns file URL)
// GET /courses/:courseId/materials/:materialId/download
router.get(
  '/materials/:materialId/download',
  courseIdValidator,
  materialIdValidator,
  validateRequest,
  materialsController.downloadMaterial
);

// Update material metadata
// PATCH /courses/:courseId/materials/:materialId
router.patch(
  '/materials/:materialId',
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
  courseIdValidator,
  materialIdValidator,
  validateRequest,
  materialsController.deleteMaterial
);

module.exports = router;