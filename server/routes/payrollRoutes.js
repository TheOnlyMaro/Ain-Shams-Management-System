const express = require('express');
const { body, param } = require('express-validator');
const { authenticate, authorizeRole, optionalAuthenticate } = require('../middleware/authMiddleware');
const validateRequest = require('../middleware/validateRequest');
const payrollController = require('../controllers-sql/payrollController');

const router = express.Router();

router.get('/', optionalAuthenticate, payrollController.listPayruns);
router.get('/:payrunId', optionalAuthenticate, [param('payrunId').isInt()], validateRequest, payrollController.getPayrun);

// Admins/Staff can create payruns
router.post('/', authenticate, authorizeRole(['admin','staff']), [body('periodStart').isISO8601(), body('periodEnd').isISO8601()], validateRequest, payrollController.createPayrun);

// Add entry to payrun
router.post('/:payrunId/entries', authenticate, authorizeRole(['admin','staff']), [param('payrunId').isInt(), body('userId').isInt(), body('grossAmount').optional().isDecimal()], validateRequest, payrollController.addEntry);

// Add component to entry (admin/staff)
router.post('/entries/:entryId/components', authenticate, authorizeRole(['admin','staff']), [param('entryId').isInt(), body('componentType').isString(), body('amount').isDecimal()], validateRequest, payrollController.addComponent);

// Finalize payrun
router.patch('/:payrunId/finalize', authenticate, authorizeRole(['admin','staff']), [param('payrunId').isInt()], validateRequest, payrollController.finalizePayrun);

module.exports = router;
