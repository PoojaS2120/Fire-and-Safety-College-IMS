// const User = require('../models/User');
// const jwt = require('jsonwebtoken');
// const crypto = require('crypto');

// // 1. LOGIN (Staff & Admin)
// exports.loginUser = async (email, password) => {
//   const user = await User.findOne({ email });
//   if (!user) throw { statusCode: 401, message: 'Invalid credentials' };

//   if (!user.is_active) throw { statusCode: 403, message: 'Account is deactivated' };

//   const isMatch = await user.matchPassword(password);
//   if (!isMatch) throw { statusCode: 401, message: 'Invalid credentials' };

//   const accessToken = jwt.sign(
//     { id: user._id, role: user.role }, 
//     process.env.JWT_ACCESS_SECRET, 
//     { expiresIn: process.env.JWT_ACCESS_TTL }
//   );

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

// // NEW: 1.5 STUDENT LOGIN (Name + Phone)
// exports.studentLoginUser = async (name, phone) => {
//   const syntheticEmail = `${phone}@ims.com`;
//   const user = await User.findOne({ email: syntheticEmail });

//   if (!user) throw { statusCode: 401, message: 'Invalid phone number' };
//   if (!user.is_active) throw { statusCode: 403, message: 'Account is deactivated' };

//   // Check if the provided name matches the database record (case insensitive)
//   if (user.name.toLowerCase() !== name.toLowerCase().trim()) {
//     throw { statusCode: 401, message: 'Name does not match our records' };
//   }

//   // Generate Access Token (No password required)
//   const accessToken = jwt.sign(
//     { id: user._id, role: user.role }, 
//     process.env.JWT_ACCESS_SECRET, 
//     { expiresIn: process.env.JWT_ACCESS_TTL }
//   );

//   return {
//     accessToken,
//     user: { id: user._id, name: user.name, phone: user.phone, role: user.role }
//   };
// };

// // 2. REFRESH TOKEN
// exports.refreshToken = (refreshToken) => {
//   try {
//     const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
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

//   const resetToken = crypto.randomBytes(20).toString('hex');
//   user.resetPasswordToken = crypto.createHash('sha256').update(resetToken).digest('hex');
//   user.resetPasswordExpire = Date.now() + 30 * 60 * 1000;
//   await user.save();

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

// 1.5 STUDENT LOGIN (Phone Only)
exports.studentLoginUser = async (phone) => {
  // Generate the synthetic email used for student accounts
  const syntheticEmail = `${phone}@ims.com`;
  
  // Find the user by the synthetic email
  const user = await User.findOne({ email: syntheticEmail });

  if (!user) throw { statusCode: 401, message: 'No student found with this phone number' };
  if (!user.is_active) throw { statusCode: 403, message: 'Account is deactivated' };

  // Security check: Ensure the user is actually a student
  if (user.role !== 'student') {
    throw { statusCode: 403, message: 'This phone number belongs to a staff member. Please use the web portal.' };
  }

  // Generate Access Token (No password required)
  const accessToken = jwt.sign(
    { id: user._id, role: user.role }, 
    process.env.JWT_ACCESS_SECRET, 
    { expiresIn: process.env.JWT_ACCESS_TTL }
  );

  // Generate Refresh Token as well (good practice for mobile apps)
  const refreshToken = jwt.sign(
    { id: user._id, role: user.role }, 
    process.env.JWT_REFRESH_SECRET, 
    { expiresIn: `${process.env.REFRESH_TTL_DAYS}d` }
  );

  return {
    accessToken,
    refreshToken,
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