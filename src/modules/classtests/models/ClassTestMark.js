
const mongoose = require('mongoose');

// Tracks every change made to a student's marks
const markHistorySchema = new mongoose.Schema(
  {
    old_marks: {
      type: Number,
      required: true
    },

    new_marks: {
      type: Number,
      required: true
    },

    old_remarks: {
      type: String,
      default: ''
    },

    new_remarks: {
      type: String,
      default: ''
    },

    changed_by: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },

    changed_at: {
      type: Date,
      default: Date.now
    },

    change_source: {
      type: String,
      enum: ['manual', 'bulk_import', 'bulk_entry'],
      default: 'manual'
    }
  },
  {
    _id: true
  }
);

const classTestMarkSchema = new mongoose.Schema(
  {
    class_test_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ClassTest',
      required: true
    },

    student_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Student',
      required: true
    },

    marks_obtained: {
      type: Number,
      required: true,
      min: 0
    },

    remarks: {
      type: String,
      trim: true,
      maxlength: 500,
      default: ''
    },

    entered_by: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },

    last_updated_by: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },

    history: {
      type: [markHistorySchema],
      default: []
    }
  },
  {
    timestamps: true
  }
);

// A student can have only one marks record per class test
classTestMarkSchema.index(
  {
    class_test_id: 1,
    student_id: 1
  },
  {
    unique: true
  }
);

// Faster marks lookup for a particular test
classTestMarkSchema.index({
  class_test_id: 1,
  marks_obtained: -1
});

module.exports = mongoose.model(
  'ClassTestMark',
  classTestMarkSchema
);
