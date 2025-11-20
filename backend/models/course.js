const mongoose = require('mongoose');

const materialSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    type: {
      type: String,
      enum: ['pdf', 'video', 'document', 'presentation', 'link'],
      default: 'document',
    },
    fileUrl: { type: String, required: true },
    fileSize: { type: String },
    uploadedBy: { type: String, required: true },
    uploadedAt: { type: Date, default: Date.now },
    description: { type: String },
  },
  { _id: false }
);

const courseSchema = new mongoose.Schema(
  {
    code: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      required: true,
      trim: true,
    },
    instructor: {
      type: String,
      required: true,
      trim: true,
    },
    instructorEmail: {
      type: String,
      trim: true,
      lowercase: true,
    },
    schedule: {
      type: String,
      required: true,
    },
    location: {
      type: String,
      default: 'TBD',
    },
    credits: {
      type: Number,
      required: true,
      min: 1,
      max: 6,
    },
    capacity: {
      type: Number,
      required: true,
      min: 1,
    },
    enrolled: {
      type: Number,
      default: 0,
      min: 0,
    },
    status: {
      type: String,
      enum: ['draft', 'published', 'archived'],
      default: 'published',
    },
    tags: {
      type: [String],
      default: [],
    },
    students: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
    materials: [materialSchema],
    metadata: {
      department: { type: String, trim: true },
      level: { type: String, trim: true },
      semester: { type: String, trim: true },
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

courseSchema.virtual('availableSeats').get(function seatCount() {
  return Math.max(this.capacity - this.enrolled, 0);
});

module.exports = mongoose.model('Course', courseSchema);