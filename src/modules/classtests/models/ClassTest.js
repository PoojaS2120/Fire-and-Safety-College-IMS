
const mongoose = require('mongoose');

const classTestSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Test title is required'],
      trim: true,
      maxlength: 120
    },

    description: {
      type: String,
      trim: true,
      maxlength: 1000,
      default: ''
    },

    course_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Course',
      required: true
    },

    batch_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Batch',
      required: true
    },

    faculty_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },

    subject: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100
    },

    test_date: {
      type: Date,
      required: true
    },

    max_marks: {
      type: Number,
      required: true,
      min: 1
    },

    passing_marks: {
      type: Number,
      required: true,
      min: 0
    },

    duration_minutes: {
      type: Number,
      min: 1,
      default: null
    },

    status: {
      type: String,
      enum: [
        'draft',
        'scheduled',
        'completed',
        'cancelled',
        'archived'
      ],
      default: 'scheduled'
    },

    created_by: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },

    updated_by: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    },

    deleted_at: {
      type: Date,
      default: null
    }
  },
  {
    timestamps: true
  }
);

// Indexes for faster filtering
classTestSchema.index({
  course_id: 1,
  batch_id: 1,
  test_date: -1
});

classTestSchema.index({
  faculty_id: 1,
  status: 1
});

module.exports = mongoose.model('ClassTest', classTestSchema);
