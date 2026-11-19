const express = require('express');
const router = express.Router();
const paymentGatewayController = require('../controllers/paymentGatewayController');
const { verifyToken } = require('../../../middlewares/auth');
const { authorize } = require('../../../middlewares/authorize');

router.use(verifyToken);

// Works for both Admin and Student
router.post(
  '/order',
  authorize('student', 'super_admin', 'office_staff'),
  paymentGatewayController.createOrder
);

router.post(
  '/pay',
  authorize('student', 'super_admin', 'office_staff'),
  paymentGatewayController.processPayment
);

router.get(
  '/order/:orderId',
  authorize('student', 'super_admin', 'office_staff'),
  paymentGatewayController.getOrderStatus
);

router.delete(
  '/order/:orderId',
  authorize('student', 'super_admin', 'office_staff'),
  paymentGatewayController.cancelOrder
);

module.exports = router;