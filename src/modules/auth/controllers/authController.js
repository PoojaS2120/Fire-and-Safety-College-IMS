const authService = require('../services/authService');
const { loginSchema } = require('../validations/authValidation');

exports.login = async (req, res, next) => {
  try {
    // 1. Validate Request Body
    const { error } = loginSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ success: false, message: error.details[0].message });
    }

    // 2. Call Service
    const { email, password } = req.body;
    const data = await authService.loginUser(email, password);

    // 3. Send Response
    res.status(200).json({
      success: true,
      message: 'Login successful',
      data
    });
  } catch (error) {
    next(error);
  }
};