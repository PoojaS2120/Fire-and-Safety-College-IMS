const mongoose = require('mongoose');
const User = require('../../auth/models/User');
const Permission = require('../models/Permission');
const resolvePermissions = require('../utils/resolvePermissions');
const auditService = require('../../audit/services/auditService');
const { getIp } = require('../../audit/utils/getIp');

const loadUser = (id) => User.findById(id).select('-password').populate(resolvePermissions.POPULATE);

// GET /rbac/users/:userId/permissions
exports.getUserPermissions = async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.userId)) {
      return res.status(400).json({ success: false, message: 'Invalid user id' });
    }
    const user = await loadUser(req.params.userId);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    res.json({
      success: true,
      data: {
        user: { id: user._id, name: user.name, email: user.email, role: user.role.name },
        role_permissions: user.role.permissions.map((p) => p.code),
        extra_permissions: user.extra_permissions.map((p) => p.code),
        denied_permissions: user.denied_permissions.map((p) => p.code),
        effective_permissions: resolvePermissions(user),
      },
    });
  } catch (err) { next(err); }
};

// PUT /rbac/users/:userId/permissions   body: { extra: [permId...], denied: [permId...] }
exports.updateUserPermissions = async (req, res, next) => {
  try {
    const { userId } = req.params;
    const { extra = [], denied = [] } = req.body;

    if (!mongoose.isValidObjectId(userId)) {
      return res.status(400).json({ success: false, message: 'Invalid user id' });
    }
    if (!Array.isArray(extra) || !Array.isArray(denied)) {
      return res.status(400).json({ success: false, message: 'extra and denied must be arrays of permission ids' });
    }
    if (String(userId) === String(req.user.id)) {
      return res.status(400).json({ success: false, message: 'You cannot change your own permissions' });
    }

    const overlap = extra.filter((id) => denied.includes(id));
    if (overlap.length) {
      return res.status(400).json({ success: false, message: 'A permission cannot be both granted and denied' });
    }

    const all = [...new Set([...extra, ...denied])];
    if (all.some((id) => !mongoose.isValidObjectId(id))) {
      return res.status(400).json({ success: false, message: 'Invalid permission id' });
    }
    const found = await Permission.countDocuments({ _id: { $in: all } });
    if (found !== all.length) {
      return res.status(400).json({ success: false, message: 'One or more permissions do not exist' });
    }

    const target = await loadUser(userId);
    if (!target) return res.status(404).json({ success: false, message: 'User not found' });
    if (target.role.name === 'super_admin') {
      return res.status(403).json({ success: false, message: 'super_admin permissions cannot be changed' });
    }

    const before = {
      extra: target.extra_permissions.map((p) => p.code),
      denied: target.denied_permissions.map((p) => p.code),
    };

    await User.updateOne({ _id: userId }, { $set: { extra_permissions: extra, denied_permissions: denied } });
    const updated = await loadUser(userId);

    await auditService.logAction({
      userId: req.user.id,
      action: 'UPDATE',
      entity: 'UserPermissions',
      entityId: userId,
      oldValues: before,
      newValues: {
        extra: updated.extra_permissions.map((p) => p.code),
        denied: updated.denied_permissions.map((p) => p.code),
      },
      ip: getIp(req),
    });

    res.json({
      success: true,
      message: 'User permissions updated',
      data: { effective_permissions: resolvePermissions(updated) },
    });
  } catch (err) { next(err); }
};

// DELETE /rbac/users/:userId/permissions  -> reset to role defaults
exports.resetUserPermissions = async (req, res, next) => {
  try {
    const { userId } = req.params;
    if (!mongoose.isValidObjectId(userId)) {
      return res.status(400).json({ success: false, message: 'Invalid user id' });
    }
    const result = await User.updateOne({ _id: userId }, { $set: { extra_permissions: [], denied_permissions: [] } });
    if (!result.matchedCount) return res.status(404).json({ success: false, message: 'User not found' });
    res.json({ success: true, message: 'User permissions reset to role defaults' });
  } catch (err) { next(err); }
};