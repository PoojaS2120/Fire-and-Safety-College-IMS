const AuditLog = require('../models/AuditLog');

// Function 1: To save logs
exports.logAction = async ({ userId, action, entity, entityId, oldValues, newValues, ip }) => {
  try {
    await AuditLog.create({
      user_id: userId,
      action,
      entity,
      entity_id: entityId,
      old_values: oldValues,
      new_values: newValues,
      ip_address: ip
    });
  } catch (error) {
    console.error('❌ Audit Log Failed:', error.message);
  }
};

// Function 2: To get logs (This is the one missing!)
exports.getAuditLogs = async (query) => {
  const filter = {};
  if (query.entity) filter.entity = query.entity;
  if (query.user_id) filter.user_id = query.user_id;

  return await AuditLog.find(filter)
    .populate('user_id', 'name email role')
    .sort({ createdAt: -1 })
    .limit(100);
};