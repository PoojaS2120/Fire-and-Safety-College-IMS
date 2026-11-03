const User = require('../../auth/models/User');
const auditService = require('../../audit/services/auditService');
const getIp = require('../../audit/utils/getIp').getIp;

// Create User (with audit)
exports.createUser = async (userData, req) => {
  const existingUser = await User.findOne({ email: userData.email });
  if (existingUser) {
    throw { statusCode: 400, message: 'User with this email already exists' };
  }

  const user = await User.create(userData);

  // Strip password from response
  const safeUser = user.toObject();
  delete safeUser.password;

  // Audit log
  if (req) {
    await auditService.logAction({
      userId: req.user.id,
      action: 'CREATE',
      entity: 'User',
      entityId: user._id,
      oldValues: null,
      newValues: { email: user.email, role: user.role, name: user.name },
      ip: getIp(req),
    });
  }

  return safeUser;
};

// Get All Users (with pagination + search)
exports.getUsers = async (query) => {
  const filter = {};

  if (query.role) filter.role = query.role;
  if (query.is_active !== undefined) filter.is_active = query.is_active === 'true';

  if (query.search || query.q) {
    const term = (query.search || query.q).trim();
    const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    filter.$or = [
      { name: { $regex: escaped, $options: 'i' } },
      { email: { $regex: escaped, $options: 'i' } },
      { phone: { $regex: escaped, $options: 'i' } },
    ];
  }

  const page = Math.max(1, parseInt(query.page, 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(query.limit, 10) || 20));
  const skip = (page - 1) * limit;

  const [users, total] = await Promise.all([
    User.find(filter)
      .select('-password')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit),
    User.countDocuments(filter),
  ]);

  return {
    users,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
};

// Get Single User
exports.getUserById = async (id) => {
  const user = await User.findById(id).select('-password');
  if (!user) throw { statusCode: 404, message: 'User not found' };
  return user;
};

// Update User Details
exports.updateUser = async (id, updateData, req) => {
  const existing = await User.findById(id);
  if (!existing) throw { statusCode: 404, message: 'User not found' };

  const oldValues = {
    name: existing.name,
    phone: existing.phone,
    role: existing.role,
  };

  // Explicit allowlist — never let caller set password/is_active via update
  const allowedUpdates = {
    name: updateData.name,
    phone: updateData.phone,
    role: updateData.role,
  };

  // Remove undefined keys
  Object.keys(allowedUpdates).forEach((key) => {
    if (allowedUpdates[key] === undefined) delete allowedUpdates[key];
  });

  const user = await User.findByIdAndUpdate(
    id,
    { $set: allowedUpdates },
    { returnDocument: 'after', runValidators: true }
  ).select('-password');

  if (!user) throw { statusCode: 404, message: 'User not found' };

  // Audit log
  if (req) {
    await auditService.logAction({
      userId: req.user.id,
      action: 'UPDATE',
      entity: 'User',
      entityId: user._id,
      oldValues,
      newValues: {
        name: user.name,
        phone: user.phone,
        role: user.role,
      },
      ip: getIp(req),
    });
  }

  return user;
};

// Toggle User Status (Activate / Deactivate)
exports.toggleStatus = async (id, req) => {
  const user = await User.findById(id);
  if (!user) throw { statusCode: 404, message: 'User not found' };

  // Prevent a super_admin from deactivating themselves
  if (req && String(user._id) === String(req.user.id)) {
    throw { statusCode: 400, message: 'You cannot deactivate your own account' };
  }

  const oldStatus = user.is_active;
  user.is_active = !user.is_active;
  await user.save();

  // Audit log
  if (req) {
    await auditService.logAction({
      userId: req.user.id,
      action: 'UPDATE',
      entity: 'User',
      entityId: user._id,
      oldValues: { is_active: oldStatus },
      newValues: { is_active: user.is_active },
      ip: getIp(req),
    });
  }

  return {
    message: `User status changed to ${user.is_active ? 'Active' : 'Inactive'}`,
    is_active: user.is_active,
  };
};

// Admin Reset User Password
exports.adminResetPassword = async (id, newPassword, req) => {
  // Enforce minimum password strength
  if (typeof newPassword !== 'string' || newPassword.length < 8) {
    throw {
      statusCode: 400,
      message: 'Password must be at least 8 characters',
    };
  }

  const user = await User.findById(id);
  if (!user) throw { statusCode: 404, message: 'User not found' };

  user.password = newPassword;
  user.must_change_password = true;
  await user.save();

  // Audit log (NEVER log the password itself)
  if (req) {
    await auditService.logAction({
      userId: req.user.id,
      action: 'UPDATE',
      entity: 'User',
      entityId: user._id,
      oldValues: null,
      newValues: {
        action: 'admin_password_reset',
        must_change_password: true,
      },
      ip: getIp(req),
    });
  }

  return {
    message: 'Password reset successfully. User must change it on next login.',
  };
};