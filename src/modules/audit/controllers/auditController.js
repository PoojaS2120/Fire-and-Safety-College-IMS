// controllers/auditController.js
const auditService = require('../services/auditService');

exports.getLogs = async (req, res, next) => {
  try {
    const result = await auditService.getAuditLogs(req.query);
    
    res.status(200).json({ 
      success: true, 
      data: result.logs,
      pagination: result.pagination
    });
  } catch (err) { 
    next(err); 
  }
};