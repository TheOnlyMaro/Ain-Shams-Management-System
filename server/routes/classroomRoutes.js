const express = require('express');
const { param, query } = require('express-validator');

const classroomController = require('../controllers-sql/classroomController');
const validateRequest = require('../middleware/validateRequest');

const router = express.Router();

// List all classrooms
router.get('/', [
  query('building').optional().isString(),
  query('roomType').optional().isIn(['classroom', 'laboratory', 'lecture_hall', 'seminar_room', 'computer_lab', 'science_lab']),
  query('isActive').optional().isBoolean(),
], validateRequest, classroomController.listClassrooms);

// Get classroom by ID
router.get('/:classroomId', [param('classroomId').isInt()], validateRequest, classroomController.getClassroomById);

// Get classroom availability
router.get('/availability', [
  query('classroomId').optional().isInt(),
  query('startTime').isISO8601(),
  query('endTime').isISO8601(),
  query('date').optional().isISO8601(),
], validateRequest, classroomController.getClassroomAvailability);

// Get classroom schedule
router.get('/:classroomId/schedule', [
  param('classroomId').isInt(),
  query('startDate').optional().isISO8601(),
  query('endDate').optional().isISO8601(),
], validateRequest, classroomController.getClassroomSchedule);

module.exports = router;

