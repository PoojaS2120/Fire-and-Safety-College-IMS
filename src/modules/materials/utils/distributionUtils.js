// Constants + pure helpers for Physical Material Distribution.
// No DB access here, so it is easy to test.

const OBJECT_ID_RE = /^[a-f0-9]{24}$/i;

const METHODS = ['HAND', 'POST', 'COURIER'];

// Statuses stored on a distribution record.
// "PENDING" is NOT stored: a student is Pending until a record exists.
const RECORD_STATUSES = ['PREPARED', 'DISPATCHED', 'DELIVERED', 'RETURNED', 'FAILED'];
const STUDENT_STATUSES = ['PENDING', 'PREPARED', 'DISPATCHED', 'DELIVERED'];

// Statuses that mean "the student did NOT receive it".
const INACTIVE_STATUSES = ['RETURNED', 'FAILED'];
const IN_TRANSIT_STATUSES = ['PREPARED', 'DISPATCHED'];

const ITEM_TYPES = [
  'STUDY_BOOK',
  'ANSWER_SHEET',
  'ASSIGNMENT_BOOK',
  'PRACTICAL_BOOK',
  'NOTES',
  'OTHER_DOCUMENT',
];

const ITEM_TYPE_LABELS = {
  STUDY_BOOK: 'Study Books',
  ANSWER_SHEET: 'Answer Sheets',
  ASSIGNMENT_BOOK: 'Assignment Books',
  PRACTICAL_BOOK: 'Practical Books',
  NOTES: 'Notes',
  OTHER_DOCUMENT: 'Other Documents',
};

// HAND is recorded at handover  -> straight to DELIVERED.
// POST / COURIER start as PREPARED (address reviewed, label printed).
const INITIAL_STATUS = { HAND: 'DELIVERED', POST: 'PREPARED', COURIER: 'PREPARED' };

const SHIPMENT_FLOW = {
  PREPARED: ['DISPATCHED', 'FAILED'],
  DISPATCHED: ['DELIVERED', 'RETURNED', 'FAILED'],
};

const TRANSITIONS = {
  HAND: { DELIVERED: ['RETURNED'] },
  POST: SHIPMENT_FLOW,
  COURIER: SHIPMENT_FLOW,
};

const createError = (message, statusCode = 400, payload = null) => {
  const err = new Error(message);
  err.statusCode = statusCode;
  if (payload) err.payload = payload; // controller sends payload fields as-is
  return err;
};

const escapeRegex = (s) => String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/* ---------------- Academic year (derived from batch.start_date) ---------------- */

const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;

const academicYearStartMonth = () => {
  const m = parseInt(process.env.ACADEMIC_YEAR_START_MONTH, 10);
  return m >= 1 && m <= 12 ? m : 6; // default June
};

const academicYearOf = (date) => {
  if (!date) return '';
  const d = new Date(new Date(date).getTime() + IST_OFFSET_MS);
  if (Number.isNaN(d.getTime())) return '';
  const year = d.getUTCFullYear();
  const month = d.getUTCMonth() + 1;
  const startYear = month >= academicYearStartMonth() ? year : year - 1;
  return `${startYear}-${String((startYear + 1) % 100).padStart(2, '0')}`;
};

// '2026-27' -> { start, end } (end exclusive). Returns null if invalid.
const academicYearRange = (label) => {
  const m = /^(\d{4})-(\d{2})$/.exec(String(label || '').trim());
  if (!m) return null;
  const startYear = Number(m[1]);
  if (Number(m[2]) !== (startYear + 1) % 100) return null;
  const sm = academicYearStartMonth() - 1;
  return {
    start: new Date(Date.UTC(startYear, sm, 1) - IST_OFFSET_MS),
    end: new Date(Date.UTC(startYear + 1, sm, 1) - IST_OFFSET_MS),
  };
};

/* ---------------- Dates ---------------- */

// 'YYYY-MM-DD' -> start / end of that day in IST. Other values -> Date as-is.
const parseDayBoundary = (value, endOfDay = false) => {
  if (!value) return null;
  const v = String(value).trim();
  const d = /^\d{4}-\d{2}-\d{2}$/.test(v)
    ? new Date(`${v}T${endOfDay ? '23:59:59.999' : '00:00:00.000'}+05:30`)
    : new Date(v);
  return Number.isNaN(d.getTime()) ? null : d;
};

/* ---------------- Address helpers ---------------- */

const PIN_RE = /^[0-9]{6}$/;

const pickMobile = (student) => {
  const c = student?.admission_form?.contact_details || {};
  return c.mobile_no || student?.phone || c.contact_no || c.home_mobile_no || '';
};

// Returns the list of missing fields for a sender/recipient address object.
const missingAddressFields = (a) => {
  const missing = [];
  if (!a || !String(a.address || '').trim()) missing.push('address');
  if (!a || !PIN_RE.test(String(a.pin || '').trim())) missing.push('pin');
  return missing;
};

/**
 * Build the recipient snapshot from the admission form.
 * Priority: postal address -> permanent address -> basic student.address.
 * `override` (optional) lets staff correct only what is missing/wrong.
 */
const resolveRecipient = (student, override = null) => {
  const af = student?.admission_form || {};
  const postal = af.postal_address || {};
  const permanent = af.permanent_address || {};

  let address = '';
  let pin = '';
  let source = 'NONE';

  if (String(postal.address || '').trim()) {
    address = postal.address;
    pin = postal.pin || '';
    source = 'POSTAL_ADDRESS';
  } else if (String(permanent.address || '').trim()) {
    address = permanent.address;
    pin = permanent.pin || '';
    source = 'PERMANENT_ADDRESS';
  } else if (String(student?.address || '').trim()) {
    address = student.address;
    pin = '';
    source = 'STUDENT_PROFILE';
  }

  let phone = pickMobile(student);

  if (override) {
    const o = override;
    if (String(o.address || '').trim() || String(o.pin || '').trim() || String(o.phone || '').trim()) {
      address = String(o.address || '').trim() || address;
      pin = String(o.pin || '').trim() || pin;
      phone = String(o.phone || '').trim() || phone;
      source = 'OVERRIDE';
    }
  }

  const recipient = {
    name: student.full_name,
    student_code: student.student_id,
    address: String(address || '').trim(),
    pin: String(pin || '').trim(),
    phone: String(phone || '').trim(),
    source,
  };

  return { recipient, missing: missingAddressFields(recipient) };
};

module.exports = {
  OBJECT_ID_RE,
  METHODS,
  RECORD_STATUSES,
  STUDENT_STATUSES,
  INACTIVE_STATUSES,
  IN_TRANSIT_STATUSES,
  ITEM_TYPES,
  ITEM_TYPE_LABELS,
  INITIAL_STATUS,
  TRANSITIONS,
  PIN_RE,
  createError,
  escapeRegex,
  academicYearOf,
  academicYearRange,
  parseDayBoundary,
  pickMobile,
  missingAddressFields,
  resolveRecipient,
};