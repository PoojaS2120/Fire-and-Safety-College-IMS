
const mongoose = require('mongoose');

const ClassTest = require('../models/ClassTest');
const ClassTestMark = require('../models/ClassTestMark');

const Course = require('../../courses/models/Course');
const Batch = require('../../courses/models/Batch');
const User = require('../../auth/models/User');
const Student = require('../../students/models/Student');
const FacultyAssignment = require('../../faculty/models/FacultyAssignment');
const AuditLog = require('../../audit/models/AuditLog');

const importExportService = require('../../../common/importExport/services/importExportService');

// =====================================================
// COMMON HELPERS
// =====================================================

const fail = (statusCode, message) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  throw error;
};

const validId = id => mongoose.Types.ObjectId.isValid(id);

const getTest = async id => {
  if (!validId(id)) {
    fail(400, 'Invalid class test ID');
  }

  const test = await ClassTest.findOne({
    _id: id,
    deleted_at: null
  });

  if (!test) {
    fail(404, 'Class test not found');
  }

  return test;
};

const checkPermission = (test, user) => {
  if (user.role === 'super_admin') return;

  if (
    user.role !== 'faculty' ||
    String(test.faculty_id) !== String(user.id)
  ) {
    fail(403, 'You can manage only your assigned class tests');
  }
};

const checkReadPermission = (test, user) => {
  if (
    user.role === 'super_admin' ||
    user.role === 'office_staff'
  ) {
    return;
  }

  if (
    user.role !== 'faculty' ||
    String(test.faculty_id) !== String(user.id)
  ) {
    fail(403, 'You can view only your assigned class tests');
  }
};

const checkFacultyAssignment = async (
  facultyId,
  courseId,
  batchId,
  subject
) => {
  const assignment = await FacultyAssignment.findOne({
    faculty_id: facultyId,
    course_id: courseId,
    batch_id: batchId,
    subject
  });

  if (!assignment) {
    fail(
      403,
      'Faculty is not assigned to this course, batch and subject'
    );
  }
};

const writeAudit = async (
  user,
  action,
  entity,
  entityId,
  oldValues,
  newValues,
  ip
) => {
  return AuditLog.create({
    user_id: user.id,
    action,
    entity,
    entity_id: entityId,
    old_values: oldValues,
    new_values: newValues,
    ip_address: ip
  });
};

const validateReferences = async (data, facultyId) => {
  const [course, batch, faculty] = await Promise.all([
    Course.findById(data.course_id),
    Batch.findById(data.batch_id),
    User.findById(facultyId)
  ]);

  if (!course || course.status !== 'active') {
    fail(400, 'Invalid or inactive course');
  }

  if (
    !batch ||
    batch.status !== 'active' ||
    String(batch.course_id) !== String(data.course_id)
  ) {
    fail(400, 'Invalid batch or batch does not belong to course');
  }

  if (
    !faculty ||
    faculty.role !== 'faculty' ||
    !faculty.is_active
  ) {
    fail(400, 'Invalid or inactive faculty');
  }

  await checkFacultyAssignment(
    facultyId,
    data.course_id,
    data.batch_id,
    data.subject
  );

  if (Number(data.passing_marks) > Number(data.max_marks)) {
    fail(400, 'Passing marks cannot exceed maximum marks');
  }
};

const validateStudents = async (test, studentIds) => {
  const uniqueIds = [...new Set(studentIds.map(String))];

  if (uniqueIds.length !== studentIds.length) {
    fail(400, 'Duplicate students found');
  }

  for (const id of uniqueIds) {
    if (!validId(id)) {
      fail(400, `Invalid student ID: ${id}`);
    }
  }

  const students = await Student.find({
    _id: { $in: uniqueIds },
    course_id: test.course_id,
    batch_id: test.batch_id,
    status: 'active'
  }).select('_id student_id full_name');

  if (students.length !== uniqueIds.length) {
    fail(
      400,
      'One or more students are inactive or do not belong to this test batch'
    );
  }

  return students;
};

const validateMarks = (marks, maxMarks) => {
  const value = Number(marks);

  if (
    !Number.isFinite(value) ||
    value < 0 ||
    value > Number(maxMarks)
  ) {
    fail(400, `Marks must be between 0 and ${maxMarks}`);
  }
};

const getMarkRecord = async (testId, studentId) => {
  if (!validId(studentId)) {
    fail(400, 'Invalid student ID');
  }

  const mark = await ClassTestMark.findOne({
    class_test_id: testId,
    student_id: studentId
  });

  if (!mark) {
    fail(404, 'Student marks not found');
  }

  return mark;
};

// =====================================================
// 1. CREATE CLASS TEST
// =====================================================

exports.createClassTest = async (data, user, ip) => {
  let facultyId;

  if (user.role === 'faculty') {
    facultyId = user.id;
  } else if (user.role === 'super_admin') {
    if (!data.faculty_id) {
      fail(400, 'faculty_id is required for Super Admin');
    }

    facultyId = data.faculty_id;
  } else {
    fail(403, 'You are not authorized to create class tests');
  }

  await validateReferences(data, facultyId);

  const { faculty_id, ...testData } = data;

  const test = await ClassTest.create({
    ...testData,
    faculty_id: facultyId,
    created_by: user.id
  });

  await writeAudit(
    user,
    'CREATE',
    'ClassTest',
    test._id,
    null,
    test.toObject(),
    ip
  );

  return test;
};

// =====================================================
// 2. LIST CLASS TESTS
// =====================================================

exports.listClassTests = async (query, user) => {
  const {
    page = 1,
    limit = 10,
    course_id,
    batch_id,
    faculty_id,
    subject,
    status,
    from_date,
    to_date,
    search
  } = query;

  const filter = {
    deleted_at: null
  };

  if (user.role === 'faculty') {
    filter.faculty_id = user.id;
  } else if (
    user.role === 'super_admin' ||
    user.role === 'office_staff'
  ) {
    if (faculty_id) {
      filter.faculty_id = faculty_id;
    }
  } else {
    fail(403, 'You are not authorized to view class tests');
  }

  if (course_id) filter.course_id = course_id;
  if (batch_id) filter.batch_id = batch_id;
  if (status) filter.status = status;

  if (subject) {
    filter.subject = {
      $regex: subject,
      $options: 'i'
    };
  }

  if (from_date || to_date) {
    filter.test_date = {};

    if (from_date) {
      filter.test_date.$gte = new Date(from_date);
    }

    if (to_date) {
      const endDate = new Date(to_date);
      endDate.setHours(23, 59, 59, 999);
      filter.test_date.$lte = endDate;
    }
  }

  if (search) {
    filter.$or = [
      { title: { $regex: search, $options: 'i' } },
      { subject: { $regex: search, $options: 'i' } }
    ];
  }

  const skip = (Number(page) - 1) * Number(limit);

  return ClassTest.find(filter)
    .sort({ test_date: -1, createdAt: -1 })
    .skip(skip)
    .limit(Number(limit))
    .lean();
};

// =====================================================
// 3. GET CLASS TEST BY ID
// =====================================================

exports.getClassTest = async (id, user) => {
  const test = await getTest(id);

  checkReadPermission(test, user);

  return test;
};

// =====================================================
// 4. UPDATE CLASS TEST
// =====================================================

exports.updateClassTest = async (id, data, user, ip) => {
  const test = await getTest(id);

  checkPermission(test, user);

  if (user.role === 'faculty' && data.faculty_id) {
    fail(403, 'Faculty cannot change faculty assignment');
  }

  const oldValues = test.toObject();

  const updatedData = {
    ...test.toObject(),
    ...data
  };

  const facultyId =
    user.role === 'faculty'
      ? user.id
      : (data.faculty_id || test.faculty_id);

  await validateReferences(updatedData, facultyId);

  if (
    data.max_marks !== undefined ||
    data.passing_marks !== undefined
  ) {
    const existingMarks = await ClassTestMark.find({
      class_test_id: test._id
    }).select('marks_obtained');

    const newMaxMarks = Number(
      data.max_marks ?? test.max_marks
    );

    if (
      existingMarks.some(
        mark => mark.marks_obtained > newMaxMarks
      )
    ) {
      fail(
        400,
        'New maximum marks cannot be lower than already entered marks'
      );
    }
  }

  Object.assign(test, data);

  if (user.role === 'super_admin') {
    test.faculty_id = facultyId;
  }

  test.updated_by = user.id;

  await test.save();

  await writeAudit(
    user,
    'UPDATE',
    'ClassTest',
    test._id,
    oldValues,
    test.toObject(),
    ip
  );

  return test;
};

// =====================================================
// 5. DELETE / ARCHIVE CLASS TEST
// =====================================================

exports.deleteClassTest = async (id, user, ip) => {
  const test = await getTest(id);

  checkPermission(test, user);

  const oldValues = test.toObject();

  test.deleted_at = new Date();
  test.status = 'archived';
  test.updated_by = user.id;

  await test.save();

  await writeAudit(
    user,
    'DELETE',
    'ClassTest',
    test._id,
    oldValues,
    test.toObject(),
    ip
  );

  return {
    id: test._id,
    message: 'Class test archived successfully'
  };
};

// =====================================================
// 6. BULK MARKS ENTRY
// =====================================================

exports.enterBulkMarks = async (id, entries, user, ip) => {
  const test = await getTest(id);

  checkPermission(test, user);

  if (!Array.isArray(entries) || !entries.length) {
    fail(400, 'Marks entries are required');
  }

  if (entries.length > 500) {
    fail(400, 'Maximum 500 marks entries are allowed');
  }

  const studentIds = entries.map(entry => entry.student_id);

  await validateStudents(test, studentIds);

  const results = {
    inserted: 0,
    updated: 0
  };

  for (const entry of entries) {
    validateMarks(entry.marks_obtained, test.max_marks);

    const existing = await ClassTestMark.findOne({
      class_test_id: test._id,
      student_id: entry.student_id
    });

    if (existing) {
      const oldValues = existing.toObject();

      existing.history.push({
        old_marks: existing.marks_obtained,
        new_marks: Number(entry.marks_obtained),
        old_remarks: existing.remarks,
        new_remarks: entry.remarks || '',
        changed_by: user.id,
        changed_at: new Date(),
        change_source: 'bulk_entry'
      });

      existing.marks_obtained = Number(entry.marks_obtained);
      existing.remarks = entry.remarks || '';
      existing.last_updated_by = user.id;

      await existing.save();

      await writeAudit(
        user,
        'UPDATE',
        'ClassTestMark',
        existing._id,
        oldValues,
        existing.toObject(),
        ip
      );

      results.updated++;
    } else {
      const mark = await ClassTestMark.create({
        class_test_id: test._id,
        student_id: entry.student_id,
        marks_obtained: Number(entry.marks_obtained),
        remarks: entry.remarks || '',
        entered_by: user.id,
        last_updated_by: user.id
      });

      await writeAudit(
        user,
        'CREATE',
        'ClassTestMark',
        mark._id,
        null,
        mark.toObject(),
        ip
      );

      results.inserted++;
    }
  }

  return {
    total: entries.length,
    ...results
  };
};

// =====================================================
// 7. UPDATE INDIVIDUAL STUDENT MARK
// =====================================================

exports.updateStudentMark = async (
  id,
  studentId,
  data,
  user,
  ip
) => {
  const test = await getTest(id);

  checkPermission(test, user);

  validateMarks(data.marks_obtained, test.max_marks);

  const students = await validateStudents(test, [studentId]);

  const mark = await getMarkRecord(test._id, students[0]._id);

  const oldValues = mark.toObject();

  const oldMarks = mark.marks_obtained;
  const oldRemarks = mark.remarks;

  mark.history.push({
    old_marks: oldMarks,
    new_marks: Number(data.marks_obtained),
    old_remarks: oldRemarks,
    new_remarks: data.remarks ?? oldRemarks,
    changed_by: user.id,
    changed_at: new Date(),
    change_source: 'manual'
  });

  mark.marks_obtained = Number(data.marks_obtained);

  if (data.remarks !== undefined) {
    mark.remarks = data.remarks;
  }

  mark.last_updated_by = user.id;

  await mark.save();

  await writeAudit(
    user,
    'UPDATE',
    'ClassTestMark',
    mark._id,
    oldValues,
    mark.toObject(),
    ip
  );

  return mark;
};

// =====================================================
// 8. DELETE INDIVIDUAL STUDENT MARK
// =====================================================

exports.deleteStudentMark = async (
  id,
  studentId,
  user,
  ip
) => {
  const test = await getTest(id);

  checkPermission(test, user);

  const mark = await getMarkRecord(test._id, studentId);

  const oldValues = mark.toObject();

  await ClassTestMark.deleteOne({
    _id: mark._id
  });

  await writeAudit(
    user,
    'DELETE',
    'ClassTestMark',
    mark._id,
    oldValues,
    null,
    ip
  );

  return {
    message: 'Student marks deleted successfully'
  };
};

// =====================================================
// 9. GET STUDENT MARK HISTORY
// =====================================================

exports.getMarkHistory = async (
  id,
  studentId,
  user
) => {
  const test = await getTest(id);

  checkReadPermission(test, user);

  const mark = await getMarkRecord(test._id, studentId);

  return {
    student_id: mark.student_id,
    marks_obtained: mark.marks_obtained,
    remarks: mark.remarks,
    history: mark.history
  };
};

// =====================================================
// 10. IMPORT MARKS - NAME ONLY MAPPING
// =====================================================

exports.importMarks = async (
  id,
  fileBuffer,
  options = {},
  user,
  ip
) => {
  const test = await getTest(id);

  checkPermission(test, user);

  if (!fileBuffer) {
    fail(400, 'Please upload an Excel or CSV file');
  }

  const rows = await importExportService.parseFile(fileBuffer);

  if (!Array.isArray(rows) || !rows.length) {
    fail(400, 'No data found in uploaded file');
  }

  const updateExisting =
    options.update_existing === true ||
    options.update_existing === 'true';

  const skipInvalidRows =
    options.skip_invalid_rows === true ||
    options.skip_invalid_rows === 'true';

  const normalizeName = name =>
    String(name || '')
      .trim()
      .replace(/\s+/g, ' ')
      .toLowerCase();

  // Fetch active students belonging to this test's course and batch.
  const students = await Student.find({
    course_id: test.course_id,
    batch_id: test.batch_id,
    status: 'active'
  }).select('_id full_name');

  // Create a name-to-students map.
  const studentMap = new Map();

  for (const student of students) {
    const normalizedName = normalizeName(student.full_name);

    if (!studentMap.has(normalizedName)) {
      studentMap.set(normalizedName, []);
    }

    studentMap.get(normalizedName).push(student);
  }

  const entries = [];
  const errors = [];
  const seenStudents = new Set();

  // Validate all Excel rows before saving.
  for (let index = 0; index < rows.length; index++) {
    const row = rows[index];
    const rowNumber = index + 2;

    try {
      const studentName = String(
        row.student_name || ''
      ).trim();

      if (!studentName) {
        throw new Error('student_name is required');
      }

      const matches = studentMap.get(
        normalizeName(studentName)
      ) || [];

      if (matches.length === 0) {
        throw new Error(
          'Student not found, inactive or not part of this test batch'
        );
      }

      if (matches.length > 1) {
        throw new Error(
          'Duplicate student names found in this batch. Name mapping is ambiguous'
        );
      }

      const student = matches[0];

      if (seenStudents.has(String(student._id))) {
        throw new Error(
          'Duplicate student entry in uploaded file'
        );
      }

      seenStudents.add(String(student._id));

      const marksValue = row.marks_obtained;

      if (
        marksValue === '' ||
        marksValue === null ||
        marksValue === undefined
      ) {
        throw new Error('marks_obtained is required');
      }

      const marks = Number(marksValue);

      if (
        !Number.isFinite(marks) ||
        marks < 0 ||
        marks > test.max_marks
      ) {
        throw new Error(
          `Marks must be between 0 and ${test.max_marks}`
        );
      }

      entries.push({
        student_id: student._id,
        student_name: student.full_name,
        marks_obtained: marks,
        remarks: String(row.remarks || '')
      });

    } catch (error) {
      errors.push({
        row: rowNumber,
        student_name: row.student_name || null,
        message: error.message
      });
    }
  }

  // Check existing marks.
  const existingMarks = await ClassTestMark.find({
    class_test_id: test._id,
    student_id: {
      $in: entries.map(entry => entry.student_id)
    }
  }).select('student_id');

  const existingIds = new Set(
    existingMarks.map(mark => String(mark.student_id))
  );

  if (!updateExisting) {
    for (let index = entries.length - 1; index >= 0; index--) {
      if (existingIds.has(String(entries[index].student_id))) {
        errors.push({
          row: null,
          student_name: entries[index].student_name,
          message: 'Marks already exist for this student'
        });

        entries.splice(index, 1);
      }
    }
  }

  // If skipping invalid rows is disabled, do not save partial data.
  if (errors.length && !skipInvalidRows) {
    return {
      imported: 0,
      inserted: 0,
      updated: 0,
      skipped: errors.length,
      errors,
      message: 'Import stopped due to invalid rows'
    };
  }

  const results = {
    imported: 0,
    inserted: 0,
    updated: 0,
    skipped: errors.length,
    errors
  };

  // Save valid entries.
  for (const entry of entries) {
    const existing = await ClassTestMark.findOne({
      class_test_id: test._id,
      student_id: entry.student_id
    });

    if (existing) {
      const oldValues = existing.toObject();

      existing.history.push({
        old_marks: existing.marks_obtained,
        new_marks: entry.marks_obtained,
        old_remarks: existing.remarks || '',
        new_remarks: entry.remarks,
        changed_by: user.id,
        changed_at: new Date(),
        change_source: 'bulk_import'
      });

      existing.marks_obtained = entry.marks_obtained;
      existing.remarks = entry.remarks;
      existing.last_updated_by = user.id;

      await existing.save();

      await writeAudit(
        user,
        'UPDATE',
        'ClassTestMark',
        existing._id,
        oldValues,
        existing.toObject(),
        ip
      );

      results.updated++;
    } else {
      const mark = await ClassTestMark.create({
        class_test_id: test._id,
        student_id: entry.student_id,
        marks_obtained: entry.marks_obtained,
        remarks: entry.remarks,
        entered_by: user.id,
        last_updated_by: user.id
      });

      await writeAudit(
        user,
        'CREATE',
        'ClassTestMark',
        mark._id,
        null,
        mark.toObject(),
        ip
      );

      results.inserted++;
    }

    results.imported++;
  }

  return results;
};

// =====================================================
// 11. EXPORT MARKS USING COMMON IMPORT/EXPORT SERVICE
// =====================================================

exports.exportMarks = async (
  id,
  format = 'xlsx',
  user,
  options = {}
) => {
  const test = await getTest(id);

  checkReadPermission(test, user);

  const marks = await ClassTestMark.find({
    class_test_id: test._id
  })
    .populate('student_id', 'student_id full_name')
    .sort({ createdAt: 1 })
    .lean();

  const includeRemarks = options.include_remarks !== false;

  const rows = marks.map(mark => {
    const row = {
      student_id: mark.student_id?.student_id || '',
      full_name: mark.student_id?.full_name || '',
      marks_obtained: mark.marks_obtained
    };

    if (includeRemarks) {
      row.remarks = mark.remarks || '';
    }

    return row;
  });

  const columns = includeRemarks
    ? [
        'student_id',
        'full_name',
        'marks_obtained',
        'remarks'
      ]
    : [
        'student_id',
        'full_name',
        'marks_obtained'
      ];

  return importExportService.generateFile(
    rows,
    columns,
    format
  );
};

// =====================================================
// 12. DOWNLOAD IMPORT TEMPLATE - NAME ONLY
// =====================================================

exports.downloadImportTemplate = async (id, user) => {
  const test = await getTest(id);

  checkReadPermission(test, user);

  // Get active students of this test's batch.
  const students = await Student.find({
    course_id: test.course_id,
    batch_id: test.batch_id,
    status: 'active'
  })
    .select('full_name')
    .sort({ full_name: 1 })
    .lean();

  // Excel contains only student name, marks and remarks.
  const columns = [
    'student_name',
    'marks_obtained',
    'remarks'
  ];

  const rows = students.map(student => ({
    student_name: student.full_name,
    marks_obtained: '',
    remarks: ''
  }));

  return importExportService.generateFile(
    rows,
    columns,
    'xlsx'
  );
};

// =====================================================
// 13. CLASS PERFORMANCE INSIGHTS
// =====================================================

exports.getClassInsights = async (id, user) => {
  const test = await getTest(id);

  checkReadPermission(test, user);

  const marks = await ClassTestMark.find({
    class_test_id: test._id
  })
    .populate('student_id', 'student_id full_name')
    .sort({ marks_obtained: -1 })
    .lean();

  const totalStudents = marks.length;

  if (!totalStudents) {
    return {
      test_id: test._id,
      total_students: 0,
      average_marks: 0,
      highest_marks: 0,
      lowest_marks: 0,
      passed: 0,
      failed: 0,
      pass_percentage: 0,
      top_three: [],
      below_passing: []
    };
  }

  const values = marks.map(mark =>
    Number(mark.marks_obtained)
  );

  const totalMarks = values.reduce(
    (sum, value) => sum + value,
    0
  );

  const passedMarks = marks.filter(
    mark => mark.marks_obtained >= test.passing_marks
  );

  const failedMarks = marks.filter(
    mark => mark.marks_obtained < test.passing_marks
  );

  return {
    test_id: test._id,
    total_students: totalStudents,

    average_marks: Number(
      (totalMarks / totalStudents).toFixed(2)
    ),

    highest_marks: Math.max(...values),
    lowest_marks: Math.min(...values),

    passed: passedMarks.length,
    failed: failedMarks.length,

    pass_percentage: Number(
      ((passedMarks.length / totalStudents) * 100).toFixed(2)
    ),

    top_three: marks.slice(0, 3).map(mark => ({
      student_id: mark.student_id?.student_id,
      student_name: mark.student_id?.full_name,
      marks_obtained: mark.marks_obtained
    })),

    below_passing: failedMarks.map(mark => ({
      student_id: mark.student_id?.student_id,
      student_name: mark.student_id?.full_name,
      marks_obtained: mark.marks_obtained
    }))
  };
};
