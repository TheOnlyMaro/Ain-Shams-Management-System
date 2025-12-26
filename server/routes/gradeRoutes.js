const express = require('express');
const { body, param, query } = require('express-validator');
const { authenticate, authorizeRole, optionalAuthenticate } = require('../middleware/authMiddleware');

const gradeController = require('../controllers-sql/gradeController');
const validateRequest = require('../middleware/validateRequest');

const router = express.Router();

// List grades (optional filters: ?courseId=, ?assignmentId=, ?studentId=)
router.get('/grades', 
  optionalAuthenticate,
  [
    query('courseId').optional().isInt(),
    query('assignmentId').optional().isInt(),
    query('studentId').optional().isInt(),
  ], 
  validateRequest, 
  gradeController.listGrades
);

// Get single grade
router.get('/grades/:gradeId', 
  optionalAuthenticate,
  [param('gradeId').isInt()], 
  validateRequest, 
  gradeController.getGradeById
);

// Create grade (admin/staff expected)
router.post('/grades', 
  authenticate,
  authorizeRole(['admin', 'staff']),
  [
    body('courseId').isInt(),
    body('assignmentId').isInt(),
    body('studentId').isInt(),
    body('points').isFloat({ min: 0 }),
    body('feedback').optional().isString(),
  ], 
  validateRequest, 
  gradeController.createGrade
);

// Update grade (admin/staff expected)
router.patch('/grades/:gradeId', 
  authenticate,
  authorizeRole(['admin', 'staff']),
  [
    param('gradeId').isInt(),
    body('points').optional().isFloat({ min: 0 }),
    body('feedback').optional().isString(),
  ], 
  validateRequest, 
  gradeController.updateGrade
);

// Delete grade (admin/staff expected)
router.delete('/grades/:gradeId', 
  authenticate,
  authorizeRole(['admin', 'staff']),
  [param('gradeId').isInt()], 
  validateRequest, 
  gradeController.deleteGrade
);

module.exports = router;

