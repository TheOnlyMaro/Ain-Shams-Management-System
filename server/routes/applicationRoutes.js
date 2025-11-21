const express = require('express');
const multer = require('multer');
const path = require('path');
const applicationController = require('../controllers/applicationController');
const { authenticate, authorizeRole } = require('../middleware/authMiddleware');

// Set up Multer for file uploads (same as before)
const UPLOAD_DIR = path.join(__dirname, '..', 'uploads');
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_DIR),
  filename: (req, file, cb) => {
    const ts = Date.now();
    const safe = (file.originalname || '').replace(/[^a-zA-Z0-9.\-_]/g, '_');
    cb(null, `${ts}_${safe}`);
  },
});
const fileFilter = (req, file, cb) => {
  const allowed = /^(image\/.+|application\/pdf)$/;
  if (allowed.test(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only images and PDFs are allowed.'));
  }
};
const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter,
});

const router = express.Router();

// Attach mongo status to req for controller logic
router.use((req, res, next) => {
  req.mongoConnected = req.app.get('mongoConnected');
  req.mongoFailed = req.app.get('mongoFailed');
  next();
});

// Health endpoint should be before the parameterized `/:id` route to avoid
// treating 'health' as an ObjectId (which causes CastError).
router.get('/health', applicationController.health);
router.get('/', applicationController.getAllApplications);
router.get('/search', applicationController.searchByNationalId);
router.get('/:id', applicationController.getApplicationById);
router.post(
  '/',
  upload.fields([
    { name: 'idPhoto', maxCount: 1 },
    { name: 'selfiePhoto', maxCount: 1 },
    { name: 'certificates', maxCount: 50 },
  ]),
  applicationController.createApplication
);
// require authenticated user and either admin role or admissions staff (staffType === 'admissions')
// Note: we remove the broad 'staff' role from this check so only staff with staffType 'admissions' are allowed.
router.put('/:id/status', authenticate, authorizeRole(['admin','admissions']), applicationController.updateApplicationStatus);
router.get('/:id/activity', authenticate, authorizeRole(['admin','admissions']), applicationController.getActivityLogs);

module.exports = router;
