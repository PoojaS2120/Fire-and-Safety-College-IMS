// const mongoose = require('mongoose');

// const feeComponentSchema = new mongoose.Schema({
//   course_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Course', required: true },
//   name: { type: String, required: true }, // e.g., Admission Fee, Tuition Fee
//   amount: { type: Number, required: true },
//   required_for_exam: { type: Boolean, default: false }, // If true, student can't take exam if this is unpaid
//   status: { type: String, enum: ['active', 'inactive'], default: 'active' }
// }, { timestamps: true });

// module.exports = mongoose.model('FeeComponent', feeComponentSchema);



const mongoose = require('mongoose');

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
      // e.g., Admission Fee, Tuition Fee
    },
    amount: {
      type: Number,
      required: true,
      min: 0,
    },
    required_for_exam: {
      type: Boolean,
      default: false,
      // If true, student can't take exam if this is unpaid
    },
    status: {
      type: String,
      enum: ['active', 'inactive'],
      default: 'active',
    },

    // ===== Installment configuration (optional) =====
    installment_config: {
      type: {
        type: String,
        enum: ['one_time', 'installments'],
        default: 'one_time',
      },
      number_of_installments: {
        type: Number,
        enum: [1, 2, 4],
        default: 1,
      },
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