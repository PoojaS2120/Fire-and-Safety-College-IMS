// const XLSX = require('xlsx');
// const ClassSchedule = require('../models/ClassSchedule');
// const Course = require('../../courses/models/Course');
// const Batch = require('../../courses/models/Batch');
// const User = require('../../auth/models/User');
// const FacultyAssignment = require('../../faculty/models/FacultyAssignment');

// // Helper: Get next specific day of week
// const getNextDayOfWeek = (startDate, targetDay) => {
//   const days = { sunday: 0, monday: 1, tuesday: 2, wednesday: 3, thursday: 4, friday: 5, saturday: 6 };
//   const target = days[targetDay.toLowerCase()];
//   if (target === undefined) throw new Error(`Invalid Day: ${targetDay}. Use Monday, Tuesday, etc.`);
  
//   const date = new Date(startDate);
//   const currentDay = date.getDay();
//   const distance = (target - currentDay + 7) % 7;
//   date.setDate(date.getDate() + distance);
//   return date;
// };

// exports.importSchedules = async (buffer, adminId) => {
//   const workbook = XLSX.read(buffer, { type: 'buffer' });
//   const sheetName = workbook.SheetNames[0];
//   const sheet = workbook.Sheets[sheetName];
//   const rows = XLSX.utils.sheet_to_json(sheet);

//   if (!rows || rows.length === 0) {
//     throw { statusCode: 400, message: 'Excel file is empty or invalid format' };
//   }

//   const results = { totalRows: rows.length, successCount: 0, failedCount: 0, errors: [] };

//   for (let i = 0; i < rows.length; i++) {
//     const row = rows[i];
//     const rowNumber = i + 2;

//     try {
//       const courseName = row['Course Name']?.trim();
//       const batchName = row['Batch Name']?.trim();
//       const subject = row['Subject']?.trim();
//       const facultyEmail = row['Faculty Email']?.trim();
//       const dayStr = row['Day']?.trim();
//       const startTime = String(row['Start Time']).trim();
//       const endTime = String(row['End Time']).trim();
//       const startDateStr = row['Start Date'];
//       const repeatWeeks = Number(row['Repeat Weeks'] || 1);

//       if (!courseName || !batchName || !subject || !facultyEmail || !dayStr || !startTime || !endTime || !startDateStr) {
//         throw new Error('Missing required columns (Course, Batch, Subject, Faculty, Day, Times, Start Date)');
//       }

//       const course = await Course.findOne({ name: courseName, status: 'active' });
//       if (!course) throw new Error(`Course "${courseName}" not found`);

//       const batch = await Batch.findOne({ name: batchName, course_id: course._id, status: 'active' });
//       if (!batch) throw new Error(`Batch "${batchName}" not found`);

//       const faculty = await User.findOne({ email: facultyEmail, role: 'faculty', is_active: true });
//       if (!faculty) throw new Error(`Faculty "${facultyEmail}" not found`);

//       const isAssigned = await FacultyAssignment.exists({
//         faculty_id: faculty._id, course_id: course._id, batch_id: batch._id, subject,
//       });
//       if (!isAssigned) throw new Error(`Faculty not assigned to ${subject} in this batch`);

//       // Handle Start Date (Excel Date or String)
//       let rawStartDate;
//       if (typeof startDateStr === 'number') {
//         rawStartDate = new Date(Math.round((startDateStr - 25569) * 86400 * 1000));
//       } else {
//         rawStartDate = new Date(startDateStr);
//       }
//       if (isNaN(rawStartDate.getTime())) throw new Error(`Invalid Start Date: ${startDateStr}`);

//       // Find the first occurrence of the Day
//       let firstClassDate = getNextDayOfWeek(rawStartDate, dayStr);

//       // Generate Dates
//       const datesToCreate = [];
//       for (let w = 0; w < repeatWeeks; w++) {
//         const d = new Date(firstClassDate);
//         d.setDate(d.getDate() + (w * 7)); // Add 7 days for each week
//         datesToCreate.push(d);
//       }

//       // Insert each date
//       for (const classDate of datesToCreate) {
//         // Check for Time Clashes
//         const conflict = await ClassSchedule.findOne({
//           date: classDate,
//           status: 'scheduled',
//           $or: [{ faculty_id: faculty._id }, { batch_id: batch._id }],
//           start_time: { $lt: endTime },
//           end_time: { $gt: startTime },
//         });

//         if (!conflict) {
//           await ClassSchedule.create({
//             course_id: course._id,
//             batch_id: batch._id,
//             faculty_id: faculty._id,
//             subject,
//             date: classDate,
//             start_time: startTime,
//             end_time: endTime,
//             created_by: adminId,
//           });
//         }
//       }

//       results.successCount++;
//     } catch (error) {
//       results.failedCount++;
//       results.errors.push({ row: rowNumber, message: error.message });
//     }
//   }

//   return results;
// };




const XLSX = require('xlsx');
const ClassSchedule = require('../models/ClassSchedule');
const Course = require('../../courses/models/Course');
const Batch = require('../../courses/models/Batch');
const User = require('../../auth/models/User');
const FacultyAssignment = require('../../faculty/models/FacultyAssignment');

const MAX_ROWS = 1000;
const MAX_REPEAT_WEEKS = 52;

// Column order of the template. The importer matches headers ignoring case and extra spaces.
const COLUMNS = [
  'Course Name',
  'Batch Name',
  'Subject',
  'Faculty Email',
  'Day',
  'Start Time',
  'End Time',
  'Start Date',
  'Repeat Weeks',
];

const DAYS = {
  sunday: 0, sun: 0,
  monday: 1, mon: 1,
  tuesday: 2, tue: 2, tues: 2,
  wednesday: 3, wed: 3,
  thursday: 4, thu: 4, thur: 4, thurs: 4,
  friday: 5, fri: 5,
  saturday: 6, sat: 6,
};

const fail = (message) => {
  throw new Error(message);
};

// Any cell -> trimmed string ('' when empty). Numbers in text columns no longer crash .trim().
const text = (v) => (v === undefined || v === null ? '' : String(v).trim());

const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// Header lookup that ignores case and spacing: 'faculty  email' matches 'Faculty Email'
const normaliseRow = (row) => {
  const out = {};
  for (const [key, value] of Object.entries(row)) {
    out[String(key).trim().toLowerCase().replace(/\s+/g, ' ')] = value;
  }
  return out;
};

const pad = (n) => String(n).padStart(2, '0');

// Excel stores a time as a fraction of a day (0.395833 = 09:30). Text times such as
// '9:30', '09:30' or '9:30 AM' are accepted too. Always returns 'HH:mm' (24 hour).
const parseTime = (value, label) => {
  if (typeof value === 'number' && value >= 0 && value < 1) {
    const totalMinutes = Math.round(value * 24 * 60);
    return `${pad(Math.floor(totalMinutes / 60) % 24)}:${pad(totalMinutes % 60)}`;
  }
  const raw = text(value);
  const m = /^(\d{1,2}):(\d{2})(?::\d{2})?\s*([AaPp][Mm])?$/.exec(raw);
  if (!m) fail(`Invalid ${label} "${raw}". Use HH:mm, for example 09:30 or 14:00`);
  let hours = Number(m[1]);
  const minutes = Number(m[2]);
  const meridiem = m[3] ? m[3].toLowerCase() : null;
  if (meridiem) {
    if (hours < 1 || hours > 12) fail(`Invalid ${label} "${raw}"`);
    if (meridiem === 'pm' && hours !== 12) hours += 12;
    if (meridiem === 'am' && hours === 12) hours = 0;
  }
  if (hours > 23 || minutes > 59) fail(`Invalid ${label} "${raw}"`);
  return `${pad(hours)}:${pad(minutes)}`;
};

// Excel serial number, Date object, YYYY-MM-DD or DD/MM/YYYY -> Date at 00:00 UTC.
// The schedule API stores new Date('YYYY-MM-DD'), which is also 00:00 UTC, so both match.
const parseDate = (value) => {
  let y;
  let m;
  let d;

  if (typeof value === 'number') {
    const date = new Date(Math.round((value - 25569) * 86400 * 1000));
    if (Number.isNaN(date.getTime())) fail(`Invalid Start Date "${value}"`);
    return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  }
  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) fail('Invalid Start Date');
    return new Date(Date.UTC(value.getFullYear(), value.getMonth(), value.getDate()));
  }

  const raw = text(value);
  let match = /^(\d{4})-(\d{1,2})-(\d{1,2})/.exec(raw);
  if (match) {
    [, y, m, d] = match;
  } else if ((match = /^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/.exec(raw))) {
    [, d, m, y] = match;
  } else {
    fail(`Invalid Start Date "${raw}". Use YYYY-MM-DD or DD/MM/YYYY`);
  }
  const date = new Date(Date.UTC(Number(y), Number(m) - 1, Number(d)));
  if (date.getUTCMonth() !== Number(m) - 1 || date.getUTCDate() !== Number(d)) {
    fail(`Invalid Start Date "${raw}"`);
  }
  return date;
};

// First date on or after startDate that falls on the given weekday (all in UTC)
const nextDayOfWeek = (startDate, dayIndex) => {
  const date = new Date(startDate);
  const distance = (dayIndex - date.getUTCDay() + 7) % 7;
  date.setUTCDate(date.getUTCDate() + distance);
  return date;
};

const fmtIso = (date) => date.toISOString().slice(0, 10);

/**
 * Bulk create class schedules from an Excel / CSV buffer.
 *
 * Each row becomes one class per week for `Repeat Weeks` weeks, starting on the first matching
 * weekday on or after `Start Date`. A week that clashes with an existing scheduled class of the same
 * faculty or batch is skipped and reported as a warning; it never overwrites anything.
 *
 * Returns:
 *   totalRows, successCount, failedCount   rows
 *   createdClasses, skippedConflicts       individual classes
 *   errors   [{ row, message }]   rows that created nothing
 *   warnings [{ row, message }]   rows that created some classes but skipped clashing weeks
 */
exports.importSchedules = async (buffer, adminId) => {
  let rows;
  try {
    const workbook = XLSX.read(buffer, { type: 'buffer', cellDates: false });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    rows = sheet ? XLSX.utils.sheet_to_json(sheet, { defval: '' }) : [];
  } catch (e) {
    throw { statusCode: 400, message: 'The file could not be read. Upload the schedule template as .xlsx or .csv' };
  }

  if (!rows.length) {
    throw { statusCode: 400, message: 'The file has no rows. Fill in the template and upload it again' };
  }
  if (rows.length > MAX_ROWS) {
    throw { statusCode: 400, message: `Too many rows (${rows.length}). Import at most ${MAX_ROWS} rows at a time` };
  }

  const headers = Object.keys(normaliseRow(rows[0]));
  const missing = COLUMNS.filter((c) => c !== 'Repeat Weeks' && !headers.includes(c.toLowerCase()));
  if (missing.length) {
    throw { statusCode: 400, message: `Missing column(s): ${missing.join(', ')}. Download the template for the exact headings` };
  }

  const result = {
    totalRows: rows.length,
    successCount: 0,
    failedCount: 0,
    createdClasses: 0,
    skippedConflicts: 0,
    errors: [],
    warnings: [],
  };

  // Lookups repeat a lot in a timetable, so each one is fetched once
  const courseCache = new Map();
  const batchCache = new Map();
  const facultyCache = new Map();

  const findCourse = async (name) => {
    const key = name.toLowerCase();
    if (!courseCache.has(key)) {
      courseCache.set(
        key,
        await Course.findOne({ name: new RegExp(`^${escapeRegex(name)}$`, 'i'), status: 'active' })
      );
    }
    return courseCache.get(key);
  };
  const findBatch = async (name, course) => {
    const key = `${course._id}:${name.toLowerCase()}`;
    if (!batchCache.has(key)) {
      batchCache.set(
        key,
        await Batch.findOne({ name: new RegExp(`^${escapeRegex(name)}$`, 'i'), course_id: course._id, status: 'active' })
      );
    }
    return batchCache.get(key);
  };
  const findFaculty = async (email) => {
    const key = email.toLowerCase();
    if (!facultyCache.has(key)) {
      facultyCache.set(key, await User.findOne({ email: key, role: 'faculty', is_active: true }));
    }
    return facultyCache.get(key);
  };

  for (let i = 0; i < rows.length; i++) {
    const row = normaliseRow(rows[i]);
    const rowNumber = i + 2; // row 1 is the heading

    // Skip rows that are completely empty
    if (Object.values(row).every((v) => text(v) === '')) {
      result.totalRows -= 1;
      continue;
    }

    try {
      const courseName = text(row['course name']);
      const batchName = text(row['batch name']);
      const subject = text(row['subject']);
      const facultyEmail = text(row['faculty email']).toLowerCase();
      const dayText = text(row['day']).toLowerCase();

      const required = { 'Course Name': courseName, 'Batch Name': batchName, Subject: subject, 'Faculty Email': facultyEmail, Day: dayText };
      const blank = Object.entries(required).filter(([, v]) => !v).map(([k]) => k);
      if (blank.length) fail(`Missing value for ${blank.join(', ')}`);

      const dayIndex = DAYS[dayText];
      if (dayIndex === undefined) fail(`Invalid Day "${text(row['day'])}". Use Monday, Tuesday, and so on`);

      const startTime = parseTime(row['start time'], 'Start Time');
      const endTime = parseTime(row['end time'], 'End Time');
      if (startTime >= endTime) fail('End Time must be after Start Time');

      if (text(row['start date']) === '' && typeof row['start date'] !== 'number') fail('Missing value for Start Date');
      const startDate = parseDate(row['start date']);

      const weeksRaw = text(row['repeat weeks']);
      const repeatWeeks = weeksRaw === '' ? 1 : Number(weeksRaw);
      if (!Number.isInteger(repeatWeeks) || repeatWeeks < 1 || repeatWeeks > MAX_REPEAT_WEEKS) {
        fail(`Repeat Weeks must be a whole number from 1 to ${MAX_REPEAT_WEEKS}`);
      }

      const course = await findCourse(courseName);
      if (!course) fail(`Course "${courseName}" not found or not active`);
      const batch = await findBatch(batchName, course);
      if (!batch) fail(`Batch "${batchName}" not found in ${course.name}`);
      const faculty = await findFaculty(facultyEmail);
      if (!faculty) fail(`Faculty "${facultyEmail}" not found or not active`);

      const assigned = await FacultyAssignment.exists({
        faculty_id: faculty._id,
        course_id: course._id,
        batch_id: batch._id,
        subject: new RegExp(`^${escapeRegex(subject)}$`, 'i'),
      });
      if (!assigned) fail(`${facultyEmail} is not assigned to ${subject} for ${course.name} / ${batch.name}`);

      const firstDate = nextDayOfWeek(startDate, dayIndex);
      let created = 0;
      const clashes = [];

      for (let w = 0; w < repeatWeeks; w++) {
        const classDate = new Date(firstDate);
        classDate.setUTCDate(classDate.getUTCDate() + w * 7);

        const conflict = await ClassSchedule.findOne({
          date: classDate,
          status: 'scheduled',
          $or: [{ faculty_id: faculty._id }, { batch_id: batch._id }],
          start_time: { $lt: endTime },
          end_time: { $gt: startTime },
        });

        if (conflict) {
          clashes.push(fmtIso(classDate));
          continue;
        }

        await ClassSchedule.create({
          course_id: course._id,
          batch_id: batch._id,
          faculty_id: faculty._id,
          subject,
          date: classDate,
          start_time: startTime,
          end_time: endTime,
          created_by: adminId,
        });
        created += 1;
      }

      result.createdClasses += created;
      result.skippedConflicts += clashes.length;

      if (created === 0) {
        fail(`Every class clashes with an existing schedule (${clashes.join(', ')})`);
      }
      result.successCount += 1;
      if (clashes.length) {
        result.warnings.push({
          row: rowNumber,
          message: `${created} created. Skipped ${clashes.length} that clash with existing classes: ${clashes.join(', ')}`,
        });
      }
    } catch (error) {
      result.failedCount += 1;
      result.errors.push({ row: rowNumber, message: error.message || 'Could not import this row' });
    }
  }

  return result;
};

// Blank template: headings on the first sheet (the only sheet that is imported), notes on a second.
exports.buildTemplateBuffer = () => {
  const data = XLSX.utils.aoa_to_sheet([COLUMNS]);
  data['!cols'] = COLUMNS.map((c) => ({ wch: Math.max(14, c.length + 4) }));

  const notes = XLSX.utils.aoa_to_sheet([
    ['Column', 'What to enter'],
    ['Course Name', 'Exactly as in Courses, for example BCA'],
    ['Batch Name', 'A batch of that course, for example 2026-27'],
    ['Subject', 'Must match a subject assigned to the faculty for that batch'],
    ['Faculty Email', 'Login email of an active faculty member'],
    ['Day', 'Monday, Tuesday, and so on'],
    ['Start Time', 'HH:mm, 24 hour, for example 09:30'],
    ['End Time', 'HH:mm, after the start time, for example 10:30'],
    ['Start Date', 'YYYY-MM-DD. The first class is on the first matching Day on or after this date'],
    ['Repeat Weeks', 'Optional. Number of weekly classes to create, 1 to 52. Default 1'],
    [],
    ['Clashes', 'A week where the faculty or the batch already has a class at that time is skipped and listed in the report'],
  ]);
  notes['!cols'] = [{ wch: 16 }, { wch: 90 }];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, data, 'Schedules');
  XLSX.utils.book_append_sheet(wb, notes, 'Instructions');
  return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
};