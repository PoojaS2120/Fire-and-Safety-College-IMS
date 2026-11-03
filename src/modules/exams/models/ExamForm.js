const mongoose = require('mongoose');

const examFormSchema = new mongoose.Schema(
  {
    student_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Student',
      required: true,
      index: true,
    },

    exam_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Exam',
      required: true,
      index: true,
    },

    status: {
      type: String,
      enum: ['pending', 'submitted', 'blocked', 'overridden'],
      default: 'pending',
      required: true,
    },

    block_reason: {
      type: String,
      default: null,
    },

    pending_fee_components: [
      {
        fee_component_id: { type: mongoose.Schema.Types.ObjectId, ref: 'FeeComponent' },
        fee_name: { type: String },
        amount_due: { type: Number },
        amount_paid: { type: Number },
        balance: { type: Number },
      },
    ],

    submitted_at: {
      type: Date,
      default: null,
    },

    override_by: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },

    override_reason: {
      type: String,
      default: null,
    },

    overridden_at: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

// One form per student per exam
examFormSchema.index(
  { student_id: 1, exam_id: 1 },
  { unique: true }
);

examFormSchema.index({ exam_id: 1, status: 1 });

module.exports = mongoose.model('ExamForm', examFormSchema);