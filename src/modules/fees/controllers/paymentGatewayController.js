const paymentGatewayService = require('../services/paymentGatewayService');

exports.createOrder = async (req, res, next) => {
  try {
    const { studentId, feeId, amount } = req.body;

    if (!studentId || !feeId || !amount) {
      return res.status(400).json({
        success: false,
        message: 'studentId, feeId, and amount are required.',
      });
    }

    const result = await paymentGatewayService.createOrder(
      studentId,
      feeId,
      Number(amount),
      req.user
    );

    res.status(201).json({
      success: true,
      message: 'Payment order created.',
      data: result,
    });
  } catch (err) { next(err); }
};

exports.processPayment = async (req, res, next) => {
  try {
    const { orderId } = req.body;
    if (!orderId) {
      return res.status(400).json({ success: false, message: 'orderId is required.' });
    }

    const result = await paymentGatewayService.processPayment(orderId, req.user);

    res.status(200).json({
      success: true,
      message: 'Payment processed successfully.',
      data: result,
    });
  } catch (err) { next(err); }
};

exports.getOrderStatus = async (req, res, next) => {
  try {
    const result = await paymentGatewayService.getOrderStatus(req.params.orderId);
    res.status(200).json({ success: true, data: result });
  } catch (err) { next(err); }
};

exports.cancelOrder = async (req, res, next) => {
  try {
    const result = await paymentGatewayService.cancelOrder(req.params.orderId);
    res.status(200).json({ success: true, message: result.message });
  } catch (err) { next(err); }
};