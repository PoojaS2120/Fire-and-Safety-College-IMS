// const tclcService = require('../services/tclcService');

// exports.requestCertificate = async (req, res, next) => {
//   try {
//     const { studentId, type, reason } = req.body;
//     if (!studentId || !type || !reason) {
//       return res.status(400).json({
//         success: false,
//         message: 'studentId, type, and reason are required',
//       });
//     }
//     const request = await tclcService.requestTcLc(
//       studentId,
//       type,
//       reason,
//       req.user.id,
//       req
//     );
//     res.status(201).json({ success: true, message: 'Request created successfully', data: request });
//   } catch (err) { next(err); }
// };

// exports.getAllRequests = async (req, res, next) => {
//   try {
//     const { status, type } = req.query;
//     const requests = await tclcService.getAllTcLcRequests(status, type);
//     res.status(200).json({ success: true, data: requests });
//   } catch (err) { next(err); }
// };

// exports.getRequestDetails = async (req, res, next) => {
//   try {
//     const request = await tclcService.getTcLcRequestById(req.params.id);

//     // Student can only view their own request
//     if (req.user.role === 'student') {
//       const Student = require('../../students/models/Student');
//       const student = await Student.findOne({ user_id: req.user.id }).select('_id');
//       if (!student || String(request.student_id._id) !== String(student._id)) {
//         return res.status(403).json({ success: false, message: 'Unauthorized' });
//       }
//     }

//     res.status(200).json({ success: true, data: request });
//   } catch (err) { next(err); }
// };

// exports.checkEligibility = async (req, res, next) => {
//   try {
//     const result = await tclcService.checkTcLcEligibility(req.params.id);
//     res.status(200).json({ success: true, data: result });
//   } catch (err) { next(err); }
// };

// exports.checkStudentEligibility = async (req, res, next) => {
//   try {
//     const { studentId } = req.params;
//     const { type } = req.query;

//     // Default to 'TC' if not provided, or handle the error gracefully
//     if (!type) {
//       return res.status(400).json({ 
//         success: false, 
//         message: 'Please provide a certificate type (TC or LC) in the query parameters.' 
//       });
//     }

//     const result = await tclcService.checkStudentEligibility(studentId, type);
//     res.status(200).json({ success: true, data: result });
//   } catch (err) {
//     next(err);
//   }
// };

// exports.approveRequest = async (req, res, next) => {
//   try {
//     const request = await tclcService.approveTcLc(req.params.id, req.user.id, req);
//     res.status(200).json({ success: true, message: 'Approved successfully', data: request });
//   } catch (err) { next(err); }
// };

// exports.rejectRequest = async (req, res, next) => {
//   try {
//     const { reason } = req.body;
//     const request = await tclcService.rejectTcLc(req.params.id, reason, req.user.id, req);
//     res.status(200).json({ success: true, message: 'Request rejected', data: request });
//   } catch (err) { next(err); }
// };

// exports.downloadPDF = async (req, res, next) => {
//   try {
//     // Student can only download their own certificate
//     const request = await tclcService.getTcLcRequestById(req.params.id);
//     if (req.user.role === 'student') {
//       const Student = require('../../students/models/Student');
//       const student = await Student.findOne({ user_id: req.user.id }).select('_id');
//       if (!student || String(request.student_id._id) !== String(student._id)) {
//         return res.status(403).json({ success: false, message: 'Unauthorized' });
//       }
//     }

//     const pdfStream = await tclcService.generateTcLcPDF(req.params.id);

//     res.setHeader('Content-Type', 'application/pdf');
//     res.setHeader(
//       'Content-Disposition',
//       `inline; filename="${request.certificate_no || request.type}.pdf"`
//     );
//     pdfStream.pipe(res);
//   } catch (err) { next(err); }
// };

// exports.getMyRequests = async (req, res, next) => {
//   try {
//     const requests = await tclcService.getMyTcLcRequests(req.user.id);
//     res.status(200).json({ success: true, data: requests });
//   } catch (err) { next(err); }
// };






const tclcService = require('../services/tclcService');
exports.requestCertificate = async (req, res, next) => {
  try {
    const {
      studentId,
      type,
      reason,
      certificateDetails
    } = req.body;

    if (!studentId || !type || !reason) {
      return res.status(400).json({
        success: false,
        message: 'studentId, type, and reason are required'
      });
    }

    const safeType = String(type).trim().toUpperCase();

    if (!['TC', 'LC'].includes(safeType)) {
      return res.status(400).json({
        success: false,
        message: 'Certificate type must be TC or LC'
      });
    }

    const request = await tclcService.requestTcLc(
      studentId,
      safeType,
      reason,
      req.user.id,
      req,
      certificateDetails || {}
    );

    res.status(201).json({
      success: true,
      message: `${safeType} request created successfully`,
      data: request
    });

  } catch (err) {
    next(err);
  }
};

// ✅ UPDATED: Returns { success, data, meta } for pagination
exports.getAllRequests = async (req, res, next) => {
  try {
    const result = await tclcService.getAllTcLcRequests(req.query);
    res.status(200).json({
      success: true,
      data: result.requests,
      meta: result.meta,
    });
  } catch (err) { next(err); }
};

exports.getRequestDetails = async (req, res, next) => {
  try {
    const request = await tclcService.getTcLcRequestById(req.params.id);

    if (req.user.role === 'student') {
      const Student = require('../../students/models/Student');
      const student = await Student.findOne({ user_id: req.user.id }).select('_id');
      if (!student || String(request.student_id._id) !== String(student._id)) {
        return res.status(403).json({ success: false, message: 'Unauthorized' });
      }
    }

    res.status(200).json({ success: true, data: request });
  } catch (err) { next(err); }
};

exports.checkEligibility = async (req, res, next) => {
  try {
    const result = await tclcService.checkTcLcEligibility(req.params.id);
    res.status(200).json({ success: true, data: result });
  } catch (err) { next(err); }
};

// ✅ UPDATED: Defaults to 'TC' to prevent 400 error when modal opens
exports.checkStudentEligibility = async (req, res, next) => {
  try {
    const { studentId } = req.params;
    // Default to 'TC' if frontend forgets to send it
    const type = req.query.type || 'TC'; 

    const result = await tclcService.checkStudentEligibility(studentId, type);
    res.status(200).json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
};

exports.approveRequest = async (req, res, next) => {
  try {
    const request = await tclcService.approveTcLc(req.params.id, req.user.id, req);
    res.status(200).json({ success: true, message: 'Approved successfully', data: request });
  } catch (err) { next(err); }
};

exports.rejectRequest = async (req, res, next) => {
  try {
    const { reason } = req.body;
    const request = await tclcService.rejectTcLc(req.params.id, reason, req.user.id, req);
    res.status(200).json({ success: true, message: 'Request rejected', data: request });
  } catch (err) { next(err); }
};

exports.downloadPDF = async (req, res, next) => {
  try {
    const request = await tclcService.getTcLcRequestById(req.params.id);
    if (req.user.role === 'student') {
      const Student = require('../../students/models/Student');
      const student = await Student.findOne({ user_id: req.user.id }).select('_id');
      if (!student || String(request.student_id._id) !== String(student._id)) {
        return res.status(403).json({ success: false, message: 'Unauthorized' });
      }
    }

    const pdfStream = await tclcService.generateTcLcPDF(req.params.id);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `inline; filename="${request.certificate_no || request.type}.pdf"`
    );
    pdfStream.pipe(res);
  } catch (err) { next(err); }
};

exports.getMyRequests = async (req, res, next) => {
  try {
    const requests = await tclcService.getMyTcLcRequests(req.user.id);
    res.status(200).json({ success: true, data: requests });
  } catch (err) { next(err); }
};