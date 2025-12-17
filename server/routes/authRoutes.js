const express = require('express');
const router = express.Router();
// Switch to SQL-based controller; legacy Mongo controller kept for reference
const authController = require('../controllers-sql/authController');
const { authenticate } = require('../middleware/authMiddleware');

router.post('/signup', authController.signup);
router.post('/login', authController.login);
router.post('/refresh', authController.refresh);
router.post('/logout', authController.logout);
router.get('/me', authenticate, authController.me);

module.exports = router;
