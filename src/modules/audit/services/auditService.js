
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
    old_values: oldValues,
    new_values: newValues,
    ip_address: ip,
  };

  // Use the transaction session when supplied.
  if (session) {
    const [auditLog] = await AuditLog.create(
      [auditData],
      { session }
    );

    return auditLog;
  }

  return await AuditLog.create(auditData);
};
