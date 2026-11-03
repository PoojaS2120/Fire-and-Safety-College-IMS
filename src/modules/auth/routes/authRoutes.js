// const express = require('express');
// const router = express.Router();
// const authController = require('../controllers/authController');
// const { verifyToken } = require('../../../middlewares/auth');

// // Public Routes
// router.post('/login', authController.login); // For Staff/Admin
// router.post('/student-login', authController.studentLogin); // For App (Name + Phone)

// router.post('/refresh', authController.refresh);
// router.post('/forgot-password', authController.forgotPassword);
// router.post('/reset-password', authController.resetPassword);

// // Protected Routes (Require Token)
// router.post('/logout', verifyToken, authController.logout);
// router.get('/me', verifyToken, authController.getMe);
// router.put('/change-password', verifyToken, authController.changePassword);

// module.exports = router;

const express = require('express');
const router = express.Router();
const rateLimit = require('express-rate-limit');
const authController = require('../controllers/authController');
const { verifyToken } = require('../../../middlewares/auth');

// Rate Limiter for Login Routes (Max 5 attempts per 15 min per IP)
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Limit each IP to 5 requests per windowMs
  message: { 
    success: false, 
    message: 'Too many login attempts from this IP. Please try again after 15 minutes.' 
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Public Routes
router.post('/login', loginLimiter, authController.login);
router.post('/student-login', loginLimiter, authController.studentLogin);
router.post('/refresh', authController.refresh);
router.post('/forgot-password', authController.forgotPassword);
router.post('/reset-password', authController.resetPassword);

// Protected Routes
router.post('/logout', verifyToken, authController.logout);
router.get('/me', verifyToken, authController.getMe);
router.put('/change-password', verifyToken, authController.changePassword);

module.exports = router;