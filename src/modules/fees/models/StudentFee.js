// const mongoose = require('mongoose');

// const studentFeeSchema = new mongoose.Schema(
//   {
//     student_id: {
//       type: mongoose.Schema.Types.ObjectId,
//       ref: 'Student',
//       required: true,
//     },
//     course_id: {
//       type: mongoose.Schema.Types.ObjectId,
//       ref: 'Course',
//       required: true,
//     },
//     fee_component_id: {
//       type: mongoose.Schema.Types.ObjectId,
//       ref: 'FeeComponent',
//       required: true,
//     },
//     fee_name: {
//       type: String,
//       required: true,
//       trim: true,
//     },
//     amount_due: {
//       type: Number,
//       required: true,
//       min: 0,
//     },
//     amount_paid: {
//       type: Number,
//       default: 0,
//       min: 0,
//     },
//     due_date: {
//       type: Date,
//       default: null,
//     },
//     required_for_exam: {
//       type: Boolean,
//       default: false,
//     },
//     status: {
//       type: String,
//       enum: ['pending', 'partial', 'paid'],
//       default: 'pending',
//       required: true,
//     },
//     // NEW FIELDS FOR EDITING
//     updated_by: {
//       type: mongoose.Schema.Types.ObjectId,
//       ref: 'User',
//       default: null,
//     }
//   },
//   { timestamps: true }
// );

// studentFeeSchema.index(
//   { student_id: 1, fee_component_id: 1 },
//   { unique: true }
// );

// module.exports = mongoose.model('StudentFee', studentFeeSchema);





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

    // ===== Concession tracking =====
    original_amount: {
      type: Number,
      default: 0,
      min: 0,
      // Full fee amount. Stored on installment 1 only (0 on later rows).
    },
    concession_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ConcessionMaster',
      default: null,
    },
    concession_amount: {
      type: Number,
      default: 0,
      min: 0,
      // Full concession for the component. Stored on installment 1 only.
    },
    concession_reason: {
      type: String,
      default: null,
    },

    // ===== Per-installment net due =====
    amount_due: {
      type: Number,
      required: true,
      min: 0,
      // Net amount for THIS installment.
    },
    amount_paid: {
      type: Number,
      default: 0,
      min: 0,
    },

    // ===== Installment tracking (default = one-time) =====
    installment_number: {
      type: Number,
      default: 1,
      min: 1,
    },
    total_installments: {
      type: Number,
      default: 1,
      min: 1,
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

    // ===== Audit =====
    updated_by: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
  },
  { timestamps: true }
);

// Backwards-compatible with original (student_id, fee_component_id) unique rule:
// Non-installment fees always use installment_number = 1, so this remains one row
// per component. Installments get their own slot per (component, number).
studentFeeSchema.index(
  { student_id: 1, fee_component_id: 1, installment_number: 1 },
  { unique: true }
);

studentFeeSchema.index({ student_id: 1, status: 1 });
studentFeeSchema.index({ student_id: 1, due_date: 1 });

module.exports = mongoose.model('StudentFee', studentFeeSchema);