const mongoose = require('mongoose');

const studentFeeSchema = new mongoose.Schema(
  {
    student_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Student',
      required: true,
    },

    course_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Course',
      required: true,
    },

    fee_component_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'FeeComponent',
      required: true,
    },

    fee_name: {
      type: String,
      required: true,
      trim: true,
    },

    amount_due: {
      type: Number,
      required: true,
      min: 0,
    },

    amount_paid: {
      type: Number,
      default: 0,
      min: 0,
    },

    due_date: {
      type: Date,
      default: null,
    },

    required_for_exam: {
      type: Boolean,
      default: false,
    },

    status: {
      type: String,
      enum: ['pending', 'partial', 'paid'],
      default: 'pending',
      required: true,
    },
  },
  { timestamps: true }
);

// One ledger entry per student per fee component.
studentFeeSchema.index(
  { student_id: 1, fee_component_id: 1 },
  { unique: true }
);

module.exports = mongoose.model('StudentFee', studentFeeSchema);