const auditService = require('../services/auditService');

exports.getLogs = async (req, res, next) => {
  try {
    const logs = await auditService.getAuditLogs(req.query);
    res.status(200).json({ success: true, data: logs });
  } catch (err) { next(err); }
};