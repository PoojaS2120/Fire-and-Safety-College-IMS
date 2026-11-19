const mongoose = require('mongoose');

const paymentOrderSchema = new mongoose.Schema({
  order_id: {
    type: String,
    required: true,
    unique: true,
  },
  student_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Student',
    required: true,
  },
  fee_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'StudentFee',
    required: true,
  },
  amount: {
    type: Number,
    required: true,
    min: 0,
  },
  currency: {
    type: String,
    default: 'INR',
  },
  gateway: {
    type: String,
    enum: ['manual', 'razorpay', 'stripe', 'payu', 'cashfree'],
    default: 'manual', // Switch to real gateway later
  },
  status: {
    type: String,
    enum: ['created', 'paid', 'failed', 'cancelled'],
    default: 'created',
  },
  gateway_order_id: {
    type: String,
    default: null,
    // For manual: same as order_id; for razorpay: razorpay_order_id
  },
  gateway_payment_id: {
    type: String,
    default: null,
    // For manual: DUMMY_PAY_xxx; for razorpay: pay_xxxxx
  },
  paid_at: {
    type: Date,
    default: null,
  },
  initiated_by: {
    type: String,
    enum: ['super_admin', 'office_staff', 'student'],
    default: 'student',
  },
  created_by: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null,
  },
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {},
    // For storing gateway-specific response
  },
}, { timestamps: true });

module.exports = mongoose.model('PaymentOrder', paymentOrderSchema);