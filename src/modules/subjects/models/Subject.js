const mongoose = require('mongoose');

const subjectSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Subject name is required'],
      trim: true,
      maxlength: 150,
    },
    course_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Course',
      required: [true, 'Course is required'], // Links subject to a course
    },
    description: {
      type: String,
      trim: true,
      default: '',
    },
    status: {
      type: String,
      enum: ['active', 'inactive'],
      default: 'active',
    },
    created_by: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    }
  },
  { timestamps: true }
);

// A course can have multiple subjects, but we might want to ensure 
// the same subject name isn't added twice to the SAME course.
subjectSchema.index({ name: 1, course_id: 1 }, { unique: true });

module.exports = mongoose.model('Subject', subjectSchema);