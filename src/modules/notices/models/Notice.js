const mongoose = require('mongoose');

const noticeSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Notice title is required'],
      trim: true,
      maxlength: [200, 'Title cannot exceed 200 characters']
    },

    description: {
      type: String,
      required: [true, 'Notice description is required'],
      trim: true
    },

    targetType: {
      type: String,
      enum: ['all', 'course', 'batch'],
      required: true,
      default: 'all'
    },

    targetCourse: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Course',
      default: null
    },

    targetBatch: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Batch',
      default: null
    },

    status: {
      type: String,
      enum: ['draft', 'published', 'withdrawn'],
      default: 'draft'
    },

    publishedAt: {
      type: Date,
      default: null
    },

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    }
  },
  {
    timestamps: true
  }
);

// Validate target selection
noticeSchema.pre('validate', function () {
  if (this.targetType === 'course' && !this.targetCourse) {
    throw new Error('Target course is required');
  }

  if (this.targetType === 'batch' && !this.targetBatch) {
    throw new Error('Target batch is required');
  }

  if (this.targetType === 'all') {
    this.targetCourse = null;
    this.targetBatch = null;
  }
});

module.exports = mongoose.model('Notice', noticeSchema);