const express = require('express');
const { body, param, query } = require('express-validator');

const gradeController = require('../controllers-sql/gradeController');
const validateRequest = require('../middleware/validateRequest');

const router = express.Router();

// List grades (optional filters: ?courseId=, ?assignmentId=, ?studentId=)
router.get('/grades', [
  query('courseId').optional().isInt(),
  query('assignmentId').optional().isInt(),
  query('studentId').optional().isInt(),
], validateRequest, gradeController.listGrades);

// Get single grade
router.get('/grades/:gradeId', [param('gradeId').isInt()], validateRequest, gradeController.getGradeById);

// Create grade (admin/staff expected)
router.post('/grades', [
  body('courseId').isInt(),
  body('assignmentId').isInt(),
  body('studentId').isInt(),
  body('points').isFloat({ min: 0 }),
  body('feedback').optional().isString(),
], validateRequest, gradeController.createGrade);

// Update grade (admin/staff expected)
router.patch('/grades/:gradeId', [
  param('gradeId').isInt(),
  body('points').optional().isFloat({ min: 0 }),
  body('feedback').optional().isString(),
], validateRequest, gradeController.updateGrade);

// Delete grade (admin/staff expected)
router.delete('/grades/:gradeId', [param('gradeId').isInt()], validateRequest, gradeController.deleteGrade);

module.exports = router;

