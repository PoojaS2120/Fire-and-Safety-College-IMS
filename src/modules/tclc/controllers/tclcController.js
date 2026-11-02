const tclcService = require('../services/tclcService');

exports.requestCertificate = async (req, res, next) => {
  try {
    const { studentId, type, reason } = req.body;
    const request = await tclcService.requestTcLc(studentId, type, reason, req.user.id);
    res.status(201).json({ success: true, message: 'Request created successfully', data: request });
  } catch (err) { next(err); }
};

// NEW: Get All Requests
exports.getAllRequests = async (req, res, next) => {
  try {
    const { status, type } = req.query; // e.g., ?status=requested&type=TC
    const requests = await tclcService.getAllTcLcRequests(status, type);
    res.status(200).json({ success: true, data: requests });
  } catch (err) { next(err); }
};

// NEW: Get Single Request Details
exports.getRequestDetails = async (req, res, next) => {
  try {
    const request = await tclcService.getTcLcRequestById(req.params.id);
    
    // Security: If student is logged in, they can only view their own request
    if (req.user.role === 'student' && request.student_id._id.toString() !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Unauthorized' });
    }
    
    res.status(200).json({ success: true, data: request });
  } catch (err) { next(err); }
};

// NEW: Check Eligibility
exports.checkEligibility = async (req, res, next) => {
  try {
    const result = await tclcService.checkTcLcEligibility(req.params.id);
    res.status(200).json({ success: true, data: result });
  } catch (err) { next(err); }
};

exports.approveRequest = async (req, res, next) => {
  try {
    const request = await tclcService.approveTcLc(req.params.id, req.user.id);
    res.status(200).json({ success: true, message: 'Approved successfully', data: request });
  } catch (err) { next(err); }
};

exports.rejectRequest = async (req, res, next) => {
  try {
    const { reason } = req.body;
    const request = await tclcService.rejectTcLc(req.params.id, reason, req.user.id);
    res.status(200).json({ success: true, message: 'Request rejected', data: request });
  } catch (err) { next(err); }
};

exports.downloadPDF = async (req, res, next) => {
  try {
    const pdfStream = await tclcService.generateTcLcPDF(req.params.id);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=${req.params.id}.pdf`);
    pdfStream.pipe(res);
  } catch (err) { next(err); }
};