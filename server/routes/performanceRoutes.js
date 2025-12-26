const express = require('express');
const { body, param, query } = require('express-validator');
const { authenticate, authorizeRole, optionalAuthenticate } = require('../middleware/authMiddleware');
const validateRequest = require('../middleware/validateRequest');
const perfCtrl = require('../controllers-sql/performanceController');

const router = express.Router();

router.get('/', optionalAuthenticate, [query('userId').optional().isInt()], validateRequest, perfCtrl.listReviews);
router.get('/:reviewId', optionalAuthenticate, [param('reviewId').isInt()], validateRequest, perfCtrl.getReview);

// Admin/staff create reviews
router.post('/', authenticate, authorizeRole(['admin','staff']), [body('userId').isInt(), body('periodStart').isISO8601(), body('periodEnd').isISO8601()], validateRequest, perfCtrl.createReview);

router.post('/:reviewId/goals', authenticate, authorizeRole(['admin','staff']), [param('reviewId').isInt(), body('title').isString()], validateRequest, perfCtrl.addGoal);
router.post('/:reviewId/feedback', authenticate, authorizeRole(['admin','staff','staff']), [param('reviewId').isInt(), body('commenterId').isInt(), body('comment').isString()], validateRequest, perfCtrl.addFeedback);

router.patch('/:reviewId', authenticate, authorizeRole(['admin','staff']), [param('reviewId').isInt()], validateRequest, perfCtrl.updateReview);

module.exports = router;
