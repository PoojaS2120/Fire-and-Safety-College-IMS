const distributionService = require('../services/distributionService');
const exportService = require('../services/distributionExportService');
const labelService = require('../services/distributionLabelService');
const { getIp } = require('../../audit/utils/getIp');

// Sends service errors that carry extra fields (code, missing, conflicts) as-is.
// Known errors (statusCode / Mongoose cast / validation / duplicate key) go to the global
// error middleware. Truly unexpected errors are logged and returned with a clear message
// (plus the real reason when NODE_ENV is not "production") instead of a bare 500.
const KNOWN_NAMES = ['CastError', 'ValidationError', 'DocumentNotFoundError'];

const wrap = (fn) => async (req, res, next) => {
  try {
    await fn(req, res);
  } catch (err) {
    if (err && err.payload) {
      return res
        .status(err.statusCode || 400)
        .json({ success: false, message: err.message, ...err.payload });
    }

    const known = err && (err.statusCode || KNOWN_NAMES.includes(err.name) || err.code === 11000);
    if (known) return next(err);

    console.error('[distributions] Unexpected error:', {
      url: req.originalUrl,
      method: req.method,
      name: err && err.name,
      code: err && (err.codeName || err.code),
      message: err && err.message,
      stack: err && err.stack,
    });

    const body = {
      success: false,
      message: 'Something went wrong while processing the distribution request.',
    };
    if (process.env.NODE_ENV !== 'production') {
      body.detail = err && err.message;
      body.error_name = err && err.name;
      body.error_code = err && (err.codeName || err.code);
    }
    return res.status(500).json(body);
  }
};

const createHandler = (method) =>
  wrap(async (req, res) => {
    const { record, warnings, duplicate_request } = await distributionService.createDistribution(
      method,
      req.body,
      req.user,
      getIp(req)
    );
    res.status(duplicate_request ? 200 : 201).json({
      success: true,
      message: duplicate_request
        ? 'This request was already recorded. Returning the existing record.'
        : 'Distribution recorded successfully.',
      duplicate_request,
      warnings,
      data: record,
    });
  });

exports.createHand = createHandler('HAND');
exports.createPost = createHandler('POST');
exports.createCourier = createHandler('COURIER');

exports.listStudents = wrap(async (req, res) => {
  const { data, pagination } = await distributionService.listStudents(req.query);
  res.json({ success: true, count: data.length, pagination, data });
});

exports.list = wrap(async (req, res) => {
  const { data, pagination } = await distributionService.listDistributions(req.query);
  res.json({ success: true, count: data.length, pagination, data });
});

exports.getOne = wrap(async (req, res) => {
  const data = await distributionService.getDistribution(req.params.id);
  res.json({ success: true, data });
});

exports.studentHistory = wrap(async (req, res) => {
  const data = await distributionService.getStudentHistory(req.params.studentId);
  res.json({ success: true, data });
});

// Student app: logged-in student's own distribution status
exports.myDistributions = wrap(async (req, res) => {
  const data = await distributionService.getMyDistributions(req.user.id);
  res.json({ success: true, data });
});

exports.summary = wrap(async (req, res) => {
  const data = await distributionService.getSummary(req.query);
  res.json({ success: true, data });
});

exports.updateStatus = wrap(async (req, res) => {
  const data = await distributionService.updateStatus(req.params.id, req.body, req.user, getIp(req));
  res.json({ success: true, message: `Status updated to ${data.status}.`, data });
});

exports.updateTracking = wrap(async (req, res) => {
  const data = await distributionService.updateTracking(req.params.id, req.body, req.user, getIp(req));
  res.json({ success: true, message: 'Tracking details updated.', data });
});

exports.updateAddress = wrap(async (req, res) => {
  const { record, missing } = await distributionService.updateAddress(
    req.params.id,
    req.body,
    req.user,
    getIp(req)
  );
  res.json({
    success: true,
    message: missing.length
      ? `Address updated but still incomplete (missing: ${missing.join(', ')}).`
      : 'Recipient address updated.',
    missing,
    data: record,
  });
});

// GET /:id/label  -> JSON label data (frontend renders + prints it)
// ?force=true returns the data even if the address is incomplete (incomplete=true)
exports.label = wrap(async (req, res) => {
  const force = String(req.query.force || '') === 'true';
  const { label, incomplete, missing } = await labelService.getLabelData(req.params.id, { force });
  res.json({ success: true, incomplete, missing, data: label });
});

exports.export = wrap(async (req, res) => {
  const { buffer, filename } = await exportService.exportWorkbook(req.query);
  res.setHeader(
    'Content-Type',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  );
  res.setHeader('Content-Disposition', `attachment; filename="${filename}.xlsx"`);
  res.setHeader('Content-Length', buffer.length);
  res.send(buffer);
});

exports.getSettings = wrap(async (req, res) => {
  const data = await distributionService.getSettings();
  res.json({ success: true, data });
});

exports.updateSettings = wrap(async (req, res) => {
  const data = await distributionService.updateSettings(req.body, req.user, getIp(req));
  res.json({ success: true, message: 'College sender address saved.', data });
});