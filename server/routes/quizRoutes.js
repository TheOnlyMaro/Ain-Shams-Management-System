const express = require('express');
const router = express.Router();
const quizController = require('../controllers-sql/quizController');
const { authenticate, authorizeRole } = require('../middleware/authMiddleware');

// Base: /api/quizzes

// Create Quiz (Staff Only)
router.post('/', authenticate, authorizeRole(['staff', 'admin']), quizController.createQuiz);

// List Quizzes for a Course
router.get('/course/:courseId', authenticate, quizController.getQuizzesByCourse);

// Get Quiz Details (Questions) - Logic inside controller handles student vs staff visibility
router.get('/:quizId', authenticate, quizController.getQuizDetails);

// Student Actions
router.post('/:quizId/start', authenticate, authorizeRole('student'), quizController.startQuiz);
router.post('/:quizId/submit', authenticate, authorizeRole('student'), quizController.submitQuiz);
router.get('/:quizId/result', authenticate, authorizeRole('student'), quizController.getStudentResult);

module.exports = router;
