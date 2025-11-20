const mongoose = require('mongoose');
const { validationResult } = require('express-validator');

const Course = require('../models/Course');
const Assignment = require('../models/assignment');
const Grade = require('../models/grade');

const getRequestRole = (req) => req.headers['x-user-role'] || req.user && req.user.role || null;

const ensureRole = (req, expectedRole) => {
  const role = getRequestRole(req);
  if (role !== expectedRole) {
    const error = new Error('Forbidden');
    error.statusCode = 403;
    throw error;
  }
};

const buildCourseFilter = (query) => {
  const filter = {};
  const { search } = query;

  if (search) {
    filter.$or = [
      { name: new RegExp(search, 'i') },
      { code: new RegExp(search, 'i') },
      { description: new RegExp(search, 'i') },
      { instructorName: new RegExp(search, 'i') },
    ];
  }

  return filter;
};

const listCourses = async (req, res, next) => {
  try {
    const filter = buildCourseFilter(req.query);
    const courses = await Course.find(filter).sort({ createdAt: -1 });

    res.json({ success: true, data: courses });
  } catch (error) {
    next(error);
  }
};

const createCourse = async (req, res, next) => {
  try {
    ensureRole(req, 'admin');

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const course = await Course.create(req.body);
    res.status(201).json({ success: true, data: course });
  } catch (error) {
    if (error.code === 11000) {
      error.statusCode = 409;
      error.message = 'Course code already exists';
    }
    next(error);
  }
};

const getCourseById = async (req, res, next) => {
  try {
    const { courseId } = req.params;
    const course = await Course.findById(courseId);

    if (!course) return res.status(404).json({ success: false, message: 'Course not found' });

    res.json({ success: true, data: course });
  } catch (error) {
    next(error);
  }
};

const updateCourse = async (req, res, next) => {
  try {
    ensureRole(req, 'admin');

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const { courseId } = req.params;
    const course = await Course.findByIdAndUpdate(courseId, req.body, { new: true, runValidators: true });

    if (!course) return res.status(404).json({ success: false, message: 'Course not found' });

    res.json({ success: true, data: course });
  } catch (error) {
    next(error);
  }
};

const deleteCourse = async (req, res, next) => {
  try {
    ensureRole(req, 'admin');

    const { courseId } = req.params;
    const course = await Course.findByIdAndDelete(courseId);

    if (!course) return res.status(404).json({ success: false, message: 'Course not found' });

    await Promise.all([ Assignment.deleteMany({ course: courseId }), Grade.deleteMany({ course: courseId }) ]);

    res.status(204).send();
  } catch (error) {
    next(error);
  }
};

const getCourseDetails = async (req, res, next) => {
  try {
    const { courseId } = req.params;
    const course = await Course.findById(courseId);

    if (!course) return res.status(404).json({ success: false, message: 'Course not found' });

    const assignmentsPromise = Assignment.find({ course: courseId }).sort({ dueDate: 1 }).lean();
    const assignments = await assignmentsPromise;

    res.json({ success: true, data: { course, assignments } });
  } catch (error) {
    next(error);
  }
};

const enrollStudent = async (req, res, next) => {
  try {
    ensureRole(req, 'student');

    const { courseId } = req.params;
    const { studentId } = req.body;

    if (!mongoose.Types.ObjectId.isValid(studentId)) {
      return res.status(400).json({ success: false, message: 'Invalid student id' });
    }

    const course = await Course.findById(courseId);
    if (!course) return res.status(404).json({ success: false, message: 'Course not found' });

    if (course.students.some((student) => student.toString() === studentId)) {
      return res.status(409).json({ success: false, message: 'Student already enrolled in this course' });
    }

    if (course.enrolled >= course.capacity) {
      return res.status(400).json({ success: false, message: 'Course capacity has been reached' });
    }

    course.students.push(studentId);
    course.enrolled = course.students.length;
    await course.save();

    res.json({ success: true, data: course });
  } catch (error) {
    next(error);
  }
};

const unenrollStudent = async (req, res, next) => {
  try {
    ensureRole(req, 'student');

    const { courseId } = req.params;
    const { studentId } = req.body;

    if (!mongoose.Types.ObjectId.isValid(studentId)) {
      return res.status(400).json({ success: false, message: 'Invalid student id' });
    }

    const course = await Course.findById(courseId);
    if (!course) return res.status(404).json({ success: false, message: 'Course not found' });

    const initialCount = course.students.length;
    course.students = course.students.filter((student) => student.toString() !== studentId);

    if (course.students.length === initialCount) {
      return res.status(404).json({ success: false, message: 'Student is not enrolled in this course' });
    }

    course.enrolled = course.students.length;
    await course.save();

    res.json({ success: true, data: course });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  listCourses,
  createCourse,
  getCourseById,
  updateCourse,
  deleteCourse,
  getCourseDetails,
  enrollStudent,
  unenrollStudent,
};
