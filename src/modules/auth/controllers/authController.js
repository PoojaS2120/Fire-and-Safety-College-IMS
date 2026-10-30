// const authService = require('../services/authService');
// const { loginSchema } = require('../validations/authValidation');

// // 1. LOGIN
// exports.login = async (req, res, next) => {
//   try {
//     const { error } = loginSchema.validate(req.body);
//     if (error) return res.status(400).json({ success: false, message: error.details[0].message });

//     const data = await authService.loginUser(req.body.email, req.body.password);
//     res.status(200).json({ success: true, message: 'Login successful', data });
//   } catch (error) { next(error); }
// };

// // 2. REFRESH
// exports.refresh = async (req, res, next) => {
//   try {
//     const { refreshToken } = req.body;
//     if (!refreshToken) return res.status(400).json({ success: false, message: 'Refresh token required' });

//     const data = await authService.refreshToken(refreshToken);
//     res.status(200).json({ success: true, data });
//   } catch (err) { next(err); }
// };

// // 3. LOGOUT
// exports.logout = async (req, res, next) => {
//   try {
//     // For now, frontend just deletes the token from local storage
//     res.status(200).json({ success: true, message: 'Logged out successfully' });
//   } catch (err) { next(err); }
// };

// // 4. CHANGE PASSWORD
// exports.changePassword = async (req, res, next) => {
//   try {
//     const { oldPassword, newPassword } = req.body;
//     if (!oldPassword || !newPassword) {
//       return res.status(400).json({ success: false, message: 'Old and new passwords are required' });
//     }

//     const result = await authService.changePassword(req.user.id, oldPassword, newPassword);
//     res.status(200).json({ success: true, message: result.message });
//   } catch (err) { next(err); }
// };

// // 5. FORGOT PASSWORD
// exports.forgotPassword = async (req, res, next) => {
//   try {
//     const { email } = req.body;
//     if (!email) return res.status(400).json({ success: false, message: 'Email is required' });

//     const data = await authService.forgotPassword(email);
//     res.status(200).json({ 
//       success: true, 
//       message: 'Reset token generated', 
//       data // REMOVE THIS IN PRODUCTION!
//     });
//   } catch (err) { next(err); }
// };

// // 6. RESET PASSWORD
// exports.resetPassword = async (req, res, next) => {
//   try {
//     const { token, password } = req.body;
//     if (!token || !password) return res.status(400).json({ success: false, message: 'Token and new password required' });

//     const result = await authService.resetPassword(token, password);
//     res.status(200).json({ success: true, message: result.message });
//   } catch (err) { next(err); }
// };

// // 7. GET ME (Profile)
// exports.getMe = async (req, res, next) => {
//   try {
//     // req.user comes from the verifyToken middleware
//     res.status(200).json({ success: true, user: req.user });
//   } catch (err) { next(err); }
// };




const authService = require('../services/authService');
const { loginSchema, studentLoginSchema } = require('../validations/authValidation');

// 1. LOGIN (Staff & Admin)
exports.login = async (req, res, next) => {
  try {
    const { error } = loginSchema.validate(req.body);
    if (error) return res.status(400).json({ success: false, message: error.details[0].message });

    const data = await authService.loginUser(req.body.email, req.body.password);
    res.status(200).json({ success: true, message: 'Login successful', data });
  } catch (error) { next(error); }
};

// NEW: 1.5 STUDENT LOGIN (Name + Phone)
exports.studentLogin = async (req, res, next) => {
  try {
    const { error } = studentLoginSchema.validate(req.body);
    if (error) return res.status(400).json({ success: false, message: error.details[0].message });

    const data = await authService.studentLoginUser(req.body.name, req.body.phone);
    res.status(200).json({ success: true, message: 'Student login successful', data });
  } catch (error) { next(error); }
};

// 2. REFRESH
exports.refresh = async (req, res, next) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) return res.status(400).json({ success: false, message: 'Refresh token required' });

    const data = await authService.refreshToken(refreshToken);
    res.status(200).json({ success: true, data });
  } catch (err) { next(err); }
};

// 3. LOGOUT
exports.logout = async (req, res, next) => {
  try {
    res.status(200).json({ success: true, message: 'Logged out successfully' });
  } catch (err) { next(err); }
};

// 4. CHANGE PASSWORD
exports.changePassword = async (req, res, next) => {
  try {
    const { oldPassword, newPassword } = req.body;
    if (!oldPassword || !newPassword) {
      return res.status(400).json({ success: false, message: 'Old and new passwords are required' });
    }

    const result = await authService.changePassword(req.user.id, oldPassword, newPassword);
    res.status(200).json({ success: true, message: result.message });
  } catch (err) { next(err); }
};

// 5. FORGOT PASSWORD
exports.forgotPassword = async (req, res, next) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ success: false, message: 'Email is required' });

    const data = await authService.forgotPassword(email);
    res.status(200).json({ 
      success: true, 
      message: 'Reset token generated', 
      data
    });
  } catch (err) { next(err); }
};

// 6. RESET PASSWORD
exports.resetPassword = async (req, res, next) => {
  try {
    const { token, password } = req.body;
    if (!token || !password) return res.status(400).json({ success: false, message: 'Token and new password required' });

    const result = await authService.resetPassword(token, password);
    res.status(200).json({ success: true, message: result.message });
  } catch (err) { next(err); }
};

// 7. GET ME (Profile)
exports.getMe = async (req, res, next) => {
  try {
    res.status(200).json({ success: true, user: req.user });
  } catch (err) { next(err); }
};