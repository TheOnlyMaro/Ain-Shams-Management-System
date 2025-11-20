const path = require('path');
const fs = require('fs');
const express = require('express');
const cors = require('cors');
const multer = require('multer');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
// Prefer server/.env when running the server; fall back to project root .env
const serverEnv = path.join(__dirname, '.env');
const rootEnv = path.join(__dirname, '..', '.env');
if (fs.existsSync(serverEnv)) {
  dotenv.config({ path: serverEnv });
} else if (fs.existsSync(rootEnv)) {
  dotenv.config({ path: rootEnv });
} else {
  dotenv.config();
}

const Application = require('./models/Application');

const PORT = process.env.PORT || 4000;
const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/cto_db';

const UPLOAD_DIR = path.join(__dirname, 'uploads');
fs.mkdirSync(UPLOAD_DIR, { recursive: true });

// Multer: add file size limits and basic type filtering
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_DIR),
  filename: (req, file, cb) => {
    const ts = Date.now();
    const safe = (file.originalname || '').replace(/[^a-zA-Z0-9.\-_]/g, '_');
    cb(null, `${ts}_${safe}`);
  },
});

const fileFilter = (req, file, cb) => {
  // allow images and pdf
  const allowed = /^(image\/.+|application\/pdf)$/;
  if (allowed.test(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only images and PDFs are allowed.'));
  }
};

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB per file
  fileFilter,
});

const app = express();
app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(UPLOAD_DIR));

// track Mongo status and limit retries
let mongoConnected = false;
let mongoFailed = false;
let connectAttempts = 0;
const MAX_ATTEMPTS = 5;

// in-memory fallback storage (used when Mongo is unavailable)
const inMemoryApps = [];

// helper to normalize returned app object (used for in-memory created items)
function buildAppObjectFromBody(body, files) {
  const id = String(Date.now()) + '-' + Math.random().toString(36).slice(2, 8);
  const idPhotoFile = files.idPhoto && files.idPhoto[0];
  const selfieFile = files.selfiePhoto && files.selfiePhoto[0];
  const certFiles = files.certificates || [];

  const certMeta = certFiles.map(f => ({ url: `/uploads/${f.filename}`, originalName: f.originalname, filename: f.filename }));
  const documents = [];

  return {
    id, // for frontend keying; Mongo uses _id but endpoints returning objects will include id
    studentName: body.studentName || '',
    email: body.email || '',
    phoneNumber: body.phoneNumber || '',
    appliedProgram: body.appliedProgram || '',
    gpa: body.gpa || '',
    testScore: body.testScore !== undefined ? Number(body.testScore) : undefined,
    age: body.age || '',
    nationalId: body.nationalId || '',
    idPhoto: idPhotoFile ? `/uploads/${idPhotoFile.filename}` : null,
    selfiePhoto: selfieFile ? `/uploads/${selfieFile.filename}` : null,
    certificates: certMeta,
    documents,
    submittedAt: body.submittedAt || new Date().toISOString(),
    applicationStatus: body.applicationStatus || 'pending',
  };
}

// Connect to MongoDB with retry and force IPv4 (family: 4) to avoid IPv6 ::1 issues.
const connectWithRetry = () => {
  if (mongoFailed) return;
  connectAttempts += 1;
  console.log(`Attempting MongoDB connection to ${MONGO_URI} (attempt ${connectAttempts}/${MAX_ATTEMPTS}) ...`);
  mongoose.connect(MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    serverSelectionTimeoutMS: 5000,
    family: 4,
  })
    .then(() => {
      mongoConnected = true;
      console.log('MongoDB connected');
    })
    .catch((err) => {
      mongoConnected = false;
      console.error('MongoDB connection error', err.message || err);
      if (connectAttempts >= MAX_ATTEMPTS) {
        mongoFailed = true;
        console.error(`MongoDB connection failed after ${MAX_ATTEMPTS} attempts. Server will run in in-memory fallback mode. Start MongoDB and restart the server to enable persistence.`);
      } else {
        console.log(`Retrying MongoDB connection in 3s...`);
        setTimeout(connectWithRetry, 3000);
      }
    });
};
connectWithRetry();

// GET all
app.get('/api/applications', async (req, res) => {
  try {
    if (mongoConnected) {
      const docs = await Application.find().sort({ submittedAt: -1 }).lean();
      // return nationalId as id for frontend consistency
      const mapped = docs.map((d) => ({ ...d, id: d.nationalId ?? String(d._id) }));
      return res.json(mapped);
    }
    // fallback: return in-memory store
    return res.json([...inMemoryApps].sort((a,b) => new Date(b.submittedAt) - new Date(a.submittedAt)));
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// GET by id (supports both 16-digit nationalId or Mongo _id)
app.get('/api/applications/:id', async (req, res) => {
  try {
    const key = req.params.id;
    const isNationalId = /^\d{16}$/.test(key);
    if (mongoConnected) {
      let doc;
      if (isNationalId) {
        doc = await Application.findOne({ nationalId: key }).lean();
      } else {
        // fallback to Mongo _id
        doc = await Application.findById(key).lean();
      }
      if (!doc) return res.status(404).json({ message: 'Not found' });
      return res.json({ ...doc, id: doc.nationalId ?? String(doc._id) });
    }
    // in-memory fallback: search by nationalId first, then by id
    const found = isNationalId ? inMemoryApps.find((a) => a.nationalId === key) : inMemoryApps.find((a) => a.id === key);
    if (!found) return res.status(404).json({ message: 'Not found' });
    return res.json(found);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// SEARCH by nationalId (explicit)
app.get('/api/applications/search', async (req, res) => {
  const nationalId = req.query.nationalId;
  if (!nationalId) return res.status(400).json({ message: 'nationalId required' });
  try {
    if (mongoConnected) {
      const doc = await Application.findOne({ nationalId }).lean();
      if (!doc) return res.status(404).json({ message: 'Not found' });
      return res.json({ ...doc, id: doc.nationalId ?? String(doc._id) });
    }
    const found = inMemoryApps.find((a) => a.nationalId === nationalId);
    if (!found) return res.status(404).json({ message: 'Not found' });
    return res.json(found);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Health endpoint
app.get('/api/health', (req, res) => {
  res.json({
    mode: mongoConnected ? 'mongo' : (mongoFailed ? 'fallback' : 'connecting'),
    mongoConnected,
    mongoFailed,
    inMemoryCount: inMemoryApps.length,
  });
});

// Helper: server-side validations
function validateApplicationBody(body) {
  const errors = [];
  if (!body.nationalId || !/^\d{16}$/.test(body.nationalId)) errors.push('nationalId must be 16 digits');
  if (body.testScore !== undefined && body.testScore !== '') {
    const s = Number(body.testScore);
    if (!Number.isFinite(s) || s < 0 || s > 100) errors.push('testScore must be number 0-100');
  }
  if (body.gpa !== undefined && body.gpa !== '') {
    const g = Number(body.gpa);
    if (!Number.isFinite(g) || g < 0 || g > 4) errors.push('gpa must be number 0-4');
  }
  if (body.age !== undefined && body.age !== '') {
    const a = Number(body.age);
    if (!Number.isInteger(a) || a < 0) errors.push('age must be a non-negative integer');
  }
  if (body.email) {
    const ok = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(body.email);
    if (!ok) errors.push('email invalid');
  }
  return errors;
}

// POST create application (files + metadata) — added validation
app.post(
  '/api/applications',
  upload.fields([
    { name: 'idPhoto', maxCount: 1 },
    { name: 'selfiePhoto', maxCount: 1 },
    { name: 'certificates', maxCount: 50 },
  ]),
  async (req, res) => {
    try {
      const body = req.body || {};
      const files = req.files || {};

      // server-side validation
      const validationErrors = validateApplicationBody(body);
      if (validationErrors.length) {
        return res.status(400).json({ message: 'Validation failed', errors: validationErrors });
      }

      // ensure nationalId validation before saving (redundant but safe)
      const nationalId = String(body.nationalId || '');
      if (!/^\d{16}$/.test(nationalId)) {
        return res.status(400).json({ message: 'nationalId must be exactly 16 digits' });
      }

      // Prevent duplicates upfront (both Mongo and in-memory)
      if (mongoConnected) {
        const exists = await Application.findOne({ nationalId }).lean();
        if (exists) return res.status(409).json({ message: 'nationalId already exists' });
        const idPhotoFile = files.idPhoto && files.idPhoto[0];
        const selfieFile = files.selfiePhoto && files.selfiePhoto[0];
        const certFiles = files.certificates || [];

        const certMeta = certFiles.map(f => ({ url: `/uploads/${f.filename}`, originalName: f.originalname, filename: f.filename }));
        const documents = []; // reserved for extra docs

        const application = new Application({
          studentName: body.studentName || '',
          email: body.email || '',
          phoneNumber: body.phoneNumber || '',
          appliedProgram: body.appliedProgram || '',
          gpa: body.gpa !== undefined && body.gpa !== '' ? Number(body.gpa) : undefined,
          testScore: body.testScore !== undefined && body.testScore !== '' ? Number(body.testScore) : undefined,
          age: body.age !== undefined && body.age !== '' ? Number(body.age) : undefined,
          nationalId,
          idPhoto: idPhotoFile ? `/uploads/${idPhotoFile.filename}` : null,
          selfiePhoto: selfieFile ? `/uploads/${selfieFile.filename}` : null,
          certificates: certMeta,
          documents,
          submittedAt: body.submittedAt || new Date().toISOString(),
          applicationStatus: body.applicationStatus || 'pending',
        });

        const saved = await application.save();
        // return nationalId as id for consistency
        return res.status(201).json({ ...saved.toObject(), id: saved.nationalId });
      }

      // Fallback: save in-memory (check uniqueness)
      if (inMemoryApps.some(a => a.nationalId === nationalId)) {
        return res.status(409).json({ message: 'nationalId already exists' });
      }
      const appObj = buildAppObjectFromBody(body, files);
      // in fallback, set id to nationalId for consistency
      appObj.id = appObj.nationalId;
      inMemoryApps.push(appObj);
      return res.status(201).json(appObj);
    } catch (err) {
      console.error(err);
      if (err instanceof multer.MulterError) {
        return res.status(400).json({ message: 'File upload error', error: err.message });
      }
      if (err.code === 11000 && err.keyPattern && err.keyPattern.nationalId) {
        return res.status(409).json({ message: 'nationalId already exists' });
      }
      res.status(500).json({ message: 'Upload failed', error: err.message });
    }
  }
);

app.listen(PORT, () => {
  console.log(`Server listening on http://localhost:${PORT}`);
});
