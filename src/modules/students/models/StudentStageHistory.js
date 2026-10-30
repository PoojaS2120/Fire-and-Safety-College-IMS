const mongoose = require('mongoose');

const studentStageHistorySchema = new mongoose.Schema(
  {
    student_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Student',
      required: true,
      index: true,
    },

    from_stage: {
      type: String,
      default: null,
    },

    to_stage: {
      type: String,
      required: true,
      enum: [
        'enquiry',
        'admission',
        'documents',
        'fees',
        'material',
        'schedule',
        'class_test',
        'exam',
        'exam_form',
        'test',
        'result',
        'tc_lc',
      ],
    },

    stage_status: {
      type: String,
      required: true,
      enum: ['pending', 'in_progress', 'completed', 'blocked'],
      default: 'pending',
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

    remarks: {
      type: String,
      trim: true,
      default: null,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model(
  'StudentStageHistory',
  studentStageHistorySchema
);