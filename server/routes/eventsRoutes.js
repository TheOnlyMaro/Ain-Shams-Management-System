const express = require('express');
const { body, param, query } = require('express-validator');
const { authenticate, authorizeRole, optionalAuthenticate } = require('../middleware/authMiddleware');

const eventsController = require('../controllers-sql/eventsController');
const validateRequest = require('../middleware/validateRequest');

const router = express.Router();

// List events (all users can view published events, admins can see all)
router.get('/', [
  optionalAuthenticate,
  query('eventType').optional().isIn(['announcement', 'event', 'deadline', 'holiday', 'other']),
  query('status').optional().isIn(['draft', 'published', 'archived']),
  query('startDate').optional().isISO8601(),
  query('endDate').optional().isISO8601(),
  query('search').optional().isString().trim(),
], validateRequest, eventsController.listEvents);

// Get event by ID
router.get('/:eventId', [
  optionalAuthenticate,
  param('eventId').isInt(),
], validateRequest, eventsController.getEventById);

// Create event (admin only)
router.post('/', [
  authenticate,
  authorizeRole('admin'),
  body('title').isString().trim().notEmpty(),
  body('description').optional().isString().trim(),
  body('eventDate').isISO8601(),
  body('location').optional().isString().trim(),
  body('eventType').optional().isIn(['announcement', 'event', 'deadline', 'holiday', 'other']),
  body('status').optional().isIn(['draft', 'published', 'archived']),
], validateRequest, eventsController.createEvent);

// Update event (admin only)
router.patch('/:eventId', [
  authenticate,
  authorizeRole('admin'),
  param('eventId').isInt(),
  body('title').optional().isString().trim().notEmpty(),
  body('description').optional().isString().trim(),
  body('eventDate').optional().isISO8601(),
  body('location').optional().isString().trim(),
  body('eventType').optional().isIn(['announcement', 'event', 'deadline', 'holiday', 'other']),
  body('status').optional().isIn(['draft', 'published', 'archived']),
], validateRequest, eventsController.updateEvent);

// Delete event (admin only)
router.delete('/:eventId', [
  authenticate,
  authorizeRole('admin'),
  param('eventId').isInt(),
], validateRequest, eventsController.deleteEvent);

module.exports = router;