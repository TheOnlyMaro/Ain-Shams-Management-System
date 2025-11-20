const mongoose = require('mongoose');

const GradeSchema = new mongoose.Schema({
  course: { type: mongoose.Schema.Types.ObjectId, ref: 'Course' },
  assignment: { type: mongoose.Schema.Types.ObjectId, ref: 'Assignment' },
  student: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  points: { type: Number },
  feedback: { type: String },
}, { timestamps: true });

module.exports = mongoose.models.Grade || mongoose.model('Grade', GradeSchema);
