const express = require('express');
const router = express.Router();
const announcementController = require('../controllers-sql/announcementController');
const { authenticate, authorizeRole, optionalAuthenticate } = require('../middleware/authMiddleware');

// ============================================================================
// ANNOUNCEMENTS ROUTES
// ============================================================================

// Public/authenticated - anyone can view announcements
router.get('/announcements', optionalAuthenticate, announcementController.getAllAnnouncements);
router.get('/announcements/:id', optionalAuthenticate, announcementController.getAnnouncementById);

// Admin/Staff only - create/edit announcements
router.post('/announcements', authenticate, authorizeRole(['admin', 'staff']), announcementController.createAnnouncement);
router.patch('/announcements/:id', authenticate, authorizeRole(['admin', 'staff']), announcementController.updateAnnouncement);
router.delete('/announcements/:id', authenticate, authorizeRole(['admin', 'staff']), announcementController.deleteAnnouncement);

// ============================================================================
// MESSAGES ROUTES
// ============================================================================

// All authenticated users can access messages
router.get('/messages', authenticate, announcementController.getMessages);
router.get('/messages/thread/:threadId', authenticate, announcementController.getMessageThread);
router.post('/messages', authenticate, announcementController.sendMessage);
router.patch('/messages/:id/read', authenticate, announcementController.markMessageRead);

// ============================================================================
// EVENTS ROUTES
// ============================================================================

// Public/authenticated - anyone can view events
router.get('/events', optionalAuthenticate, announcementController.getEvents);

// Admin/Staff only - create events
router.post('/events', authenticate, authorizeRole(['admin', 'staff']), announcementController.createEvent);

// Authenticated - RSVP to events
router.post('/events/:id/rsvp', authenticate, announcementController.rsvpEvent);

module.exports = router;