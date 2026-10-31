
const mongoose = require('mongoose');

const paymentAllocationSchema = new mongoose.Schema(
  {
    payment_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Payment',
      required: true,
    },

    student_fee_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'StudentFee',
      required: true,
    },

    amount: {
      type: Number,
      required: true,
      min: 0.01,
    },
  },
  { timestamps: true }
);

// Efficient lookup of allocations belonging to a payment.
paymentAllocationSchema.index({ payment_id: 1 });

// Efficient lookup of payments allocated to a fee record.
paymentAllocationSchema.index({ student_fee_id: 1 });

module.exports = mongoose.model(
  'PaymentAllocation',
  paymentAllocationSchema
);
