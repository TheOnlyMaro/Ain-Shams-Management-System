const express = require('express');
const { body, param, query } = require('express-validator');
const { authenticate, authorizeRole, optionalAuthenticate } = require('../middleware/authMiddleware');
const validateRequest = require('../middleware/validateRequest');

const allocationController = require('../controllers-sql/resourceAllocationController');

const router = express.Router();

router.get('/', optionalAuthenticate, [query('resourceId').optional().isInt(), query('userId').optional().isInt()], validateRequest, allocationController.listAllocations);
router.get('/:allocationId', optionalAuthenticate, param('allocationId').isInt(), validateRequest, allocationController.getAllocation);

router.post('/', authenticate, authorizeRole(['admin','staff']), [
  body('resourceId').isInt(),
  body('allocatedToUserId').optional().isInt(),
  body('allocatedToDepartment').optional().isString(),
  body('dueBack').optional().isISO8601(),
], validateRequest, allocationController.createAllocation);

router.patch('/:allocationId', authenticate, authorizeRole(['admin','staff']), [param('allocationId').isInt()], validateRequest, allocationController.updateAllocation);
router.delete('/:allocationId', authenticate, authorizeRole('admin'), param('allocationId').isInt(), validateRequest, allocationController.deleteAllocation);

module.exports = router;
