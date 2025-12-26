const express = require('express');
const { body, param, query } = require('express-validator');

const bookingController = require('../controllers-sql/bookingController');
const validateRequest = require('../middleware/validateRequest');
const { authenticate, optionalAuthenticate } = require('../middleware/authMiddleware');

const router = express.Router();

// Create booking (admin/staff only - enforced in controller via role check)
router.post(
  '/',
  authenticate,
  [
    body('classroomId').isInt(),
    body('courseId').optional().isInt(),
    body('title').isString().trim().notEmpty(),
    body('description').optional().isString().trim(),
    body('startTime').isISO8601(),
    body('endTime').isISO8601(),
    body('bookingType').optional().isIn(['course', 'event', 'meeting', 'exam', 'other']),
    body('recurringPattern').optional().isIn(['none', 'daily', 'weekly', 'monthly']),
    body('recurringUntil').optional().isISO8601(),
  ],
  validateRequest,
  bookingController.createBooking
);

// List bookings (no strict auth required; optional to allow future personalization)
router.get(
  '/',
  optionalAuthenticate,
  [
    query('classroomId').optional().isInt(),
    query('courseId').optional().isInt(),
    query('startDate').optional().isISO8601(),
    query('endDate').optional().isISO8601(),
    query('status').optional().isIn(['pending', 'confirmed', 'cancelled']),
  ],
  validateRequest,
  bookingController.listBookings
);

// Cancel booking (admin/staff or owner - enforced in controller)
router.patch(
  '/:bookingId/cancel',
  authenticate,
  [param('bookingId').isInt()],
  validateRequest,
  bookingController.cancelBooking
);

module.exports = router;

