const mongoose = require('mongoose');

const studentFeeSchema = new mongoose.Schema(
  {
    student_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Student',
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

    total_amount: {
      type: Number,
      required: true,
      min: 0,
    },

    paid_amount: {
      type: Number,
      default: 0,
      min: 0,
    },

    balance_amount: {
      type: Number,
      required: true,
      min: 0,
    },

    required_for_exam: {
      type: Boolean,
      default: false,
    },

    status: {
      type: String,
      enum: ['pending', 'partial', 'paid'],
      default: 'pending',
    },
  },
  { timestamps: true }
);

// Prevent duplicate fee components for the same student.
studentFeeSchema.index(
  { student_id: 1, fee_component_id: 1 },
  { unique: true }
);

module.exports =
  mongoose.models.StudentFee ||
  mongoose.model('StudentFee', studentFeeSchema);
