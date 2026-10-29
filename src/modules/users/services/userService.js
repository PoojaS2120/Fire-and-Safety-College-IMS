const User = require('../../auth/models/User');

// Create User (Task B-10)
exports.createUser = async (userData) => {
  const existingUser = await User.findOne({ email: userData.email });
  if (existingUser) {
    throw { statusCode: 400, message: 'User with this email already exists' };
  }

  const user = await User.create(userData);
  user.password = undefined;
  return user;
};

// Get All Users (Filter by role or status)
exports.getUsers = async (query) => {
  const filter = {};
  if (query.role) filter.role = query.role;
  if (query.is_active) filter.is_active = query.is_active === 'true';

  return await User.find(filter).select('-password');
};

// Get Single User
exports.getUserById = async (id) => {
  const user = await User.findById(id).select('-password');
  if (!user) throw { statusCode: 404, message: 'User not found' };
  return user;
};

// Update User Details
exports.updateUser = async (id, updateData) => {
  const user = await User.findByIdAndUpdate(id, updateData, { new: true, runValidators: true }).select('-password');
  if (!user) throw { statusCode: 404, message: 'User not found' };
  return user;
};

// Toggle User Status (Activate / Deactivate)
exports.toggleStatus = async (id) => {
  const user = await User.findById(id);
  if (!user) throw { statusCode: 404, message: 'User not found' };
  
  user.is_active = !user.is_active;
  await user.save();
  
  return { message: `User status changed to ${user.is_active ? 'Active' : 'Inactive'}` };
};

// Admin Reset User Password (Gives a temporary password)
exports.adminResetPassword = async (id, newPassword) => {
  const user = await User.findById(id);
  if (!user) throw { statusCode: 404, message: 'User not found' };

  user.password = newPassword;
  user.must_change_password = true; // Force them to change it on next login
  await user.save();

  return { message: 'Password reset successfully. User must change it on next login.' };
};