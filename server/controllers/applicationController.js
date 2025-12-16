const Application = require('../models/Application');
const multer = require('multer');
const { inMemoryApps, logFallbackUsage, buildAppObjectFromBody } = require('../fallback');

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

// GET all applications
exports.getAllApplications = async (req, res) => {
  try {
    if (req.mongoConnected) {
      const docs = await Application.find().sort({ submittedAt: -1 }).lean();
      const mapped = docs.map((d) => ({ ...d, id: d.nationalId ?? String(d._id) }));
      return res.json(mapped);
    }
    logFallbackUsage('GET all applications');
    return res.json([...inMemoryApps].sort((a,b) => new Date(b.submittedAt) - new Date(a.submittedAt)));
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

// GET application by id
exports.getApplicationById = async (req, res) => {
  try {
    const key = req.params.id;
    const isNationalId = /^\d{16}$/.test(key);
    if (req.mongoConnected) {
      let doc;
      if (isNationalId) {
        doc = await Application.findOne({ nationalId: key }).lean();
      } else {
        doc = await Application.findById(key).lean();
      }
      if (!doc) return res.status(404).json({ message: 'Not found' });
      // Access control: admins and admissions staff may view any application.
      const isAdmin = req.user && (req.user.role === 'admin' || req.user.staffType === 'admissions');
      if (isAdmin) return res.json({ ...doc, id: doc.nationalId ?? String(doc._id) });

      // Non-admins: allow access only when requesting by nationalId and providing the applicant email that matches.
      if (isNationalId) {
        const qEmail = (req.query.email || '').toLowerCase();
        const appEmail = (doc.email || '').toLowerCase();
        if (qEmail && appEmail && qEmail === appEmail) {
          return res.json({ ...doc, id: doc.nationalId ?? String(doc._id) });
        }
        return res.status(403).json({ message: 'Forbidden: provide matching applicant email to view this application' });
      }

      return res.status(403).json({ message: 'Forbidden' });
    }
    logFallbackUsage('GET application by id');
    const found = isNationalId ? inMemoryApps.find((a) => a.nationalId === key) : inMemoryApps.find((a) => a.id === key);
    if (!found) return res.status(404).json({ message: 'Not found' });
    // fallback access control
    const isAdminFb = req.user && (req.user.role === 'admin' || req.user.staffType === 'admissions');
    if (isAdminFb) return res.json(found);
    if (isNationalId) {
      const qEmail = (req.query.email || '').toLowerCase();
      const appEmail = (found.email || '').toLowerCase();
      if (qEmail && appEmail && qEmail === appEmail) return res.json(found);
      return res.status(403).json({ message: 'Forbidden: provide matching applicant email to view this application' });
    }
    return res.status(403).json({ message: 'Forbidden' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

// SEARCH by nationalId
exports.searchByNationalId = async (req, res) => {
  const nationalId = req.query.nationalId;
  if (!nationalId) return res.status(400).json({ message: 'nationalId required' });
  try {
    // Access control: if authenticated as admin/admissions staff, allow any result.
    const isAdmin = req.user && (req.user.role === 'admin' || req.user.staffType === 'admissions');
    if (req.mongoConnected) {
      const doc = await Application.findOne({ nationalId }).lean();
      if (!doc) return res.status(404).json({ message: 'Not found' });
      if (isAdmin) return res.json({ ...doc, id: doc.nationalId ?? String(doc._id) });
      // non-admin: require matching applicant email provided as query param
      const qEmail = (req.query.email || '').toLowerCase();
      const appEmail = (doc.email || '').toLowerCase();
      if (qEmail && appEmail && qEmail === appEmail) return res.json({ ...doc, id: doc.nationalId ?? String(doc._id) });
      return res.status(403).json({ message: 'Forbidden: provide applicant email to view this application' });
    }
    logFallbackUsage('SEARCH by nationalId');
    const found = inMemoryApps.find((a) => a.nationalId === nationalId);
    if (!found) return res.status(404).json({ message: 'Not found' });
    const isAdminFb = req.user && (req.user.role === 'admin' || req.user.staffType === 'admissions');
    if (isAdminFb) return res.json(found);
    const qEmail = (req.query.email || '').toLowerCase();
    const appEmail = (found.email || '').toLowerCase();
    if (qEmail && appEmail && qEmail === appEmail) return res.json(found);
    return res.status(403).json({ message: 'Forbidden: provide applicant email to view this application' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

// POST create application
exports.createApplication = async (req, res) => {
  try {
    const body = req.body || {};
    const files = req.files || {};
    const validationErrors = validateApplicationBody(body);
    if (validationErrors.length) {
      return res.status(400).json({ message: 'Validation failed', errors: validationErrors });
    }
    const nationalId = String(body.nationalId || '');
    if (!/^\d{16}$/.test(nationalId)) {
      return res.status(400).json({ message: 'nationalId must be exactly 16 digits' });
    }
    if (req.mongoConnected) {
      const exists = await Application.findOne({ nationalId }).lean();
      if (exists) return res.status(409).json({ message: 'nationalId already exists' });
      const idPhotoFile = files.idPhoto && files.idPhoto[0];
      const selfieFile = files.selfiePhoto && files.selfiePhoto[0];
      const certFiles = files.certificates || [];
      const certMeta = certFiles.map(f => ({ url: `/uploads/${f.filename}`, originalName: f.originalname, filename: f.filename }));
      const documents = [];
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
      return res.status(201).json({ ...saved.toObject(), id: saved.nationalId });
    }
    logFallbackUsage('POST create application');
    if (inMemoryApps.some(a => a.nationalId === nationalId)) {
      return res.status(409).json({ message: 'nationalId already exists' });
    }
    const appObj = buildAppObjectFromBody(body, files);
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
};

// PUT update application status
exports.updateApplicationStatus = async (req, res) => {
  try {
    const id = req.params.id;
    const { status, note } = req.body || {};
    if (!status) return res.status(400).json({ message: 'status is required' });
    const activity = {
      staffId: req.staffId,
      action: `status:${status}`,
      note: note || '',
      timestamp: new Date().toISOString(),
    };
    if (req.mongoConnected) {
      const isNationalId = /^\d{16}$/.test(id);
      const query = isNationalId ? { nationalId: id } : { _id: id };
      const appDoc = await Application.findOne(query);
      if (!appDoc) return res.status(404).json({ message: 'Not found' });
      appDoc.applicationStatus = status;
      appDoc.activityLogs = appDoc.activityLogs || [];
      appDoc.activityLogs.push(activity);
      const message = `Your application status has been updated to: ${status}`;
      appDoc.notifications = appDoc.notifications || [];
      appDoc.notifications.push({ type: 'status-update', message, sentAt: new Date(), delivered: false });
      await appDoc.save();
      console.log(`[notify] to ${appDoc.email || appDoc.nationalId}: ${message}`);
      return res.json({ ...appDoc.toObject(), id: appDoc.nationalId });
    }
    logFallbackUsage('PUT update application status');
    const found = inMemoryApps.find(a => a.nationalId === id || a.id === id);
    if (!found) return res.status(404).json({ message: 'Not found' });
    found.applicationStatus = status;
    found.activityLogs = found.activityLogs || [];
    found.activityLogs.push(activity);
    found.notifications = found.notifications || [];
    const message = `Your application status has been updated to: ${status}`;
    found.notifications.push({ type: 'status-update', message, sentAt: new Date().toISOString(), delivered: false });
    console.log(`[notify-fallback] to ${found.email || found.nationalId}: ${message}`);
    return res.json(found);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Failed to update status', error: err.message });
  }
};

// GET activity logs
exports.getActivityLogs = async (req, res) => {
  try {
    const id = req.params.id;
    if (req.mongoConnected) {
      const isNationalId = /^\d{16}$/.test(id);
      const query = isNationalId ? { nationalId: id } : { _id: id };
      const appDoc = await Application.findOne(query).lean();
      if (!appDoc) return res.status(404).json({ message: 'Not found' });
      return res.json({ activityLogs: appDoc.activityLogs || [] });
    }
    logFallbackUsage('GET activity logs');
    const found = inMemoryApps.find(a => a.nationalId === id || a.id === id);
    if (!found) return res.status(404).json({ message: 'Not found' });
    return res.json({ activityLogs: found.activityLogs || [] });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Failed to fetch activity logs', error: err.message });
  }
};

// Health endpoint
exports.health = (req, res) => {
  res.json({
    mode: req.mongoConnected ? 'mongo' : (req.mongoFailed ? 'fallback' : 'connecting'),
    mongoConnected: req.mongoConnected,
    mongoFailed: req.mongoFailed,
    inMemoryCount: inMemoryApps.length,
  });
};
