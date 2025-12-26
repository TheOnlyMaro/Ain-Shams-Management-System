// server/routes/researchRoutes.js
const express = require('express');
const router = express.Router();
const researchController = require('../controllers-sql/researchController');
const { authenticate, authorizeRole, optionalAuthenticate } = require('../middleware/authMiddleware');

/**
 * @route   GET /api/research
 * @desc    Get all research papers
 * @access  Public/Optional Authenticated
 */
router.get('/', optionalAuthenticate, researchController.getAllResearch);

/**
 * @route   GET /api/research/:id
 * @desc    Get a single research paper
 * @access  Public/Optional Authenticated
 */
router.get('/:id', optionalAuthenticate, researchController.getResearchById);

/**
 * @route   POST /api/research
 * @desc    Publish a new research paper
 * @access  Private (Admin/Staff)
 */
router.post('/', authenticate, authorizeRole(['admin', 'staff']), researchController.publishResearch);

/**
 * @route   PATCH /api/research/:id
 * @desc    Update a research paper
 * @access  Private (Admin/Staff)
 */
router.patch('/:id', authenticate, authorizeRole(['admin', 'staff']), researchController.updateResearch);

/**
 * @route   DELETE /api/research/:id
 * @desc    Delete a research paper
 * @access  Private (Admin/Staff)
 */
router.delete('/:id', authenticate, authorizeRole(['admin', 'staff']), researchController.deleteResearch);

module.exports = router;
