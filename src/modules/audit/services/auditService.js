const AuditLog = require('../models/AuditLog');

exports.logAction = async ({
  userId,
  action,
  entity,
  entityId,
  oldValues,
  newValues,
  ip,
  session = null,
}) => {
  const auditData = {
    user_id: userId,
    action,
    entity,
    entity_id: entityId,
    old_values: oldValues || null,
    new_values: newValues || null,
    ip_address: ip,
  };

  if (session) {
    const [auditLog] = await AuditLog.create([auditData], { session });
    return auditLog;
  }

  return await AuditLog.create(auditData);
};

exports.getAuditLogs = async (query) => {
  // ✅ DEFAULT LIMIT CHANGED: 20 → 10
  const page = Math.max(1, parseInt(query.page, 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(query.limit, 10) || 10));
  const skip = (page - 1) * limit;

  // Filtering
  const filter = {};
  if (query.entity) filter.entity = query.entity;
  if (query.action) filter.action = query.action;
  if (query.userId) filter.user_id = query.userId;
  if (query.entityId) filter.entity_id = query.entityId;

  // Date Range Filtering
  if (query.startDate || query.endDate) {
    filter.createdAt = {};
    if (query.startDate) filter.createdAt.$gte = new Date(query.startDate);
    if (query.endDate) filter.createdAt.$lte = new Date(query.endDate);
  }

  // Execute query
  const logs = await AuditLog.find(filter)
    .populate('user_id', 'name email role')
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit)
    .lean();

  const total = await AuditLog.countDocuments(filter);

  return {
    logs,
    pagination: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) // ✅ standardised to 'totalPages'
    }
  };
};