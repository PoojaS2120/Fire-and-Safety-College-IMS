const XLSX = require('xlsx');
const MaterialDistribution = require('../models/MaterialDistribution');
const distributionService = require('./distributionService');
const U = require('../utils/distributionUtils');

const { createError } = U;
const MAX_ROWS = 50000;

const fmtDateTime = (d) =>
  d
    ? new Date(d).toLocaleString('en-IN', {
        timeZone: 'Asia/Kolkata',
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
      })
    : '';

const fmtDate = (d) =>
  d
    ? new Date(d).toLocaleDateString('en-IN', {
        timeZone: 'Asia/Kolkata',
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      })
    : '';

const oneLine = (v) => String(v || '').replace(/\s*[\r\n]+\s*/g, ', ').trim();

const addSheet = (wb, name, rows, widths) => {
  const ws = XLSX.utils.json_to_sheet(rows);
  if (widths) ws['!cols'] = widths.map((wch) => ({ wch }));
  XLSX.utils.book_append_sheet(wb, ws, name);
};

// Pure function (no DB) - one row per item so every item + quantity is visible.
exports.buildWorkbook = (docs) => {
  const wb = XLSX.utils.book_new();

  /* Sheet 1: Details */
  const details = [];
  let sr = 1;
  for (const d of docs) {
    const snap = d.student_snapshot || {};
    const sh = d.shipment || {};
    const sender = d.sender_address || {};
    const rec = d.recipient_address || {};

    for (const it of d.items || []) {
      details.push({
        'Sr. No.': sr++,
        'Distribution No.': d.distribution_no,
        'Student ID': snap.student_code,
        'Student Name': snap.name,
        Course: snap.course_name,
        Batch: snap.batch_name,
        'Academic Year': snap.academic_year,
        'Mobile Number': snap.mobile,
        'Distribution Method': d.method,
        'Material Type': U.ITEM_TYPE_LABELS[it.item_type] || it.item_type,
        'Material Name': it.name,
        Quantity: it.quantity,
        Unit: it.unit,
        'Distribution Date': fmtDateTime(d.method === 'HAND' ? d.handed_at : d.distribution_date),
        'Dispatch Date': d.method === 'HAND' ? '' : fmtDate(sh.dispatch_date),
        'Sender Name/College': d.method === 'HAND' ? '' : sender.name || '',
        'Recipient Address': d.method === 'HAND' ? '' : oneLine(rec.address),
        'PIN Code': d.method === 'HAND' ? '' : rec.pin || '',
        'Courier/Post Company': d.method === 'HAND' ? '' : sh.carrier_name || '',
        'Tracking/AWB Number': d.method === 'HAND' ? '' : sh.tracking_no || '',
        'Distribution Status': d.status,
        'Given/Dispatched By': d.given_by_name,
        'Recorded By': d.recorded_by_name,
        Remarks: [d.remarks, it.remarks].filter(Boolean).join(' | '),
      });
    }
  }
  addSheet(wb, 'Distributions', details, [
    7, 20, 14, 24, 22, 20, 12, 14, 12, 18, 28, 9, 8, 22, 14, 28, 40, 10, 20, 20, 14, 20, 20, 30,
  ]);

  /* Sheet 2: Method-wise summary */
  const summaryMap = new Map();
  for (const d of docs) {
    const key = `${d.method}|${d.status}`;
    const row = summaryMap.get(key) || { Method: d.method, Status: d.status, Distributions: 0, 'Total Quantity': 0 };
    row.Distributions += 1;
    row['Total Quantity'] += (d.items || []).reduce((n, it) => n + it.quantity, 0);
    summaryMap.set(key, row);
  }
  addSheet(
    wb,
    'Method Summary',
    [...summaryMap.values()].sort((a, b) => a.Method.localeCompare(b.Method) || a.Status.localeCompare(b.Status)),
    [14, 14, 14, 16]
  );

  /* Sheet 3: Student-wise (quantities actually delivered vs in transit) */
  const byStudent = new Map();
  for (const d of docs) {
    const snap = d.student_snapshot || {};
    const key = String(d.student_id);
    let row = byStudent.get(key);
    if (!row) {
      row = {
        'Student ID': snap.student_code,
        'Student Name': snap.name,
        Course: snap.course_name,
        Batch: snap.batch_name,
        'Academic Year': snap.academic_year,
        'Total Distributions': 0,
        'Last Distribution': null,
      };
      for (const t of U.ITEM_TYPES) {
        row[`${U.ITEM_TYPE_LABELS[t]} (Delivered)`] = 0;
        row[`${U.ITEM_TYPE_LABELS[t]} (In Transit)`] = 0;
      }
      byStudent.set(key, row);
    }
    row['Total Distributions'] += 1;
    const when = d.method === 'HAND' ? d.handed_at : d.distribution_date;
    if (when && (!row['Last Distribution'] || new Date(when) > new Date(row['Last Distribution']))) {
      row['Last Distribution'] = when;
    }
    const bucket =
      d.status === 'DELIVERED' ? 'Delivered' : U.IN_TRANSIT_STATUSES.includes(d.status) ? 'In Transit' : null;
    if (bucket) {
      for (const it of d.items || []) {
        row[`${U.ITEM_TYPE_LABELS[it.item_type]} (${bucket})`] += it.quantity;
      }
    }
  }
  const studentRows = [...byStudent.values()].map((r) => ({
    ...r,
    'Last Distribution': fmtDateTime(r['Last Distribution']),
  }));
  addSheet(wb, 'Student-wise', studentRows);

  return wb;
};

exports.exportWorkbook = async (query) => {
  const filter = await distributionService.buildFilter(query);
  const docs = await MaterialDistribution.find(filter)
    .sort({ createdAt: 1 })
    .limit(MAX_ROWS + 1)
    .lean();

  if (docs.length > MAX_ROWS) {
    throw createError(`Too many records to export (over ${MAX_ROWS}). Narrow the filters.`, 400);
  }

  const wb = exports.buildWorkbook(docs);
  const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
  const stamp = new Date().toISOString().slice(0, 10);
  return { buffer, filename: `material-distribution-${stamp}` };
};