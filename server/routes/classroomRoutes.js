const express = require('express');
const { body, param, query } = require('express-validator');

const classroomController = require('../controllers-sql/classroomController');
const validateRequest = require('../middleware/validateRequest');

const router = express.Router();

// List all classrooms
router.get('/classrooms', [
  query('building').optional().isString(),
  query('roomType').optional().isIn(['classroom', 'laboratory', 'lecture_hall', 'seminar_room', 'computer_lab', 'science_lab']),
  query('isActive').optional().isBoolean(),
], validateRequest, classroomController.listClassrooms);

// Get classroom by ID
router.get('/classrooms/:classroomId', [param('classroomId').isInt()], validateRequest, classroomController.getClassroomById);

// Get classroom availability
router.get('/classrooms/availability', [
  query('classroomId').optional().isInt(),
  query('startTime').isISO8601(),
  query('endTime').isISO8601(),
  query('date').optional().isISO8601(),
], validateRequest, classroomController.getClassroomAvailability);

// Get classroom schedule
router.get('/classrooms/:classroomId/schedule', [
  param('classroomId').isInt(),
  query('startDate').optional().isISO8601(),
  query('endDate').optional().isISO8601(),
], validateRequest, classroomController.getClassroomSchedule);

// Create booking (admin/staff only)
router.post('/classrooms/bookings', [
  body('classroomId').isInt(),
  body('courseId').optional().isInt(),
  body('title').isString().trim().notEmpty(),
  body('description').optional().isString(),
  body('startTime').isISO8601(),
  body('endTime').isISO8601(),
  body('bookingType').optional().isIn(['course', 'event', 'meeting', 'exam', 'other']),
  body('recurringPattern').optional().isIn(['none', 'daily', 'weekly', 'monthly']),
  body('recurringUntil').optional().isISO8601(),
], validateRequest, classroomController.createBooking);

// List bookings
router.get('/classrooms/bookings', [
  query('classroomId').optional().isInt(),
  query('courseId').optional().isInt(),
  query('startDate').optional().isISO8601(),
  query('endDate').optional().isISO8601(),
  query('status').optional().isIn(['pending', 'confirmed', 'cancelled', 'completed']),
], validateRequest, classroomController.listBookings);

// Cancel booking
router.patch('/classrooms/bookings/:bookingId/cancel', [param('bookingId').isInt()], validateRequest, classroomController.cancelBooking);

// Report maintenance issue
router.post('/classrooms/maintenance', [
  body('classroomId').isInt(),
  body('issueType').optional().isIn(['general', 'equipment', 'furniture', 'electrical', 'plumbing', 'heating', 'cleaning', 'safety', 'other']),
  body('title').isString().trim().notEmpty(),
  body('description').optional().isString(),
  body('priority').optional().isIn(['low', 'medium', 'high', 'urgent']),
], validateRequest, classroomController.reportMaintenanceIssue);

// List maintenance issues
router.get('/classrooms/maintenance', [
  query('classroomId').optional().isInt(),
  query('status').optional().isIn(['reported', 'in_progress', 'resolved', 'cancelled']),
  query('priority').optional().isIn(['low', 'medium', 'high', 'urgent']),
  query('issueType').optional().isIn(['general', 'equipment', 'furniture', 'electrical', 'plumbing', 'heating', 'cleaning', 'safety', 'other']),
], validateRequest, classroomController.listMaintenanceIssues);

// Update maintenance issue (admin/staff only)
router.patch('/classrooms/maintenance/:issueId', [
  param('issueId').isInt(),
  body('status').optional().isIn(['reported', 'in_progress', 'resolved', 'cancelled']),
  body('assignedToUserId').optional().isInt(),
  body('resolutionNotes').optional().isString(),
], validateRequest, classroomController.updateMaintenanceIssue);

module.exports = router;

