const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { verifyToken } = require('../../../middlewares/auth');

// POST /api/v1/auth/login
router.post('/login', authController.login);

// GET /api/v1/auth/me (Example of a protected route)
router.get('/me', verifyToken, (req, res) => {
  res.status(200).json({ 
    success: true, 
    message: 'You accessed a protected route', 
    user: req.user 
  });
});

module.exports = router;