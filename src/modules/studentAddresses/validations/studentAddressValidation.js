// const { body, param, query } = require('express-validator');

// const pincodeRule = (chain) =>
//   chain
//     .isString()
//     .trim()
//     .matches(/^[1-9][0-9]{5}$/)
//     .withMessage('Pincode must be a valid 6-digit Indian PIN code');

// const createAddressValidation = [
//   body('address_line_1').isString().trim().notEmpty().withMessage('address_line_1 is required'),
//   body('address_line_2').optional().isString().trim(),
//   body('village_city').isString().trim().notEmpty().withMessage('village_city is required'),
//   body('taluka').optional().isString().trim(),
//   body('district').isString().trim().notEmpty().withMessage('district is required'),
//   body('state').isString().trim().notEmpty().withMessage('state is required'),
//   pincodeRule(body('pincode')),
//   body('country').optional().isString().trim().notEmpty(),
// ];

// const updateAddressValidation = [
//   body('address_line_1').optional().isString().trim().notEmpty(),
//   body('address_line_2').optional().isString().trim(),
//   body('village_city').optional().isString().trim().notEmpty(),
//   body('taluka').optional().isString().trim(),
//   body('district').optional().isString().trim().notEmpty(),
//   body('state').optional().isString().trim().notEmpty(),
//   pincodeRule(body('pincode').optional()),
//   body('country').optional().isString().trim().notEmpty(),
// ];

// const adminListValidation = [
//   query('page').optional().isInt({ min: 1 }).toInt(),
//   query('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
//   query('search').optional().isString().trim(),
//   query('has_address').optional().isIn(['true', 'false']),
// ];

// const adminStudentIdParam = [
//   param('studentId').isMongoId().withMessage('Invalid student id'),
// ];

// module.exports = {
//   createAddressValidation,
//   updateAddressValidation,
//   adminListValidation,
//   adminStudentIdParam,
// };

// ─────────────────────────────────────────────────────────────
// Zero-dependency validation (no express-validator required)
// Exports middleware arrays: each middleware validates then next()
// ─────────────────────────────────────────────────────────────

const PINCODE_REGEX = /^[1-9][0-9]{5}$/;
const MONGO_ID_REGEX = /^[a-fA-F0-9]{24}$/;

// ---- helpers ----
const trim = (v) => (typeof v === 'string' ? v.trim() : v);
const isEmpty = (v) => v === undefined || v === null || String(v).trim() === '';

function fail(res, message) {
  return res.status(400).json({ success: false, message });
}

// ---- CREATE: all required fields ----
const createAddressValidation = (req, res, next) => {
  const b = req.body || {};

  if (isEmpty(b.address_line_1)) return fail(res, 'address_line_1 is required');
  if (isEmpty(b.village_city))   return fail(res, 'village_city is required');
  if (isEmpty(b.district))       return fail(res, 'district is required');
  if (isEmpty(b.state))          return fail(res, 'state is required');
  if (isEmpty(b.pincode))        return fail(res, 'pincode is required');

  if (!PINCODE_REGEX.test(String(b.pincode).trim())) {
    return fail(res, 'Pincode must be a valid 6-digit Indian PIN code');
  }

  // Normalize strings
  req.body = {
    address_line_1: trim(b.address_line_1),
    address_line_2: trim(b.address_line_2) || '',
    village_city:   trim(b.village_city),
    taluka:         trim(b.taluka) || '',
    district:       trim(b.district),
    state:          trim(b.state),
    pincode:        trim(b.pincode),
    country:        trim(b.country) || 'India',
  };

  return next();
};

// ---- UPDATE: all fields optional, but validate any sent ----
const updateAddressValidation = (req, res, next) => {
  const b = req.body || {};

  const optionalStrings = ['address_line_1','address_line_2','village_city','taluka','district','state','country'];
  for (const key of optionalStrings) {
    if (b[key] !== undefined && typeof b[key] !== 'string') {
      return fail(res, `${key} must be a string`);
    }
  }

  if (b.pincode !== undefined && !PINCODE_REGEX.test(String(b.pincode).trim())) {
    return fail(res, 'Pincode must be a valid 6-digit Indian PIN code');
  }

  // Normalize sent strings
  const normalized = {};
  for (const key of ['address_line_1','address_line_2','village_city','taluka','district','state','country']) {
    if (b[key] !== undefined) normalized[key] = trim(b[key]);
  }
  if (b.pincode !== undefined) normalized.pincode = trim(b.pincode);

  req.body = normalized;
  return next();
};

// ---- ADMIN LIST: query params ----
const adminListValidation = (req, res, next) => {
  const q = req.query || {};

  if (q.page !== undefined) {
    const n = Number(q.page);
    if (!Number.isInteger(n) || n < 1) return fail(res, 'page must be a positive integer');
    q.page = n;
  }
  if (q.limit !== undefined) {
    const n = Number(q.limit);
    if (!Number.isInteger(n) || n < 1 || n > 100) return fail(res, 'limit must be between 1 and 100');
    q.limit = n;
  }
  if (q.has_address !== undefined && !['true','false'].includes(q.has_address)) {
    return fail(res, "has_address must be 'true' or 'false'");
  }
  if (q.search !== undefined && typeof q.search !== 'string') {
    return fail(res, 'search must be a string');
  }

  return next();
};

// ---- ADMIN: studentId in URL ----
const adminStudentIdParam = (req, res, next) => {
  const id = req.params.studentId;
  if (!id || !MONGO_ID_REGEX.test(id)) return fail(res, 'Invalid student id');
  return next();
};

module.exports = {
  createAddressValidation,
  updateAddressValidation,
  adminListValidation,
  adminStudentIdParam,
};