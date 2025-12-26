const express = require('express');
const router = express.Router();
const parentController = require('../controllers/parentController');
const { authenticate, authorizeRole } = require('../middleware/authMiddleware');

// All routes require Parent role
router.use(authenticate);
router.use(authorizeRole('parent'));

router.post('/connect', parentController.connectChild);
router.get('/children', parentController.getChildren);
router.get('/children/:studentId/progress', parentController.getChildProgress);

module.exports = router;
