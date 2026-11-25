// const mongoose = require('mongoose');

// const feeComponentSchema = new mongoose.Schema(
//   {
//     course_id: {
//       type: mongoose.Schema.Types.ObjectId,
//       ref: 'Course',
//       required: true,
//     },
//     name: {
//       type: String,
//       required: true,
//       trim: true,
//       // e.g., Admission Fee, Tuition Fee
//     },
//     amount: {
//       type: Number,
//       required: true,
//       min: 0,
//     },
//     required_for_exam: {
//       type: Boolean,
//       default: false,
//       // If true, student can't take exam if this is unpaid
//     },
//     status: {
//       type: String,
//       enum: ['active', 'inactive'],
//       default: 'active',
//     },

//     // ===== Installment configuration (optional) =====
//     installment_config: {
//       type: {
//         type: String,
//         enum: ['one_time', 'installments'],
//         default: 'one_time',
//       },
//       number_of_installments: {
//         type: Number,
//         enum: [1, 2, 4],
//         default: 1,
//       },
//     },

//     created_by: {
//       type: mongoose.Schema.Types.ObjectId,
//       ref: 'User',
//       default: null,
//     },
//   },
//   { timestamps: true }
// );

// feeComponentSchema.index({ course_id: 1, status: 1 });

// module.exports = mongoose.model('FeeComponent', feeComponentSchema);



const mongoose = require('mongoose');

const installmentPlanSchema = new mongoose.Schema(
  {
    plan_name: {
      type: String,
      required: true,
      trim: true,
      // e.g., "2 Installments", "4 Installments (Quarterly)"
    },
    number_of_installments: {
      type: Number,
      required: true,
      min: 2,
      max: 12,
    },
    total_amount: {
      type: Number,
      required: true,
      min: 0,
      // The total the student pays under this plan (typically > one_time_amount)
    },
    // Custom amounts per installment. Length must equal number_of_installments.
    // Sum of these MUST equal total_amount (validated in service + UI).
    installment_amounts: [
      {
        type: Number,
        min: 0,
        required: true,
      },
    ],
    // Optional: due dates relative to admission (in days)
    due_days_from_start: [
      {
        type: Number,
        default: 0,
        min: 0,
      },
    ],
  },
  { _id: true }
);

const feeComponentSchema = new mongoose.Schema(
  {
    course_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Course',
      required: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },

    // ===== ONE-TIME PAYMENT =====
    one_time_amount: {
      type: Number,
      required: true,
      min: 0,
    },

    // ===== INSTALLMENT PLANS =====
    installment_plans: {
      type: [installmentPlanSchema],
      default: [],
    },

    required_for_exam: {
      type: Boolean,
      default: false,
    },
    status: {
      type: String,
      enum: ['active', 'inactive'],
      default: 'active',
    },

    created_by: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
  },
  { timestamps: true }
);

feeComponentSchema.index({ course_id: 1, status: 1 });

module.exports = mongoose.model('FeeComponent', feeComponentSchema);