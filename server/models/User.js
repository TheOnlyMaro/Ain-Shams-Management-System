const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  password: { type: String, required: true, select: false },
  phone: { type: String },
  role: { type: String, enum: ['student','admin','staff','parent'], default: 'student' },
  // For staff users, indicate what type of staff (e.g. admissions).
  // Do not default to null because Mongoose enum validation will reject null.
  // Leave undefined when not set so validation only runs when a value is provided.
  staffType: { type: String, enum: ['admissions', 'other'], default: undefined },
  // Refresh tokens issued to this user (opaque tokens stored for rotation/revocation)
  refreshTokens: [{ token: String, createdAt: { type: Date, default: Date.now } }],
  specialInfo: { type: String },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.models.User || mongoose.model('User', UserSchema);
