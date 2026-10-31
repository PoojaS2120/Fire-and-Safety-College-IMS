const tclcService = require('../services/tclcService');

exports.requestCertificate = async (req, res, next) => {
  try {
    const { studentId, type, reason } = req.body;
    const request = await tclcService.requestTcLc(studentId, type, reason, req.user.id);
    res.status(201).json({ success: true, message: 'Request created successfully', data: request });
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