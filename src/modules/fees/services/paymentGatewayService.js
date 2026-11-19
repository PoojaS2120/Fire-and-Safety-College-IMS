const crypto = require('crypto');
const PaymentOrder = require('../models/PaymentOrder');
const StudentFee = require('../models/StudentFee');
const feeService = require('./feeService');

const createError = (statusCode, message) => {
  const err = new Error(message);
  err.statusCode = statusCode;
  return err;
};

// ================================================================
// 1. CREATE ORDER
// ================================================================
exports.createOrder = async (studentId, feeId, amount, user) => {
  const fee = await StudentFee.findById(feeId);
  if (!fee) throw createError(404, 'Fee record not found.');

  if (String(fee.student_id) !== String(studentId)) {
    throw createError(403, 'This fee does not belong to the student.');
  }

  if (fee.status === 'paid') {
    throw createError(400, 'This installment is already paid.');
  }

  const pendingAmount = fee.amount_due - fee.amount_paid;
  if (amount > pendingAmount) {
    throw createError(400, `Payment exceeds pending amount of ₹${pendingAmount}.`);
  }

  // Generate order ID
  const gatewayOrderId = `ORD_${feeId}_${Date.now()}`;

  // 🔄 When integrating real gateway:
  // Replace this block with razorpay.orders.create(...)
  // and set gateway: 'razorpay', gateway_order_id: order.id

  const order = await PaymentOrder.create({
    order_id: `ORD_${crypto.randomBytes(6).toString('hex')}`,
    student_id: studentId,
    fee_id: feeId,
    amount,
    currency: 'INR',
    gateway: 'manual',
    status: 'created',
    gateway_order_id: gatewayOrderId,
    initiated_by: user.role,
    created_by: user.id,
  });

  return {
    orderId: order.order_id,
    gatewayOrderId: order.gateway_order_id,
    amount: order.amount,
    currency: order.currency,
    gateway: order.gateway,
    paymentUrl: `/pay/${order.order_id}`,
    initiatedBy: user.role,
  };
};

// ================================================================
// 2. PROCESS PAYMENT (Simulate "Pay Now" click)
// ================================================================
exports.processPayment = async (orderId, user) => {
  const order = await PaymentOrder.findOne({ order_id: orderId });
  if (!order) throw createError(404, 'Order not found.');

  if (order.status === 'paid') throw createError(400, 'This order is already paid.');
  if (order.status === 'cancelled') throw createError(400, 'This order has been cancelled.');

  // 🔄 When integrating real gateway:
  // 1. Verify signature here
  // 2. Call razorpay.payments.fetch(payment_id)
  // 3. Use payment.amount / 100

  // Manual gateway: generate a payment ID
  const gatewayPaymentId = `PAY_${crypto.randomBytes(8).toString('hex')}`;

  order.status = 'paid';
  order.gateway_payment_id = gatewayPaymentId;
  order.paid_at = new Date();
  await order.save();

  try {
    const paymentResult = await feeService.recordPayment(
      order.student_id,
      order.amount,
      'online',
      gatewayPaymentId,
      user.id,
      new Date(),
      null,
      order.fee_id,
      null
    );

    return {
      orderId: order.order_id,
      gatewayPaymentId: order.gateway_payment_id,
      status: 'paid',
      amount: order.amount,
      recordedPayment: paymentResult,
    };
  } catch (error) {
    order.status = 'failed';
    await order.save();
    throw error;
  }
};

// ================================================================
// 3. GET ORDER STATUS
// ================================================================
exports.getOrderStatus = async (orderId) => {
  const order = await PaymentOrder.findOne({ order_id: orderId })
    .populate('fee_id', 'fee_name installment_number')
    .lean();

  if (!order) throw createError(404, 'Order not found.');

  return {
    orderId: order.order_id,
    status: order.status,
    amount: order.amount,
    gateway: order.gateway,
    gatewayPaymentId: order.gateway_payment_id,
    paidAt: order.paid_at,
    initiatedBy: order.initiated_by,
    fee: order.fee_id,
  };
};

// ================================================================
// 4. CANCEL ORDER
// ================================================================
exports.cancelOrder = async (orderId) => {
  const order = await PaymentOrder.findOne({ order_id: orderId });
  if (!order) throw createError(404, 'Order not found.');
  if (order.status === 'paid') throw createError(400, 'Cannot cancel a paid order.');

  order.status = 'cancelled';
  await order.save();

  return { message: 'Order cancelled successfully.' };
};