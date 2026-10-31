
const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema(
  {
    student_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Student',
      required: true,
    },

    amount: {
      type: Number,
      required: true,
      min: 0.01,
    },

    payment_date: {
      type: Date,
      required: true,
      default: Date.now,
    },

    mode: {
      type: String,
      enum: ['cash', 'upi', 'bank', 'cheque'],
      required: true,
    },

    reference_no: {
      type: String,
      trim: true,
      maxlength: 60,
      default: null,
    },

    receipt_no: {
      type: String,
      unique: true,
      required: true,
      trim: true,
    },

    status: {
      type: String,
      enum: ['active', 'cancelled'],
      default: 'active',
      required: true,
    },

    created_by: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },

    cancelled_by: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },

    cancel_reason: {
      type: String,
      trim: true,
      default: null,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Payment', paymentSchema);
