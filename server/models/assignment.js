const mongoose = require('mongoose');

const AssignmentSchema = new mongoose.Schema({
  course: { type: mongoose.Schema.Types.ObjectId, ref: 'Course' },
  title: { type: String },
  description: { type: String },
  dueDate: { type: Date },
  totalPoints: { type: Number },
}, { timestamps: true });

module.exports = mongoose.models.Assignment || mongoose.model('Assignment', AssignmentSchema);
