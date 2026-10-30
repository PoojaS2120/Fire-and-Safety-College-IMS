// const User = require('../models/User');
// const jwt = require('jsonwebtoken');
// const crypto = require('crypto');

// // 1. LOGIN
// exports.loginUser = async (email, password) => {
//   const user = await User.findOne({ email });
//   if (!user) throw { statusCode: 401, message: 'Invalid credentials' };

//   if (!user.is_active) throw { statusCode: 403, message: 'Account is deactivated' };

//   const isMatch = await user.matchPassword(password);
//   if (!isMatch) throw { statusCode: 401, message: 'Invalid credentials' };

//   // Generate Access Token (15m)
//   const accessToken = jwt.sign(
//     { id: user._id, role: user.role }, 
//     process.env.JWT_ACCESS_SECRET, 
//     { expiresIn: process.env.JWT_ACCESS_TTL }
//   );

//   // Generate Refresh Token (7 days)
//   const refreshToken = jwt.sign(
//     { id: user._id, role: user.role }, 
//     process.env.JWT_REFRESH_SECRET, 
//     { expiresIn: `${process.env.REFRESH_TTL_DAYS}d` }
//   );

//   return {
//     accessToken,
//     refreshToken,
//     user: { id: user._id, name: user.name, email: user.email, role: user.role }
//   };
// };

// // 2. REFRESH TOKEN
// exports.refreshToken = (refreshToken) => {
//   try {
//     const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
    
//     // Generate new Access Token
//     const newAccessToken = jwt.sign(
//       { id: decoded.id, role: decoded.role },
//       process.env.JWT_ACCESS_SECRET,
//       { expiresIn: process.env.JWT_ACCESS_TTL }
//     );
//     return { accessToken: newAccessToken };
//   } catch (error) {
//     throw { statusCode: 401, message: 'Invalid or expired refresh token' };
//   }
// };

// // 3. CHANGE PASSWORD
// exports.changePassword = async (userId, oldPassword, newPassword) => {
//   const user = await User.findById(userId);
//   if (!user) throw { statusCode: 404, message: 'User not found' };

//   const isMatch = await user.matchPassword(oldPassword);
//   if (!isMatch) throw { statusCode: 401, message: 'Incorrect old password' };

//   user.password = newPassword;
//   user.must_change_password = false;
//   await user.save();
//   return { message: 'Password updated successfully' };
// };

// // 4. FORGOT PASSWORD
// exports.forgotPassword = async (email) => {
//   const user = await User.findOne({ email });
//   if (!user) throw { statusCode: 404, message: 'User not found' };

//   // Generate random token
//   const resetToken = crypto.randomBytes(20).toString('hex');
//   user.resetPasswordToken = crypto.createHash('sha256').update(resetToken).digest('hex');
//   user.resetPasswordExpire = Date.now() + 30 * 60 * 1000; // 30 mins
//   await user.save();

//   // In production, send this via email using Nodemailer. 
//   // For now, return it so we can test in Postman.
//   return { resetToken };
// };

// // 5. RESET PASSWORD
// exports.resetPassword = async (token, newPassword) => {
//   const resetPasswordToken = crypto.createHash('sha256').update(token).digest('hex');

//   const user = await User.findOne({
//     resetPasswordToken,
//     resetPasswordExpire: { $gt: Date.now() }
//   });

//   if (!user) throw { statusCode: 400, message: 'Invalid or expired token' };

//   user.password = newPassword;
//   user.resetPasswordToken = undefined;
//   user.resetPasswordExpire = undefined;
//   await user.save();

//   return { message: 'Password reset successful' };
// };

const User = require('../models/User');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');

// 1. LOGIN (Staff & Admin)
exports.loginUser = async (email, password) => {
  const user = await User.findOne({ email });
  if (!user) throw { statusCode: 401, message: 'Invalid credentials' };

  if (!user.is_active) throw { statusCode: 403, message: 'Account is deactivated' };

  const isMatch = await user.matchPassword(password);
  if (!isMatch) throw { statusCode: 401, message: 'Invalid credentials' };

  const accessToken = jwt.sign(
    { id: user._id, role: user.role }, 
    process.env.JWT_ACCESS_SECRET, 
    { expiresIn: process.env.JWT_ACCESS_TTL }
  );

  const refreshToken = jwt.sign(
    { id: user._id, role: user.role }, 
    process.env.JWT_REFRESH_SECRET, 
    { expiresIn: `${process.env.REFRESH_TTL_DAYS}d` }
  );

  return {
    accessToken,
    refreshToken,
    user: { id: user._id, name: user.name, email: user.email, role: user.role }
  };
};

// NEW: 1.5 STUDENT LOGIN (Name + Phone)
exports.studentLoginUser = async (name, phone) => {
  const syntheticEmail = `${phone}@ims.com`;
  const user = await User.findOne({ email: syntheticEmail });

  if (!user) throw { statusCode: 401, message: 'Invalid phone number' };
  if (!user.is_active) throw { statusCode: 403, message: 'Account is deactivated' };

  // Check if the provided name matches the database record (case insensitive)
  if (user.name.toLowerCase() !== name.toLowerCase().trim()) {
    throw { statusCode: 401, message: 'Name does not match our records' };
  }

  // Generate Access Token (No password required)
  const accessToken = jwt.sign(
    { id: user._id, role: user.role }, 
    process.env.JWT_ACCESS_SECRET, 
    { expiresIn: process.env.JWT_ACCESS_TTL }
  );

  return {
    accessToken,
    user: { id: user._id, name: user.name, phone: user.phone, role: user.role }
  };
};

// 2. REFRESH TOKEN
exports.refreshToken = (refreshToken) => {
  try {
    const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
    const newAccessToken = jwt.sign(
      { id: decoded.id, role: decoded.role },
      process.env.JWT_ACCESS_SECRET,
      { expiresIn: process.env.JWT_ACCESS_TTL }
    );
    return { accessToken: newAccessToken };
  } catch (error) {
    throw { statusCode: 401, message: 'Invalid or expired refresh token' };
  }
};

// 3. CHANGE PASSWORD
exports.changePassword = async (userId, oldPassword, newPassword) => {
  const user = await User.findById(userId);
  if (!user) throw { statusCode: 404, message: 'User not found' };

  const isMatch = await user.matchPassword(oldPassword);
  if (!isMatch) throw { statusCode: 401, message: 'Incorrect old password' };

  user.password = newPassword;
  user.must_change_password = false;
  await user.save();
  return { message: 'Password updated successfully' };
};

// 4. FORGOT PASSWORD
exports.forgotPassword = async (email) => {
  const user = await User.findOne({ email });
  if (!user) throw { statusCode: 404, message: 'User not found' };

  const resetToken = crypto.randomBytes(20).toString('hex');
  user.resetPasswordToken = crypto.createHash('sha256').update(resetToken).digest('hex');
  user.resetPasswordExpire = Date.now() + 30 * 60 * 1000;
  await user.save();

  return { resetToken };
};

// 5. RESET PASSWORD
exports.resetPassword = async (token, newPassword) => {
  const resetPasswordToken = crypto.createHash('sha256').update(token).digest('hex');

  const user = await User.findOne({
    resetPasswordToken,
    resetPasswordExpire: { $gt: Date.now() }
  });

  if (!user) throw { statusCode: 400, message: 'Invalid or expired token' };

  user.password = newPassword;
  user.resetPasswordToken = undefined;
  user.resetPasswordExpire = undefined;
  await user.save();

  return { message: 'Password reset successful' };
};