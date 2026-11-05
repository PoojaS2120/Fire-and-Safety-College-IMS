const XLSX = require('xlsx');
const ClassSchedule = require('../models/ClassSchedule');
const Course = require('../../courses/models/Course');
const Batch = require('../../courses/models/Batch');
const User = require('../../auth/models/User');
const FacultyAssignment = require('../../faculty/models/FacultyAssignment');

// Helper: Get next specific day of week
const getNextDayOfWeek = (startDate, targetDay) => {
  const days = { sunday: 0, monday: 1, tuesday: 2, wednesday: 3, thursday: 4, friday: 5, saturday: 6 };
  const target = days[targetDay.toLowerCase()];
  if (target === undefined) throw new Error(`Invalid Day: ${targetDay}. Use Monday, Tuesday, etc.`);
  
  const date = new Date(startDate);
  const currentDay = date.getDay();
  const distance = (target - currentDay + 7) % 7;
  date.setDate(date.getDate() + distance);
  return date;
};

exports.importSchedules = async (buffer, adminId) => {
  const workbook = XLSX.read(buffer, { type: 'buffer' });
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  const rows = XLSX.utils.sheet_to_json(sheet);

  if (!rows || rows.length === 0) {
    throw { statusCode: 400, message: 'Excel file is empty or invalid format' };
  }

  const results = { totalRows: rows.length, successCount: 0, failedCount: 0, errors: [] };

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const rowNumber = i + 2;

    try {
      const courseName = row['Course Name']?.trim();
      const batchName = row['Batch Name']?.trim();
      const subject = row['Subject']?.trim();
      const facultyEmail = row['Faculty Email']?.trim();
      const dayStr = row['Day']?.trim();
      const startTime = String(row['Start Time']).trim();
      const endTime = String(row['End Time']).trim();
      const startDateStr = row['Start Date'];
      const repeatWeeks = Number(row['Repeat Weeks'] || 1);

      if (!courseName || !batchName || !subject || !facultyEmail || !dayStr || !startTime || !endTime || !startDateStr) {
        throw new Error('Missing required columns (Course, Batch, Subject, Faculty, Day, Times, Start Date)');
      }

      const course = await Course.findOne({ name: courseName, status: 'active' });
      if (!course) throw new Error(`Course "${courseName}" not found`);

      const batch = await Batch.findOne({ name: batchName, course_id: course._id, status: 'active' });
      if (!batch) throw new Error(`Batch "${batchName}" not found`);

      const faculty = await User.findOne({ email: facultyEmail, role: 'faculty', is_active: true });
      if (!faculty) throw new Error(`Faculty "${facultyEmail}" not found`);

      const isAssigned = await FacultyAssignment.exists({
        faculty_id: faculty._id, course_id: course._id, batch_id: batch._id, subject,
      });
      if (!isAssigned) throw new Error(`Faculty not assigned to ${subject} in this batch`);

      // Handle Start Date (Excel Date or String)
      let rawStartDate;
      if (typeof startDateStr === 'number') {
        rawStartDate = new Date(Math.round((startDateStr - 25569) * 86400 * 1000));
      } else {
        rawStartDate = new Date(startDateStr);
      }
      if (isNaN(rawStartDate.getTime())) throw new Error(`Invalid Start Date: ${startDateStr}`);

      // Find the first occurrence of the Day
      let firstClassDate = getNextDayOfWeek(rawStartDate, dayStr);

      // Generate Dates
      const datesToCreate = [];
      for (let w = 0; w < repeatWeeks; w++) {
        const d = new Date(firstClassDate);
        d.setDate(d.getDate() + (w * 7)); // Add 7 days for each week
        datesToCreate.push(d);
      }

      // Insert each date
      for (const classDate of datesToCreate) {
        // Check for Time Clashes
        const conflict = await ClassSchedule.findOne({
          date: classDate,
          status: 'scheduled',
          $or: [{ faculty_id: faculty._id }, { batch_id: batch._id }],
          start_time: { $lt: endTime },
          end_time: { $gt: startTime },
        });

        if (!conflict) {
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
        }
      }

      results.successCount++;
    } catch (error) {
      results.failedCount++;
      results.errors.push({ row: rowNumber, message: error.message });
    }
  }

  return results;
};