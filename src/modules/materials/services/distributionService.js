const mongoose = require('mongoose');
const MaterialDistribution = require('../models/MaterialDistribution');
const DistributionSetting = require('../models/DistributionSetting');
const Student = require('../../students/models/Student');
const Batch = require('../../courses/models/Batch');
const User = require('../../auth/models/User');
const auditService = require('../../audit/services/auditService');
const U = require('../utils/distributionUtils');

const { createError } = U;
const oid = (v) => new mongoose.Types.ObjectId(String(v));
const ENTITY = 'MaterialDistribution';

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

const withTxn = require('../utils/withTransaction');

const assertObjectId = (value, label = 'id') => {
  if (!U.OBJECT_ID_RE.test(String(value || ''))) {
    throw createError(`Invalid ${label}.`, 400);
  }
  return value;
};

const parsePaging = (query, maxLimit = 100) => {
  const page = Math.max(1, parseInt(query.page, 10) || 1);
  const limit = Math.min(maxLimit, Math.max(1, parseInt(query.limit, 10) || 20));
  return { page, limit, skip: (page - 1) * limit };
};

const STUDENT_SELECT =
  'student_id full_name phone address course_id batch_id status ' +
  'admission_form.postal_address admission_form.permanent_address admission_form.contact_details';

// Accepts Student _id OR student code (e.g. "FSC-2026-0001").
const resolveStudent = async (ref, { session = null, populate = true } = {}) => {
  const value = String(ref || '').trim();
  if (!value) throw createError('Student is required.', 400);

  const query = U.OBJECT_ID_RE.test(value)
    ? { $or: [{ _id: value }, { student_id: value }] }
    : { student_id: value };

  let q = Student.findOne(query).select(STUDENT_SELECT);
  if (populate) {
    q = q.populate('course_id', 'name').populate('batch_id', 'name start_date');
  }
  if (session) q = q.session(session);

  const student = await q;
  if (!student) throw createError('Student not found.', 404);
  return student;
};

const loadActors = async (ids, session) => {
  const unique = [...new Set(ids.filter(Boolean).map(String))];
  const users = await User.find({ _id: { $in: unique } })
    .select('name is_active')
    .session(session || null);
  return Object.fromEntries(users.map((u) => [String(u._id), u]));
};

const snapshotStudent = (student) => ({
  student_code: student.student_id,
  name: student.full_name,
  course_name: student.course_id?.name || '',
  batch_name: student.batch_id?.name || '',
  academic_year: U.academicYearOf(student.batch_id?.start_date),
  mobile: U.pickMobile(student),
});

const normaliseItems = (items) => {
  const seen = new Set();
  return (items || []).map((i) => {
    const name = String(i.name || '').trim();
    const key = `${i.item_type}|${name.toLowerCase()}`;
    if (seen.has(key)) {
      throw createError(
        `"${name}" is listed twice in this transaction. Merge the quantities into one line.`,
        400
      );
    }
    seen.add(key);
    return {
      item_type: i.item_type,
      name,
      quantity: i.quantity,
      unit: String(i.unit || '').trim() || 'pcs',
      remarks: String(i.remarks || '').trim(),
    };
  });
};

// Same item type + name already given (and not returned/failed) -> warn.
const assertNoDuplicate = async (studentId, items, allowAdditional, session) => {
  const types = [...new Set(items.map((i) => i.item_type))];
  const prior = await MaterialDistribution.find({
    student_id: studentId,
    status: { $nin: U.INACTIVE_STATUSES },
    'items.item_type': { $in: types },
  })
    .select('distribution_no method status items createdAt')
    .session(session || null)
    .lean();

  const wanted = new Set(items.map((i) => `${i.item_type}|${i.name.toLowerCase()}`));
  const conflicts = [];
  for (const d of prior) {
    for (const it of d.items) {
      if (wanted.has(`${it.item_type}|${String(it.name).trim().toLowerCase()}`)) {
        conflicts.push({
          distribution_no: d.distribution_no,
          method: d.method,
          status: d.status,
          item_type: it.item_type,
          name: it.name,
          quantity: it.quantity,
          date: d.createdAt,
        });
      }
    }
  }

  if (conflicts.length && !allowAdditional) {
    throw createError(
      'This student already has the same material recorded. Confirm to record it as an additional distribution.',
      409,
      { code: 'DUPLICATE_DISTRIBUTION', conflicts }
    );
  }
};

/* ------------------------------------------------------------------ */
/* College sender address                                              */
/* ------------------------------------------------------------------ */

const senderFromEnv = () => ({
  name: process.env.COLLEGE_NAME || '',
  address: process.env.COLLEGE_ADDRESS || '',
  pin: process.env.COLLEGE_PIN || '',
  phone: process.env.COLLEGE_PHONE || '',
  email: process.env.COLLEGE_EMAIL || '',
});

const getSender = async () => {
  const doc = await DistributionSetting.findOne({ key: 'default' }).lean();
  if (doc?.sender?.address) {
    const { name, address, pin, phone, email } = doc.sender;
    return { name, address, pin, phone, email, source: 'SETTINGS' };
  }
  return { ...senderFromEnv(), source: 'ENV' };
};

const stripSource = ({ source, ...rest }) => rest;

exports.getSettings = async () => {
  const sender = await getSender();
  return { sender: stripSource(sender), source: sender.source };
};

exports.updateSettings = async (data, user, ip) => {
  const before = await getSender();
  const doc = await DistributionSetting.findOneAndUpdate(
    { key: 'default' },
    {
      $set: {
        sender: {
          name: data.name,
          address: data.address,
          pin: data.pin,
          phone: data.phone || '',
          email: data.email || '',
        },
        updated_by: user.id,
      },
    },
    { upsert: true, new: true, runValidators: true, setDefaultsOnInsert: true }
  );

  await auditService.logAction({
    userId: user.id,
    action: 'UPDATE',
    entity: 'DistributionSetting',
    entityId: doc._id,
    oldValues: stripSource(before),
    newValues: doc.sender,
    ip,
  });

  return { sender: doc.sender, source: 'SETTINGS' };
};

/* ------------------------------------------------------------------ */
/* Create                                                              */
/* ------------------------------------------------------------------ */

const buildAndSave = async (method, body, user, ip, session) => {
  const student = await resolveStudent(body.student_id, { session });
  if (student.status !== 'active') {
    throw createError(`Cannot distribute material: student is ${student.status}.`, 400);
  }

  const items = normaliseItems(body.items);
  await assertNoDuplicate(student._id, items, body.allow_additional, session);

  const actors = await loadActors([user.id, body.given_by], session);
  const recorder = actors[String(user.id)];
  if (!recorder) throw createError('Recording user not found.', 401);

  const giver = body.given_by ? actors[String(body.given_by)] : recorder;
  if (!giver || giver.is_active === false) {
    throw createError('Selected staff member was not found or is inactive.', 400);
  }

  const now = new Date();
  const status = U.INITIAL_STATUS[method];
  const snap = snapshotStudent(student);

  const payload = {
    request_id: body.request_id || undefined,
    method,
    student_id: student._id,
    course_id: student.course_id?._id || null,
    batch_id: student.batch_id?._id || null,
    student_snapshot: snap,
    items,
    status,
    status_history: [
      {
        status,
        changed_at: now,
        changed_by: recorder._id,
        changed_by_name: recorder.name,
        remarks: body.remarks || '',
      },
    ],
    distribution_date: now,
    given_by: giver._id,
    given_by_name: giver.name,
    recorded_by: recorder._id,
    recorded_by_name: recorder.name,
    remarks: body.remarks || '',
  };

  const warnings = [];

  if (method === 'HAND') {
    const handedAt = body.handed_at ? new Date(body.handed_at) : now;
    if (handedAt.getTime() > now.getTime() + 5 * 60 * 1000) {
      throw createError('Handover date/time cannot be in the future.', 400);
    }
    payload.handed_at = handedAt;
    payload.distribution_date = handedAt;
  } else {
    const sender = stripSource(await getSender());
    const senderMissing = U.missingAddressFields(sender);
    if (!sender.name || senderMissing.length) {
      throw createError(
        'College sender address is not configured. Ask an administrator to set it under Distribution Settings.',
        400
      );
    }

    const { recipient, missing } = U.resolveRecipient(student, body.address_override);
    payload.sender_address = sender;
    payload.recipient_address = recipient;
    payload.shipment = {
      carrier_name: method === 'POST' ? body.carrier_name || 'India Post' : body.carrier_name,
      tracking_no: body.tracking_no || '',
      post_office: method === 'POST' ? body.post_office || '' : '',
      service_type: method === 'POST' ? body.service_type || '' : '',
    };

    if (missing.length) {
      warnings.push({
        code: 'INCOMPLETE_ADDRESS',
        missing,
        message: `Recipient address is incomplete (missing: ${missing.join(', ')}). Fix it before printing the label.`,
      });
    }
  }

  const [doc] = await MaterialDistribution.create([payload], { session });

  await auditService.logAction({
    userId: user.id,
    action: 'CREATE',
    entity: ENTITY,
    entityId: doc._id,
    newValues: {
      distribution_no: doc.distribution_no,
      method,
      student: snap.student_code,
      status,
      items,
    },
    ip,
    session,
  });

  return { doc, warnings };
};

exports.createDistribution = async (method, body, user, ip) => {
  if (!U.METHODS.includes(method)) throw createError('Invalid distribution method.', 400);

  const findExisting = () =>
    body.request_id ? MaterialDistribution.findOne({ request_id: body.request_id }) : null;

  // Idempotency: same request_id returns the original record.
  const existing = await findExisting();
  if (existing) return { record: existing, warnings: [], duplicate_request: true };

  try {
    const { doc, warnings } = await withTxn((session) =>
      buildAndSave(method, body, user, ip, session)
    );
    return { record: doc, warnings, duplicate_request: false };
  } catch (err) {
    if (err && err.code === 11000 && body.request_id) {
      const again = await findExisting();
      if (again) return { record: again, warnings: [], duplicate_request: true };
    }
    throw err;
  }
};

/* ------------------------------------------------------------------ */
/* Status / tracking / address updates                                 */
/* ------------------------------------------------------------------ */

const loadOrFail = async (id) => {
  assertObjectId(id, 'distribution id');
  const doc = await MaterialDistribution.findById(id);
  if (!doc) throw createError('Distribution record not found.', 404);
  return doc;
};

exports.updateStatus = async (id, body, user, ip) => {
  const doc = await loadOrFail(id);
  const to = body.status;
  const allowed = (U.TRANSITIONS[doc.method] || {})[doc.status] || [];

  if (!allowed.includes(to)) {
    throw createError(
      allowed.length
        ? `Cannot change status from ${doc.status} to ${to} for a ${doc.method} distribution. Allowed: ${allowed.join(', ')}.`
        : `A ${doc.method} distribution in ${doc.status} status cannot be changed further.`,
      400
    );
  }

  const remarks = String(body.remarks || '').trim();
  if (['FAILED', 'RETURNED'].includes(to) && !remarks) {
    throw createError(`Remarks are required when marking a distribution as ${to}.`, 400);
  }

  const now = new Date();
  let autoNote = '';
  const set = { status: to };
  const actors = await loadActors([user.id, body.given_by]);
  const actor = actors[String(user.id)];
  if (!actor) throw createError('User not found.', 401);

  if (to === 'DISPATCHED') {
    const carrier = body.carrier_name || doc.shipment.carrier_name;
    const tracking = body.tracking_no || doc.shipment.tracking_no;

    if (!carrier) throw createError('Courier / postal service name is required to dispatch.', 400);
    if (doc.method === 'COURIER' && !tracking) {
      throw createError('AWB / tracking number is required to mark a courier as dispatched.', 400);
    }
    const missing = U.missingAddressFields(doc.recipient_address);
    if (missing.length) {
      throw createError(
        `Recipient address is incomplete (missing: ${missing.join(', ')}). Update the address before dispatching.`,
        400,
        { code: 'INCOMPLETE_ADDRESS', missing }
      );
    }

    const dispatchDate = body.dispatch_date ? new Date(body.dispatch_date) : now;
    if (dispatchDate.getTime() > now.getTime() + 5 * 60 * 1000) {
      throw createError('Dispatch date cannot be in the future.', 400);
    }

    set['shipment.carrier_name'] = carrier;
    set['shipment.tracking_no'] = tracking || '';
    set['shipment.dispatch_date'] = dispatchDate;
    if (body.given_by) {
      const g = actors[String(body.given_by)];
      if (!g || g.is_active === false) throw createError('Selected staff member was not found or is inactive.', 400);
      set.given_by = g._id;
      set.given_by_name = g.name;
    } else {
      set.given_by = actor._id;
      set.given_by_name = actor.name;
    }
  }

  if (to === 'DELIVERED') {
    const deliveredAt = body.delivered_at ? new Date(body.delivered_at) : now;
    if (deliveredAt.getTime() > now.getTime() + 5 * 60 * 1000) {
      throw createError('Delivery date cannot be in the future.', 400);
    }
    const dispatched = doc.shipment?.dispatch_date;
    if (dispatched && dispatched.getTime() > now.getTime() + 5 * 60 * 1000) {
      // Older records may have a dispatch date saved in the future by mistake.
      // A dispatch cannot happen after delivery, so correct it to the delivery time.
      set['shipment.dispatch_date'] = deliveredAt;
      autoNote = ' [Dispatch date was in the future and was corrected to the delivery time.]';
    } else if (dispatched && deliveredAt < dispatched) {
      throw createError('Delivery date cannot be before the dispatch date.', 400);
    }
    set['shipment.delivered_at'] = deliveredAt;
  }

  const historyEntry = {
    status: to,
    changed_at: now,
    changed_by: actor._id,
    changed_by_name: actor.name,
    remarks: (remarks + autoNote).trim(),
  };

  const updated = await withTxn(async (session) => {
    // Only update if nobody changed the status in the meantime.
    const res = await MaterialDistribution.findOneAndUpdate(
      { _id: doc._id, status: doc.status },
      { $set: set, $push: { status_history: historyEntry } },
      { new: true, session, runValidators: true }
    );
    if (!res) {
      throw createError('This record was updated by someone else. Refresh and try again.', 409);
    }
    await auditService.logAction({
      userId: user.id,
      action: 'UPDATE',
      entity: ENTITY,
      entityId: doc._id,
      oldValues: { status: doc.status },
      newValues: { status: to, remarks, ...set },
      ip,
      session,
    });
    return res;
  });

  return updated;
};

exports.updateTracking = async (id, body, user, ip) => {
  const doc = await loadOrFail(id);

  if (doc.method === 'HAND') {
    throw createError('Tracking details do not apply to hand distribution.', 400);
  }
  if (!['PREPARED', 'DISPATCHED'].includes(doc.status)) {
    throw createError(`Tracking cannot be edited once the status is ${doc.status}.`, 400);
  }
  if (
    doc.method === 'COURIER' &&
    Object.prototype.hasOwnProperty.call(body, 'carrier_name') &&
    !String(body.carrier_name).trim()
  ) {
    throw createError('Courier company name cannot be empty.', 400);
  }
  if (
    doc.status === 'DISPATCHED' &&
    doc.method === 'COURIER' &&
    Object.prototype.hasOwnProperty.call(body, 'tracking_no') &&
    !String(body.tracking_no).trim()
  ) {
    throw createError('AWB / tracking number cannot be cleared after dispatch.', 400);
  }

  const set = {};
  const old = {};
  for (const f of ['carrier_name', 'tracking_no', 'post_office', 'service_type']) {
    if (Object.prototype.hasOwnProperty.call(body, f)) {
      if ((f === 'post_office' || f === 'service_type') && doc.method !== 'POST') continue;
      old[f] = doc.shipment[f];
      set[`shipment.${f}`] = String(body[f] || '').trim();
    }
  }
  if (!Object.keys(set).length) throw createError('Nothing to update.', 400);

  const updated = await withTxn(async (session) => {
    const res = await MaterialDistribution.findOneAndUpdate(
      { _id: doc._id, status: doc.status },
      { $set: set },
      { new: true, session, runValidators: true }
    );
    if (!res) throw createError('This record was updated by someone else. Refresh and try again.', 409);
    await auditService.logAction({
      userId: user.id,
      action: 'UPDATE',
      entity: ENTITY,
      entityId: doc._id,
      oldValues: old,
      newValues: set,
      ip,
      session,
    });
    return res;
  });

  return updated;
};

// Fix / refresh the recipient snapshot while still PREPARED.
exports.updateAddress = async (id, body, user, ip) => {
  const doc = await loadOrFail(id);

  if (doc.method === 'HAND') throw createError('Address does not apply to hand distribution.', 400);
  if (doc.status !== 'PREPARED') {
    throw createError('Recipient address can only be changed before dispatch.', 400);
  }

  const student = await resolveStudent(doc.student_id, { populate: false });
  const override = body.refresh_from_admission
    ? null
    : { address: body.address, pin: body.pin, phone: body.phone };

  if (!body.refresh_from_admission && !override.address && !override.pin && !override.phone) {
    throw createError('Provide address, pin or phone, or set refresh_from_admission.', 400);
  }

  const { recipient, missing } = U.resolveRecipient(student, override);
  const old = doc.recipient_address ? doc.recipient_address.toObject() : null;

  const updated = await withTxn(async (session) => {
    const res = await MaterialDistribution.findOneAndUpdate(
      { _id: doc._id, status: 'PREPARED' },
      { $set: { recipient_address: recipient } },
      { new: true, session }
    );
    if (!res) throw createError('This record was updated by someone else. Refresh and try again.', 409);
    await auditService.logAction({
      userId: user.id,
      action: 'UPDATE',
      entity: ENTITY,
      entityId: doc._id,
      oldValues: { recipient_address: old },
      newValues: { recipient_address: recipient },
      ip,
      session,
    });
    return res;
  });

  return { record: updated, missing };
};

/* ------------------------------------------------------------------ */
/* Read: filters, list, detail, history                                */
/* ------------------------------------------------------------------ */

// Batch ids for an academic year ('2026-27'), optionally intersected with a batch_id.
const batchIdsForQuery = async (query) => {
  let ids = null;
  if (query.academic_year) {
    const range = U.academicYearRange(query.academic_year);
    if (!range) throw createError('academic_year must look like 2026-27.', 400);
    ids = await Batch.find({ start_date: { $gte: range.start, $lt: range.end } }).distinct('_id');
  }
  if (query.batch_id) {
    assertObjectId(query.batch_id, 'batch_id');
    if (ids && !ids.some((b) => String(b) === String(query.batch_id))) return [];
    return [oid(query.batch_id)];
  }
  return ids; // null = no batch restriction
};

const buildStudentFilter = async (query) => {
  const f = {};
  if (query.course_id) f.course_id = oid(assertObjectId(query.course_id, 'course_id'));

  const batchIds = await batchIdsForQuery(query);
  if (batchIds) f.batch_id = { $in: batchIds };

  const term = String(query.q || query.search || '').trim();
  if (term) {
    const rx = new RegExp(U.escapeRegex(term), 'i');
    f.$or = [{ full_name: rx }, { student_id: rx }, { phone: rx }];
  }
  return f;
};

const buildFilter = async (query) => {
  const f = {};

  if (query.method) {
    const m = String(query.method).toUpperCase();
    if (!U.METHODS.includes(m)) throw createError('Invalid method filter.', 400);
    f.method = m;
  }
  if (query.status) {
    const s = String(query.status).toUpperCase();
    if (!U.RECORD_STATUSES.includes(s)) throw createError('Invalid status filter.', 400);
    f.status = s;
  }
  if (query.student) {
    const s = await resolveStudent(query.student, { populate: false });
    f.student_id = s._id;
  }
  if (query.course_id) f.course_id = oid(assertObjectId(query.course_id, 'course_id'));

  const batchIds = await batchIdsForQuery(query);
  if (batchIds) f.batch_id = { $in: batchIds };

  const from = U.parseDayBoundary(query.date_from, false);
  const to = U.parseDayBoundary(query.date_to, true);
  if ((query.date_from && !from) || (query.date_to && !to)) {
    throw createError('Invalid date range.', 400);
  }
  if (from || to) {
    const range = {};
    if (from) range.$gte = from;
    if (to) range.$lte = to;
    // Hand -> handed_at, Post/Courier -> dispatch date
    f.$or = [{ handed_at: range }, { 'shipment.dispatch_date': range }];
  }

  const term = String(query.q || query.search || '').trim();
  if (term) {
    const rx = new RegExp(U.escapeRegex(term), 'i');
    f.$and = [
      {
        $or: [
          { distribution_no: rx },
          { 'shipment.tracking_no': rx },
          { 'student_snapshot.name': rx },
          { 'student_snapshot.student_code': rx },
        ],
      },
    ];
  }
  return f;
};
exports.buildFilter = buildFilter;

exports.listDistributions = async (query) => {
  const { page, limit, skip } = parsePaging(query);
  const filter = await buildFilter(query);

  const [data, total] = await Promise.all([
    MaterialDistribution.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
    MaterialDistribution.countDocuments(filter),
  ]);

  return {
    data,
    pagination: { total, page, limit, pages: Math.ceil(total / limit) || 1 },
  };
};

exports.getDistribution = async (id) => {
  assertObjectId(id, 'distribution id');
  const doc = await MaterialDistribution.findById(id).lean();
  if (!doc) throw createError('Distribution record not found.', 404);
  return doc;
};

exports.getStudentHistory = async (studentRef) => {
  const student = await resolveStudent(studentRef);

  const records = await MaterialDistribution.find({ student_id: student._id })
    .sort({ createdAt: -1 })
    .limit(500)
    .lean();

  // Quantity per item type: delivered / in transit / not received (returned, failed)
  const totals = {};
  for (const t of U.ITEM_TYPES) {
    totals[t] = { label: U.ITEM_TYPE_LABELS[t], delivered: 0, in_transit: 0, not_received: 0 };
  }
  for (const r of records) {
    const bucket =
      r.status === 'DELIVERED'
        ? 'delivered'
        : U.IN_TRANSIT_STATUSES.includes(r.status)
        ? 'in_transit'
        : 'not_received';
    for (const it of r.items) {
      if (totals[it.item_type]) totals[it.item_type][bucket] += it.quantity;
    }
  }

  const { recipient, missing } = U.resolveRecipient(student);

  return {
    student: {
      _id: student._id,
      student_id: student.student_id,
      full_name: student.full_name,
      course: student.course_id?.name || '',
      batch: student.batch_id?.name || '',
      academic_year: U.academicYearOf(student.batch_id?.start_date),
      mobile: U.pickMobile(student),
      address: { ...recipient, complete: missing.length === 0, missing },
    },
    totals,
    total_distributions: records.length,
    records,
  };
};

/* ------------------------------------------------------------------ */
/* Student list with Pending / Delivered status                        */
/* ------------------------------------------------------------------ */

// studentId -> status of latest distribution that was not returned/failed.
const latestStatusMap = async () => {
  const rows = await MaterialDistribution.aggregate([
    { $match: { status: { $nin: U.INACTIVE_STATUSES } } },
    { $sort: { createdAt: -1 } },
    {
      $group: {
        _id: '$student_id',
        status: { $first: '$status' },
        last_date: { $first: '$createdAt' },
      },
    },
  ]);
  return new Map(rows.map((r) => [String(r._id), r]));
};

exports.listStudents = async (query) => {
  const { page, limit, skip } = parsePaging(query);
  const filter = await buildStudentFilter(query);
  filter.status = 'active';

  const map = await latestStatusMap();

  if (query.distribution_status) {
    const s = String(query.distribution_status).toUpperCase();
    if (!U.STUDENT_STATUSES.includes(s)) throw createError('Invalid distribution_status filter.', 400);
    if (s === 'PENDING') {
      filter._id = { $nin: [...map.keys()].map(oid) };
    } else {
      filter._id = {
        $in: [...map.entries()].filter(([, v]) => v.status === s).map(([k]) => oid(k)),
      };
    }
  }

  const [students, total] = await Promise.all([
    Student.find(filter)
      .select(STUDENT_SELECT)
      .populate('course_id', 'name')
      .populate('batch_id', 'name start_date')
      .sort({ full_name: 1 })
      .skip(skip)
      .limit(limit),
    Student.countDocuments(filter),
  ]);

  const ids = students.map((s) => s._id);
  const counts = ids.length
    ? await MaterialDistribution.aggregate([
        { $match: { student_id: { $in: ids } } },
        { $group: { _id: '$student_id', count: { $sum: 1 } } },
      ])
    : [];
  const countMap = new Map(counts.map((c) => [String(c._id), c.count]));

  const data = students.map((s) => {
    const entry = map.get(String(s._id));
    const { missing } = U.resolveRecipient(s);
    return {
      _id: s._id,
      student_id: s.student_id,
      full_name: s.full_name,
      mobile: U.pickMobile(s),
      course: s.course_id ? { _id: s.course_id._id, name: s.course_id.name } : null,
      batch: s.batch_id ? { _id: s.batch_id._id, name: s.batch_id.name } : null,
      academic_year: U.academicYearOf(s.batch_id?.start_date),
      distribution_status: entry ? entry.status : 'PENDING',
      distribution_count: countMap.get(String(s._id)) || 0,
      last_distribution_date: entry ? entry.last_date : null,
      address_complete: missing.length === 0,
      address_missing: missing,
    };
  });

  return { data, pagination: { total, page, limit, pages: Math.ceil(total / limit) || 1 } };
};

/* ------------------------------------------------------------------ */
/* Summary (dashboard)                                                 */
/* ------------------------------------------------------------------ */

exports.getSummary = async (query) => {
  const filter = await buildFilter(query);

  const [byStatus, byItem] = await Promise.all([
    MaterialDistribution.aggregate([
      { $match: filter },
      { $group: { _id: { method: '$method', status: '$status' }, count: { $sum: 1 } } },
    ]),
    MaterialDistribution.aggregate([
      { $match: filter },
      { $unwind: '$items' },
      {
        $group: {
          _id: { method: '$method', item_type: '$items.item_type' },
          quantity: { $sum: '$items.quantity' },
        },
      },
    ]),
  ]);

  const by_method = {};
  for (const m of U.METHODS) by_method[m] = { total: 0, statuses: {}, items: {} };
  for (const r of byStatus) {
    by_method[r._id.method].total += r.count;
    by_method[r._id.method].statuses[r._id.status] = r.count;
  }
  for (const r of byItem) {
    by_method[r._id.method].items[r._id.item_type] = r.quantity;
  }

  // Pending students (active, no live distribution) for the chosen course/batch/year
  const studentFilter = await buildStudentFilter(query);
  studentFilter.status = 'active';
  const [activeStudents, map] = await Promise.all([
    Student.find(studentFilter).select('_id').lean(),
    latestStatusMap(),
  ]);
  const pending_students = activeStudents.filter((s) => !map.has(String(s._id))).length;

  return {
    total_distributions: Object.values(by_method).reduce((n, m) => n + m.total, 0),
    pending_students,
    total_active_students: activeStudents.length,
    by_method,
  };
};