const express = require('express');
const { body, param, query } = require('express-validator');
const { authenticate, authorizeRole, optionalAuthenticate } = require('../middleware/authMiddleware');
const validateRequest = require('../middleware/validateRequest');
const leaveController = require('../controllers-sql/leaveController');

const router = express.Router();

router.get('/', authenticate, [query('userId').optional().isInt(), query('status').optional().isString()], validateRequest, leaveController.listLeaves);
router.get('/:leaveId', authenticate, param('leaveId').isInt(), validateRequest, leaveController.getLeave);

// create: authenticated users can request leave for themselves
router.post('/', authenticate, [body('startDate').isISO8601(), body('endDate').isISO8601(), body('leaveType').optional().isString(), body('reason').optional().isString()], validateRequest, leaveController.createLeave);

// update: staff/admin can approve/deny; owner can modify/cancel
router.patch('/:leaveId', authenticate, param('leaveId').isInt(), validateRequest, leaveController.updateLeave);
router.delete('/:leaveId', authenticate, param('leaveId').isInt(), validateRequest, leaveController.deleteLeave);

module.exports = router;
