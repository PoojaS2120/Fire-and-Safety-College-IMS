// const User = require('../models/User');
// const jwt = require('jsonwebtoken');
// const crypto = require('crypto');

// const MAX_FAILED_ATTEMPTS = 5;
// const LOCK_TIME_MS = 15 * 60 * 1000; // 15 minutes

// // 1. LOGIN (Staff & Admin)
// exports.loginUser = async (email, password) => {
//   const user = await User.findOne({ email });
  
//   // Generic message to prevent user enumeration
//   if (!user) throw { statusCode: 401, message: 'Invalid credentials' };
//   if (!user.is_active) throw { statusCode: 403, message: 'Account is deactivated' };

//   // Check if account is locked
//   if (user.lock_until && user.lock_until > Date.now()) {
//     const minsLeft = Math.ceil((user.lock_until - Date.now()) / 60000);
//     throw { statusCode: 423, message: `Account locked. Try again in ${minsLeft} minutes.` };
//   }

//   const isMatch = await user.matchPassword(password);
  
//   if (!isMatch) {
//     // Increment failed attempts
//     user.failed_login_count += 1;
//     if (user.failed_login_count >= MAX_FAILED_ATTEMPTS) {
//       user.lock_until = Date.now() + LOCK_TIME_MS;
//       user.failed_login_count = 0; // reset counter after locking
//     }
//     await user.save();
//     throw { statusCode: 401, message: 'Invalid credentials' };
//   }

//   // Success: reset failed attempts
//   user.failed_login_count = 0;
//   user.lock_until = null;
//   await user.save();

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

// const Student = require('../../students/models/Student');

// // 1.5 STUDENT LOGIN (Phone Only)
// exports.studentLoginUser = async (phone) => {
//   const student = await Student.findOne({ phone });

//   if (!student) {
//     throw {
//       statusCode: 401,
//       message: 'No student found with this phone number'
//     };
//   }

//   const user = await User.findById(student.user_id);

//   if (!user) {
//     throw {
//       statusCode: 401,
//       message: 'Student account not found'
//     };
//   }

//   if (!user.is_active) {
//     throw {
//       statusCode: 403,
//       message: 'Account is deactivated'
//     };
//   }

//   if (user.role !== 'student') {
//     throw {
//       statusCode: 403,
//       message: 'Invalid student account'
//     };
//   }

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
//     user: {
//       id: user._id,
//       name: student.full_name,
//       phone: student.phone,
//       role: user.role
//     }
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

// // 4. FORGOT PASSWORD (Enumeration Protected)
// exports.forgotPassword = async (email) => {
//   const user = await User.findOne({ email });
  
//   // Don't reveal if the email exists (prevents enumeration)
//   if (!user) {
//     return { resetToken: 'no-op-token-dummy' };
//   }

//   const resetToken = crypto.randomBytes(20).toString('hex');
//   user.resetPasswordToken = crypto.createHash('sha256').update(resetToken).digest('hex');
//   user.resetPasswordExpire = Date.now() + 30 * 60 * 1000; // 30 minutes
//   await user.save();

//   return { resetToken };
// };

// // 5. RESET PASSWORD
// exports.resetPassword = async (token, newPassword) => {
//   const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

//   const user = await User.findOne({
//     resetPasswordToken: hashedToken,
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
const Student = require('../../students/models/Student');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');

const MAX_FAILED_ATTEMPTS = 5;
const LOCK_TIME_MS = 15 * 60 * 1000; // 15 minutes

// 1. LOGIN (Staff & Admin)
exports.loginUser = async (email, password) => {
  // 🚨 MUST POPULATE ROLE
  const user = await User.findOne({ email }).populate('role');
  
  if (!user) throw { statusCode: 401, message: 'Invalid credentials' };
  if (!user.is_active) throw { statusCode: 403, message: 'Account is deactivated' };

  if (user.lock_until && user.lock_until > Date.now()) {
    const minsLeft = Math.ceil((user.lock_until - Date.now()) / 60000);
    throw { statusCode: 423, message: `Account locked. Try again in ${minsLeft} minutes.` };
  }

  const isMatch = await user.matchPassword(password);
  
  if (!isMatch) {
    user.failed_login_count += 1;
    if (user.failed_login_count >= MAX_FAILED_ATTEMPTS) {
      user.lock_until = Date.now() + LOCK_TIME_MS;
      user.failed_login_count = 0; 
    }
    await user.save();
    throw { statusCode: 401, message: 'Invalid credentials' };
  }

  user.failed_login_count = 0;
  user.lock_until = null;
  await user.save();

  // 🚨 USE user.role.name
  const accessToken = jwt.sign(
    { id: user._id, role: user.role.name }, 
    process.env.JWT_ACCESS_SECRET, 
    { expiresIn: process.env.JWT_ACCESS_TTL }
  );

  const refreshToken = jwt.sign(
    { id: user._id, role: user.role.name }, 
    process.env.JWT_REFRESH_SECRET, 
    { expiresIn: `${process.env.REFRESH_TTL_DAYS}d` }
  );

  return {
    accessToken,
    refreshToken,
    // 🚨 RETURN user.role.name
    user: { id: user._id, name: user.name, email: user.email, role: user.role.name }
  };
};

// 1.5 STUDENT LOGIN (Phone Only)
exports.studentLoginUser = async (phone) => {
  const student = await Student.findOne({ phone });

  if (!student) {
    throw { statusCode: 401, message: 'No student found with this phone number' };
  }

  // 🚨 MUST POPULATE ROLE HERE TOO
  const user = await User.findById(student.user_id).populate('role');

  if (!user) {
    throw { statusCode: 401, message: 'Student account not found' };
  }

  if (!user.is_active) {
    throw { statusCode: 403, message: 'Account is deactivated' };
  }

  // 🚨 CHECK user.role.name
  if (user.role.name !== 'student') {
    throw { statusCode: 403, message: 'Invalid student account' };
  }

  const accessToken = jwt.sign(
    { id: user._id, role: user.role.name },
    process.env.JWT_ACCESS_SECRET,
    { expiresIn: process.env.JWT_ACCESS_TTL }
  );

  const refreshToken = jwt.sign(
    { id: user._id, role: user.role.name },
    process.env.JWT_REFRESH_SECRET,
    { expiresIn: `${process.env.REFRESH_TTL_DAYS}d` }
  );

  return {
    accessToken,
    refreshToken,
    user: {
      id: user._id,
      name: student.full_name,
      phone: student.phone,
      role: user.role.name
    }
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

// 4. FORGOT PASSWORD (Enumeration Protected)
exports.forgotPassword = async (email) => {
  const user = await User.findOne({ email });
  
  if (!user) {
    return { resetToken: 'no-op-token-dummy' };
  }

  const resetToken = crypto.randomBytes(20).toString('hex');
  user.resetPasswordToken = crypto.createHash('sha256').update(resetToken).digest('hex');
  user.resetPasswordExpire = Date.now() + 30 * 60 * 1000;
  await user.save();

  return { resetToken };
};

// 5. RESET PASSWORD
exports.resetPassword = async (token, newPassword) => {
  const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

  const user = await User.findOne({
    resetPasswordToken: hashedToken,
    resetPasswordExpire: { $gt: Date.now() }
  });

  if (!user) throw { statusCode: 400, message: 'Invalid or expired token' };

  user.password = newPassword;
  user.resetPasswordToken = undefined;
  user.resetPasswordExpire = undefined;
  await user.save();

  return { message: 'Password reset successful' };
};