
const mongoose = require('mongoose');

// Tracks every change made to a student's exam marks
const markHistorySchema = new mongoose.Schema(
  {
    old_marks: {
      type: Number,
      required: true,
    },

    new_marks: {
      type: Number,
      required: true,
    },

    old_remarks: {
      type: String,
      default: '',
    },

    new_remarks: {
      type: String,
      default: '',
    },

    changed_by: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },

    changed_at: {
      type: Date,
      default: Date.now,
    },

    change_source: {
      type: String,
      enum: ['manual', 'bulk_entry', 'bulk_import'],
      default: 'manual',
    },
  },
  {
    _id: true,
  }
);

const examMarkSchema = new mongoose.Schema(
  {
    exam_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Exam',
      required: true,
    },

    student_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Student',
      required: true,
    },

    marks_obtained: {
      type: Number,
      required: true,
      min: 0,
    },

    remarks: {
      type: String,
      trim: true,
      maxlength: 500,
      default: '',
    },

    entered_by: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },

    last_updated_by: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },

    history: {
      type: [markHistorySchema],
      default: [],
    },
  },
  {
    timestamps: true,
  }
);

// One marks record per student for each exam
examMarkSchema.index(
  {
    exam_id: 1,
    student_id: 1,
  },
  {
    unique: true,
  }
);

// Faster marks lookup for a particular exam
examMarkSchema.index({
  exam_id: 1,
  marks_obtained: -1,
});

// Faster student exam history lookup
examMarkSchema.index({
  student_id: 1,
  createdAt: -1,
});

module.exports = mongoose.model('ExamMark', examMarkSchema);
