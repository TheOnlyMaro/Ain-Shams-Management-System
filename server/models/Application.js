const mongoose = require('mongoose');

const FileMetaSchema = new mongoose.Schema({
  url: String,
  originalName: String,
  filename: String,
}, { _id: false });

<<<<<<< HEAD
=======
const ActivitySchema = new mongoose.Schema({
  staffId: { type: String },
  action: { type: String }, // e.g. "status:approved"
  note: { type: String, default: '' },
  timestamp: { type: Date, default: Date.now },
}, { _id: false });

const NotificationSchema = new mongoose.Schema({
  type: { type: String }, // e.g. "status-update"
  message: { type: String },
  sentAt: { type: Date, default: Date.now },
  delivered: { type: Boolean, default: false },
}, { _id: false });

>>>>>>> 99749da4f337fe38c463f12c1c119177a2958084
const ApplicationSchema = new mongoose.Schema({
  studentName: { type: String },
  email: {
    type: String,
    validate: {
      validator: function (v) {
        if (!v) return true;
        // simple email regex
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
      },
      message: 'Invalid email'
    }
  },
  phoneNumber: { type: String },
  appliedProgram: { type: String },
  gpa: { type: Number, min: 0, max: 4 },
  testScore: { type: Number, min: 0, max: 100 },
  age: { type: Number, min: 0 },
  nationalId: {
    type: String,
    required: true,
    unique: true,
    index: true,
    validate: {
      validator: function (v) { return /^\d{16}$/.test(v); },
      message: 'nationalId must be exactly 16 digits'
    }
  },
  idPhoto: { type: String },
  selfiePhoto: { type: String },
  certificates: { type: [FileMetaSchema], default: [] },
  documents: { type: [FileMetaSchema], default: [] },
<<<<<<< HEAD
=======
  activityLogs: { type: [ActivitySchema], default: [] },
  notifications: { type: [NotificationSchema], default: [] },
>>>>>>> 99749da4f337fe38c463f12c1c119177a2958084
  submittedAt: { type: Date, default: Date.now },
  applicationStatus: { type: String, default: 'pending' },
  rejectionReason: { type: String, default: null },
}, { timestamps: true });

// create unique index for nationalId
ApplicationSchema.index({ nationalId: 1 }, { unique: true });

module.exports = mongoose.models.Application || mongoose.model('Application', ApplicationSchema);
