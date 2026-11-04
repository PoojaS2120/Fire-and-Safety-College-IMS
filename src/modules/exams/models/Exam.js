
const mongoose = require('mongoose');

const examSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Exam title is required'],
      trim: true,
      maxlength: 120,
    },

    description: {
      type: String,
      trim: true,
      maxlength: 1000,
      default: '',
    },

    course_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Course',
      required: true,
    },

    batch_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Batch',
      required: true,
    },

    faculty_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },

    subject: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
    },

    // Oral or Written examination
    exam_type: {
      type: String,
      enum: ['oral', 'written', 'practical', 'online'],
      required: [true, 'Exam type is required'],
      lowercase: true,
      trim: true,
    },

    exam_date: {
      type: Date,
      required: true,
    },

    // Student exam form submission window
    form_start_date: {
      type: Date,
      required: true,
    },

    form_end_date: {
      type: Date,
      required: true,
    },

    max_marks: {
      type: Number,
      required: true,
      min: 1,
    },

    passing_marks: {
      type: Number,
      required: true,
      min: 0,
    },

    duration_minutes: {
      type: Number,
      min: 1,
      default: null,
    },

    status: {
      type: String,
      enum: [
        'draft',
        'scheduled',
        'ongoing',
        'completed',
        'cancelled',
        'archived',
      ],
      default: 'scheduled',
    },

    // =========================================
    // B-36: RESULT PUBLICATION MANAGEMENT
    // =========================================

    result_status: {
      type: String,
      enum: ['draft', 'published'],
      default: 'draft',
      index: true,
    },

    published_at: {
      type: Date,
      default: null,
    },

    published_by: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },

    created_by: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },

    updated_by: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },

    deleted_at: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// Validate marks configuration
examSchema.pre('validate', function () {
  if (
    this.max_marks != null &&
    this.passing_marks != null &&
    this.passing_marks > this.max_marks
  ) {
    this.invalidate(
      'passing_marks',
      'Passing marks cannot exceed maximum marks'
    );
  }

  if (
    this.form_start_date &&
    this.form_end_date &&
    this.form_end_date < this.form_start_date
  ) {
    this.invalidate(
      'form_end_date',
      'Form end date cannot be before form start date'
    );
  }
});

// Indexes for faster exam filtering
examSchema.index({
  course_id: 1,
  batch_id: 1,
  exam_date: -1,
});

examSchema.index({
  faculty_id: 1,
  status: 1,
});

examSchema.index({
  exam_type: 1,
  status: 1,
});

module.exports = mongoose.model('Exam', examSchema);
