const User = require('../../auth/models/User');

exports.createUser = async (userData) => {
  // Check if user exists
  const existingUser = await User.findOne({ email: userData.email });
  if (existingUser) {
    throw { statusCode: 400, message: 'User with this email already exists' };
  }

  // Create user (password is automatically hashed by the User model)
  const user = await User.create(userData);
  
  // Remove password from response
  user.password = undefined;
  return user;
};

exports.getUsers = async () => {
  return await User.find({}).select('-password');
};