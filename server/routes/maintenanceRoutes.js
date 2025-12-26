const express = require('express');
const { body, param, query } = require('express-validator');
const { authenticate, authorizeRole, optionalAuthenticate } = require('../middleware/authMiddleware');

const maintenanceController = require('../controllers-sql/maintenanceController');
const validateRequest = require('../middleware/validateRequest');

const router = express.Router();

// Report maintenance issue (authenticated users)
router.post('/maintenance', [
  authenticate,
  body('classroomId').optional().isInt(),
  body('location').optional().isString().trim(),
  body('issueType').optional().isIn(['general', 'equipment', 'furniture', 'electrical', 'plumbing', 'heating', 'cleaning', 'safety', 'other']),
  body('title').isString().trim().notEmpty(),
  body('description').optional().isString().trim(),
  body('priority').optional().isIn(['low', 'medium', 'high', 'urgent']),
], validateRequest, maintenanceController.reportMaintenanceIssue);

// List maintenance issues (optional auth - public can view)
router.get('/maintenance', [
  optionalAuthenticate,
  query('classroomId').optional().isInt(),
  query('status').optional().isIn(['reported', 'in_progress', 'resolved', 'cancelled']),
  query('priority').optional().isIn(['low', 'medium', 'high', 'urgent']),
  query('issueType').optional().isIn(['general', 'equipment', 'furniture', 'electrical', 'plumbing', 'heating', 'cleaning', 'safety', 'other']),
], validateRequest, maintenanceController.listMaintenanceIssues);

// Update maintenance issue (admin/staff only)
router.patch('/maintenance/:issueId', [
  authenticate,
  authorizeRole(['admin', 'staff']),
  param('issueId').isInt(),
  body('status').optional().isIn(['reported', 'in_progress', 'resolved', 'cancelled']),
  body('assignedToUserId').optional().custom((val) => val === null || Number.isInteger(Number(val))),
  body('resolutionNotes').optional().isString().trim(),
], validateRequest, maintenanceController.updateMaintenanceIssue);

module.exports = router;

