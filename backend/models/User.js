const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  password: { type: String, required: true, select: false },
  phone: { type: String },
  role: { type: String, enum: ['student','admin','staff','parent'], default: 'student' },
  specialInfo: { type: String }, // studentID / employeeID / etc
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('User', UserSchema);
