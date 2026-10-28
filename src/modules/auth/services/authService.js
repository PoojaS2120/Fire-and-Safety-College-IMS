const User = require('../models/User');
const jwt = require('jsonwebtoken');

exports.loginUser = async (email, password) => {
  // 1. Find user
  const user = await User.findOne({ email });
  if (!user) {
    throw { statusCode: 401, message: 'Invalid credentials' };
  }

  // 2. Check if active
  if (!user.is_active) {
    throw { statusCode: 403, message: 'Account is deactivated' };
  }

  // 3. Check password
  const isMatch = await user.matchPassword(password);
  if (!isMatch) {
    throw { statusCode: 401, message: 'Invalid credentials' };
  }

  // 4. Generate Access Token (15m)
  const token = jwt.sign(
    { id: user._id, role: user.role }, 
    process.env.JWT_ACCESS_SECRET, 
    { expiresIn: process.env.JWT_ACCESS_TTL }
  );

  // (Optional Note: In a full build, you would also generate a Refresh Token here and save it to DB)

  return {
    token,
    user: {
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role
    }
  };
};