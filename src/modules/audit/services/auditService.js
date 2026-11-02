// services/auditService.js
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

  // Use the transaction session when supplied.
  if (session) {
    const [auditLog] = await AuditLog.create([auditData], { session });
    return auditLog;
  }

  return await AuditLog.create(auditData);
};

exports.getAuditLogs = async (query) => {
  // 1. Pagination
  const page = parseInt(query.page, 10) || 1;
  const limit = parseInt(query.limit, 10) || 20;
  const skip = (page - 1) * limit;

  // 2. Filtering (e.g., ?entity=Payment&action=UPDATE&userId=xxx)
  const filter = {};
  if (query.entity) filter.entity = query.entity;
  if (query.action) filter.action = query.action;
  if (query.userId) filter.user_id = query.userId;
  if (query.entityId) filter.entity_id = query.entityId;

  // 3. Date Range Filtering
  if (query.startDate || query.endDate) {
    filter.createdAt = {};
    if (query.startDate) filter.createdAt.$gte = new Date(query.startDate);
    if (query.endDate) filter.createdAt.$lte = new Date(query.endDate);
  }

  // 4. Execute query
  const logs = await AuditLog.find(filter)
    .populate('user_id', 'name email role') // Fetch user details
    .sort({ createdAt: -1 }) // Newest first
    .skip(skip)
    .limit(limit)
    .lean(); // .lean() improves performance for read-only data

  const total = await AuditLog.countDocuments(filter);

  return {
    logs,
    pagination: {
      total,
      page,
      limit,
      pages: Math.ceil(total / limit)
    }
  };
};