const ExcelJS = require('exceljs');
const mongoose = require('mongoose');
const Exam = require('../../exams/models/Exam');
const Student = require('../../students/models/Student');
const Enquiry = require('../../enquiries/models/Enquiry');
const StudentFee = require('../../fees/models/StudentFee');
const Payment = require('../../fees/models/Payment');
const Book = require('../../library/models/Book');
const BookIssue = require('../../library/models/BookIssue');
const ExamForm = require('../../exams/models/ExamForm');
const ClassSchedule = require('../../classschedules/models/ClassSchedule');
const ClassTest = require('../../classtests/models/ClassTest');
const ClassTestMark = require('../../classtests/models/ClassTestMark');
const TcLc = require('../../tclc/models/TcLc');
const ExamMark = require('../../exams/models/ExamMark');
// ================= COMMON REPORT FILTER HELPERS =================

// Validate MongoDB ObjectId filters.
const validateObjectId = (value, fieldName) => {
  if (!value) return;

  if (!mongoose.Types.ObjectId.isValid(value)) {
    const error = new Error(`Invalid ${fieldName}`);
    error.statusCode = 400;
    throw error;
  }
};

// Build date range filter.
// Query parameters: fromDate, toDate
const buildDateFilter = (query = {}, fieldName) => {
  const dateFilter = {};

  if (query.fromDate) {
    const fromDate = new Date(query.fromDate);

    if (Number.isNaN(fromDate.getTime())) {
      const error = new Error('Invalid fromDate');
      error.statusCode = 400;
      throw error;
    }

    dateFilter.$gte = fromDate;
  }

  if (query.toDate) {
    const toDate = new Date(query.toDate);

    if (Number.isNaN(toDate.getTime())) {
      const error = new Error('Invalid toDate');
      error.statusCode = 400;
      throw error;
    }

    toDate.setHours(23, 59, 59, 999);
    dateFilter.$lte = toDate;
  }

  if (
    dateFilter.$gte &&
    dateFilter.$lte &&
    dateFilter.$gte > dateFilter.$lte
  ) {
    const error = new Error('fromDate cannot be after toDate');
    error.statusCode = 400;
    throw error;
  }

  return Object.keys(dateFilter).length
    ? { [fieldName]: dateFilter }
    : {};
};

// Build common course and batch filters.
const buildAcademicFilters = (query = {}) => {
  validateObjectId(query.courseId, 'courseId');
  validateObjectId(query.batchId, 'batchId');

  const filter = {};

  if (query.courseId) {
    filter.course_id = query.courseId;
  }

  if (query.batchId) {
    filter.batch_id = query.batchId;
  }

  return filter;
};

// Build status filter.
const buildStatusFilter = (query = {}, allowedStatuses = []) => {
  if (!query.status) return {};

  if (
    allowedStatuses.length &&
    !allowedStatuses.includes(query.status)
  ) {
    const error = new Error(
      `Invalid status. Allowed values: ${allowedStatuses.join(', ')}`
    );
    error.statusCode = 400;
    throw error;
  }

  return { status: query.status };
};

// Validate and return payment mode.
const getPaymentMode = (mode) => {
  if (!mode) return null;

  const normalizedMode = String(mode).toLowerCase();
  const allowedModes = ['cash', 'upi', 'bank', 'cheque'];

  if (!allowedModes.includes(normalizedMode)) {
    const error = new Error(
      `Invalid mode. Allowed values: ${allowedModes.join(', ')}`
    );
    error.statusCode = 400;
    throw error;
  }

  return normalizedMode;
};

// Find student IDs matching course/batch filters.
const getFilteredStudentIds = async (query = {}) => {
  const studentFilter = buildAcademicFilters(query);

  return Student.find(studentFilter).distinct('_id');
};

// ================= EXCEL WORKBOOK GENERATOR =================

const generateWorkbook = async (
  data,
  columns,
  sheetName = 'Report'
) => {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet(sheetName);

  worksheet.columns = columns;

  // Header styling
  worksheet.getRow(1).font = {
    bold: true,
    color: { argb: 'FFFFFFFF' },
  };

  worksheet.getRow(1).fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF10B981' },
  };

  // Add report data
  data.forEach((row) => {
    worksheet.addRow(row);
  });

  // Auto-fit columns
  worksheet.columns.forEach((column) => {
    let maxLength = 0;

    column.eachCell({ includeEmpty: true }, (cell) => {
      const columnLength = cell.value
        ? cell.value.toString().length
        : 10;

      if (columnLength > maxLength) {
        maxLength = columnLength;
      }
    });

    column.width = maxLength < 10 ? 10 : maxLength + 2;
  });

  return workbook;
};

// ============================================================
// 1. FEE COLLECTION REPORT
// ============================================================

exports.getFeeCollectionReport = async (query = {}) => {
  const filter = { status: 'active' };

  Object.assign(
    filter,
    buildDateFilter(query, 'payment_date')
  );

  const mode = getPaymentMode(query.mode);

  if (mode) {
    filter.mode = mode;
  }

  // Course and batch filters through Student records.
  if (query.courseId || query.batchId) {
    const studentIds = await getFilteredStudentIds(query);
    filter.student_id = { $in: studentIds };
  }

  const payments = await Payment.find(filter)
    .populate('student_id', 'student_id full_name phone')
    .sort({ payment_date: -1 })
    .lean();

  const data = payments.map((payment) => ({
    Receipt: payment.receipt_no || '',
    Date: payment.payment_date
      ? new Date(payment.payment_date).toLocaleDateString()
      : '',
    StudentID: payment.student_id?.student_id || 'N/A',
    StudentName: payment.student_id?.full_name || 'N/A',
    Amount: payment.amount,
    Mode: payment.mode
      ? payment.mode.toUpperCase()
      : '',
    Reference: payment.reference_no || '-',
  }));

  const columns = [
    { header: 'Receipt No', key: 'Receipt', width: 20 },
    { header: 'Date', key: 'Date', width: 15 },
    { header: 'Student ID', key: 'StudentID', width: 15 },
    { header: 'Student Name', key: 'StudentName', width: 25 },
    { header: 'Amount', key: 'Amount', width: 12 },
    { header: 'Mode', key: 'Mode', width: 10 },
    { header: 'Reference', key: 'Reference', width: 20 },
  ];

  return generateWorkbook(data, columns, 'Fee Collection');
};

// ============================================================
// 2. PENDING FEES REPORT
// ============================================================

exports.getPendingFeesReport = async (query = {}) => {
  const filter = {
    status: query.status || { $in: ['pending', 'partial'] },
  };

  if (query.status) {
    buildStatusFilter(query, ['pending', 'partial']);
  }

  const academicFilters = buildAcademicFilters(query);

  if (academicFilters.course_id) {
    filter.course_id = academicFilters.course_id;
  }

  // Batch filtering through Student records.
  if (academicFilters.batch_id) {
    const studentIds = await Student.find({
      batch_id: academicFilters.batch_id,
    }).distinct('_id');

    filter.student_id = { $in: studentIds };
  }

  const fees = await StudentFee.find(filter)
    .populate('student_id', 'student_id full_name phone')
    .populate('course_id', 'name')
    .lean();

  // Safely convert database values into valid Excel numbers.
  const toSafeNumber = (value) => {
    if (value === null || value === undefined || value === '') {
      return null;
    }

    const number = Number(value);

    return Number.isFinite(number) ? number : null;
  };

  const data = fees
    .filter((fee) => fee.student_id)
    .map((fee) => {
      const dueAmount = toSafeNumber(fee.amount_due);
      const paidAmount = toSafeNumber(fee.amount_paid);

      // If due amount is missing, don't calculate an incorrect balance.
      const balance =
        dueAmount === null
          ? null
          : dueAmount - (paidAmount ?? 0);

      return {
        StudentID: fee.student_id.student_id || '',
        Name: fee.student_id.full_name || '',
        Phone: fee.student_id.phone || '',
        Course: fee.course_id?.name || 'N/A',
        FeeName: fee.fee_name || 'N/A',

        DueAmount: dueAmount,
        PaidAmount: paidAmount,
        Balance: balance,

        Status: fee.status
          ? fee.status.toUpperCase()
          : '',

        RequiredForExam: fee.required_for_exam ? 'YES' : 'NO',
      };
    });

  const columns = [
    { header: 'Student ID', key: 'StudentID', width: 15 },
    { header: 'Name', key: 'Name', width: 25 },
    { header: 'Phone', key: 'Phone', width: 15 },
    { header: 'Course', key: 'Course', width: 20 },
    { header: 'Fee Component', key: 'FeeName', width: 20 },
    { header: 'Total Due', key: 'DueAmount', width: 12 },
    { header: 'Paid', key: 'PaidAmount', width: 12 },
    { header: 'Balance', key: 'Balance', width: 12 },
    { header: 'Status', key: 'Status', width: 10 },
    { header: 'Exam Required', key: 'RequiredForExam', width: 15 },
  ];

  return generateWorkbook(data, columns, 'Pending Fees');
};

// ============================================================
// 3. ADMISSIONS REPORT
// ============================================================

exports.getAdmissionsReport = async (query = {}) => {
  const filter = {
    ...buildAcademicFilters(query),
    ...buildDateFilter(query, 'admitted_on'),
  };

  if (query.status) {
    Object.assign(
      filter,
      buildStatusFilter(query, [
        'active',
        'completed',
        'left',
        'tc_issued',
        'deactive',
      ])
    );
  }

  const students = await Student.find(filter)
    .populate('course_id', 'name')
    .populate('batch_id', 'name')
    .sort({ admitted_on: -1 })
    .lean();

  const data = students.map((student) => ({
    ID: student.student_id,
    Name: student.full_name,
    Phone: student.phone,
    Course: student.course_id?.name || 'N/A',
    Batch: student.batch_id?.name || 'N/A',
    AdmittedOn: student.admitted_on
      ? new Date(student.admitted_on).toLocaleDateString()
      : '',
    Status: student.status
      ? student.status.toUpperCase()
      : '',
    Stage: student.lifecycle_stage || '',
  }));

  const columns = [
    { header: 'Student ID', key: 'ID', width: 15 },
    { header: 'Full Name', key: 'Name', width: 25 },
    { header: 'Phone', key: 'Phone', width: 15 },
    { header: 'Course', key: 'Course', width: 20 },
    { header: 'Batch', key: 'Batch', width: 20 },
    { header: 'Admitted On', key: 'AdmittedOn', width: 15 },
    { header: 'Status', key: 'Status', width: 12 },
    { header: 'Stage', key: 'Stage', width: 15 },
  ];

  return generateWorkbook(data, columns, 'Admissions');
};

// ============================================================
// 4. ENQUIRIES REPORT
// ============================================================

exports.getEnquiriesReport = async (query = {}) => {
  const filter = {
    ...buildDateFilter(query, 'createdAt'),
  };

  validateObjectId(query.courseId, 'courseId');

  if (query.courseId) {
    filter.course_interest_id = query.courseId;
  }

  if (query.status) {
    filter.status = query.status;
  }

  const enquiries = await Enquiry.find(filter)
    .populate('course_interest_id', 'name')
    .sort({ createdAt: -1 })
    .lean();

  const data = enquiries.map((enquiry) => ({
    Name: enquiry.name,
    Phone: enquiry.phone,
    Course: enquiry.course_interest_id?.name || 'N/A',
    Source: enquiry.source || 'N/A',
    Status: enquiry.status
      ? enquiry.status.toUpperCase()
      : '',
    Date: enquiry.createdAt
      ? new Date(enquiry.createdAt).toLocaleDateString()
      : '',
  }));

  const columns = [
    { header: 'Name', key: 'Name', width: 25 },
    { header: 'Phone', key: 'Phone', width: 15 },
    { header: 'Course Interest', key: 'Course', width: 20 },
    { header: 'Source', key: 'Source', width: 15 },
    { header: 'Status', key: 'Status', width: 12 },
    { header: 'Date', key: 'Date', width: 15 },
  ];

  return generateWorkbook(data, columns, 'Enquiries');
};

// ============================================================
// 5. STUDENTS REPORT
// ============================================================

exports.getStudentsReport = async (query = {}) => {
  const filter = {
    ...buildAcademicFilters(query),
  };

  if (query.status) {
    Object.assign(
      filter,
      buildStatusFilter(query, [
        'active',
        'completed',
        'left',
        'tc_issued',
        'deactive',
      ])
    );
  }

  if (query.lifecycle_stage) {
    const allowedStages = [
      'enquiry',
      'admission',
      'documents',
      'fees',
      'material',
      'schedule',
      'class_test',
      'exam',
      'exam_form',
      'test',
      'result',
      'tc_lc',
    ];

    if (!allowedStages.includes(query.lifecycle_stage)) {
      const error = new Error(
        `Invalid lifecycle_stage. Allowed values: ${allowedStages.join(', ')}`
      );
      error.statusCode = 400;
      throw error;
    }

    filter.lifecycle_stage = query.lifecycle_stage;
  }

  const students = await Student.find(filter)
    .populate('course_id', 'name')
    .populate('batch_id', 'name')
    .sort({ createdAt: -1 })
    .lean();

  const data = students.map((student) => ({
    StudentID: student.student_id || '',
    FullName: student.full_name || '',
    DOB: student.dob
      ? new Date(student.dob).toLocaleDateString()
      : '',
    Gender: student.gender || '',
    Phone: student.phone || '',
    Email: student.email || '',
    Address: student.address || '',
    GuardianName: student.guardian_name || '',
    GuardianPhone: student.guardian_phone || '',
    Qualification: student.qualification || '',
    Course: student.course_id?.name || 'N/A',
    Batch: student.batch_id?.name || 'N/A',
    AdmittedOn: student.admitted_on
      ? new Date(student.admitted_on).toLocaleDateString()
      : '',
    Status: student.status
      ? student.status.toUpperCase()
      : '',
    LifecycleStage: student.lifecycle_stage || '',
    StageStatus: student.stage_status || '',
  }));

  const columns = [
    { header: 'Student ID', key: 'StudentID', width: 15 },
    { header: 'Full Name', key: 'FullName', width: 25 },
    { header: 'Date of Birth', key: 'DOB', width: 15 },
    { header: 'Gender', key: 'Gender', width: 12 },
    { header: 'Phone', key: 'Phone', width: 15 },
    { header: 'Email', key: 'Email', width: 25 },
    { header: 'Address', key: 'Address', width: 30 },
    { header: 'Guardian Name', key: 'GuardianName', width: 20 },
    { header: 'Guardian Phone', key: 'GuardianPhone', width: 15 },
    { header: 'Qualification', key: 'Qualification', width: 20 },
    { header: 'Course', key: 'Course', width: 20 },
    { header: 'Batch', key: 'Batch', width: 20 },
    { header: 'Admitted On', key: 'AdmittedOn', width: 15 },
    { header: 'Status', key: 'Status', width: 12 },
    { header: 'Lifecycle Stage', key: 'LifecycleStage', width: 18 },
    { header: 'Stage Status', key: 'StageStatus', width: 15 },
  ];

  return generateWorkbook(data, columns, 'Students');
};

// ============================================================
// 6. RECEIPTS REPORT
// ============================================================

exports.getReceiptsReport = async (query = {}) => {
  const filter = {
    status: 'active',
    ...buildDateFilter(query, 'payment_date'),
  };

  const mode = getPaymentMode(query.mode);

  if (mode) {
    filter.mode = mode;
  }

  // Course and batch filtering through Student records.
  if (query.courseId || query.batchId) {
    const studentIds = await getFilteredStudentIds(query);
    filter.student_id = { $in: studentIds };
  }

  const payments = await Payment.find(filter)
    .populate('student_id', 'student_id full_name phone')
    .sort({ payment_date: -1 })
    .lean();

  const data = payments.map((payment) => ({
    ReceiptNo: payment.receipt_no || '',
    PaymentDate: payment.payment_date
      ? new Date(payment.payment_date).toLocaleDateString()
      : '',
    StudentID: payment.student_id?.student_id || 'N/A',
    StudentName: payment.student_id?.full_name || 'N/A',
    Phone: payment.student_id?.phone || '',
    Amount: payment.amount,
    PaymentMode: payment.mode
      ? payment.mode.toUpperCase()
      : '',
    ReferenceNo: payment.reference_no || '',
  }));

  const columns = [
    { header: 'Receipt Number', key: 'ReceiptNo', width: 20 },
    { header: 'Payment Date', key: 'PaymentDate', width: 18 },
    { header: 'Student ID', key: 'StudentID', width: 15 },
    { header: 'Student Name', key: 'StudentName', width: 25 },
    { header: 'Phone', key: 'Phone', width: 15 },
    { header: 'Amount', key: 'Amount', width: 15 },
    { header: 'Payment Mode', key: 'PaymentMode', width: 15 },
    { header: 'Reference Number', key: 'ReferenceNo', width: 22 },
  ];

  return generateWorkbook(data, columns, 'Receipts Register');
};
// ============================================================
// 7. EXAM FORMS REPORT (B-28)
// ============================================================

exports.getExamFormsReport = async (query = {}) => {
  const allowedStatuses = ['submitted', 'blocked'];

  const filter = {
    status: { $in: allowedStatuses },
  };

  // Optional status filter
  if (query.status) {
    Object.assign(
      filter,
      buildStatusFilter(query, allowedStatuses)
    );
  }

  // Course and batch filters through Exam records
  const examFilter = {};

  validateObjectId(query.courseId, 'courseId');
  validateObjectId(query.batchId, 'batchId');

  if (query.courseId) {
    examFilter.course_id = query.courseId;
  }

  if (query.batchId) {
    examFilter.batch_id = query.batchId;
  }

  if (query.courseId || query.batchId) {
const examIds = await Exam.find(examFilter).distinct('_id');

    filter.exam_id = { $in: examIds };
  }

  const examForms = await ExamForm.find(filter)
    .populate('student_id', 'student_id full_name phone')
    .populate({
      path: 'exam_id',
      select: 'title subject exam_type exam_date course_id batch_id',
      populate: [
        { path: 'course_id', select: 'name' },
        { path: 'batch_id', select: 'name' },
      ],
    })
    .sort({ createdAt: -1 })
    .lean();

  const data = examForms.map((form) => ({
    StudentID: form.student_id?.student_id || 'N/A',
    StudentName: form.student_id?.full_name || 'N/A',
    Phone: form.student_id?.phone || '',

    Exam: form.exam_id?.title || 'N/A',
    Subject: form.exam_id?.subject || '',
    ExamType: form.exam_id?.exam_type || '',

    Course: form.exam_id?.course_id?.name || 'N/A',
    Batch: form.exam_id?.batch_id?.name || 'N/A',

    ExamDate: form.exam_id?.exam_date
      ? new Date(form.exam_id.exam_date).toLocaleDateString()
      : '',

    FormStatus: form.status
      ? form.status.toUpperCase()
      : '',

    SubmittedAt: form.submitted_at
      ? new Date(form.submitted_at).toLocaleDateString()
      : '',

    BlockReason: form.block_reason || '',

    PendingFees: Array.isArray(form.pending_fee_components)
      ? JSON.stringify(form.pending_fee_components)
      : '',
  }));

  const columns = [
    { header: 'Student ID', key: 'StudentID', width: 16 },
    { header: 'Student Name', key: 'StudentName', width: 25 },
    { header: 'Phone', key: 'Phone', width: 15 },
    { header: 'Exam', key: 'Exam', width: 25 },
    { header: 'Subject', key: 'Subject', width: 20 },
    { header: 'Exam Type', key: 'ExamType', width: 15 },
    { header: 'Course', key: 'Course', width: 20 },
    { header: 'Batch', key: 'Batch', width: 20 },
    { header: 'Exam Date', key: 'ExamDate', width: 15 },
    { header: 'Form Status', key: 'FormStatus', width: 15 },
    { header: 'Submitted At', key: 'SubmittedAt', width: 18 },
    { header: 'Block Reason', key: 'BlockReason', width: 30 },
    { header: 'Pending Fees', key: 'PendingFees', width: 35 },
  ];

  return generateWorkbook(data, columns, 'Exam Forms');
};
// ============================================================
// 7. LIBRARY REPORTS (SAKSHI - B41)
// ============================================================

exports.getOverdueBooksReport = async () => {
  const today = new Date();

  const issues = await BookIssue.find({
    status: 'issued',
    dueDate: { $lt: today },
  })
    .populate('book', 'title author bookCode')
    .populate('student', 'student_id full_name')
    .lean();

  const data = issues.map((issue) => ({
    BookCode: issue.book?.bookCode || 'N/A',
    BookTitle: issue.book?.title || 'N/A',
    StudentID: issue.student?.student_id || 'N/A',
    StudentName: issue.student?.full_name || 'N/A',
    IssueDate: issue.issueDate
      ? new Date(issue.issueDate).toLocaleDateString()
      : '',
    DueDate: issue.dueDate
      ? new Date(issue.dueDate).toLocaleDateString()
      : '',
    DaysOverdue: Math.floor(
      (today - new Date(issue.dueDate)) /
      (1000 * 60 * 60 * 24)
    ),
  }));

  const columns = [
    { header: 'Book Code', key: 'BookCode', width: 15 },
    { header: 'Book Title', key: 'BookTitle', width: 30 },
    { header: 'Student ID', key: 'StudentID', width: 15 },
    { header: 'Student Name', key: 'StudentName', width: 25 },
    { header: 'Issue Date', key: 'IssueDate', width: 15 },
    { header: 'Due Date', key: 'DueDate', width: 15 },
    { header: 'Days Overdue', key: 'DaysOverdue', width: 12 },
  ];

  return generateWorkbook(data, columns, 'Overdue Books');
};

exports.getLibraryInventoryReport = async () => {
  const books = await Book.find()
    .populate('category', 'name')
    .lean();

  const data = books.map((book) => ({
    Code: book.bookCode,
    Title: book.title,
    Author: book.author,
    Category: book.category?.name || 'N/A',
    TotalQty: book.totalQty,
    AvailableQty: book.availableQty,
    IssuedQty: book.totalQty - book.availableQty,
    Status: book.status
      ? book.status.toUpperCase()
      : '',
  }));

  const columns = [
    { header: 'Book Code', key: 'Code', width: 15 },
    { header: 'Title', key: 'Title', width: 30 },
    { header: 'Author', key: 'Author', width: 20 },
    { header: 'Category', key: 'Category', width: 20 },
    { header: 'Total Qty', key: 'TotalQty', width: 10 },
    { header: 'Available', key: 'AvailableQty', width: 10 },
    { header: 'Issued', key: 'IssuedQty', width: 10 },
    { header: 'Status', key: 'Status', width: 12 },
  ];

  return generateWorkbook(data, columns, 'Library Inventory');
};
// ============================================================
// B-41: COURSE-WISE STUDENTS REPORT
// ============================================================

exports.getCourseWiseStudentsReport = async (query = {}) => {
  const filter = {};

  validateObjectId(query.courseId, 'courseId');
  validateObjectId(query.batchId, 'batchId');

  if (query.courseId) filter.course_id = query.courseId;
  if (query.batchId) filter.batch_id = query.batchId;
  if (query.status) {
    Object.assign(
      filter,
      buildStatusFilter(query, [
        'active',
        'completed',
        'left',
        'tc_issued',
        'deactive',
      ])
    );
  }

  const students = await Student.find(filter)
    .populate('course_id', 'name')
    .populate('batch_id', 'name')
    .sort({ course_id: 1, full_name: 1 })
    .lean();

  const data = students.map((student) => ({
    Course: student.course_id?.name || 'N/A',
    Batch: student.batch_id?.name || 'N/A',
    StudentID: student.student_id || '',
    StudentName: student.full_name || '',
    Phone: student.phone || '',
    Email: student.email || '',
    AdmissionDate: student.admitted_on
      ? new Date(student.admitted_on).toLocaleDateString()
      : '',
    Status: student.status
      ? student.status.toUpperCase()
      : '',
  }));

  const columns = [
    { header: 'Course', key: 'Course', width: 25 },
    { header: 'Batch', key: 'Batch', width: 20 },
    { header: 'Student ID', key: 'StudentID', width: 18 },
    { header: 'Student Name', key: 'StudentName', width: 25 },
    { header: 'Phone', key: 'Phone', width: 16 },
    { header: 'Email', key: 'Email', width: 28 },
    { header: 'Admission Date', key: 'AdmissionDate', width: 18 },
    { header: 'Status', key: 'Status', width: 15 },
  ];

  return generateWorkbook(data, columns, 'Course Wise Students');
};
// ============================================================
// B-41: SCHEDULES REPORT
// ============================================================

exports.getSchedulesReport = async (query = {}) => {
  const filter = {};

  // Validate IDs
  validateObjectId(query.courseId, 'courseId');
  validateObjectId(query.batchId, 'batchId');
  validateObjectId(query.facultyId, 'facultyId');

  // Academic filters
  if (query.courseId) filter.course_id = query.courseId;
  if (query.batchId) filter.batch_id = query.batchId;
  if (query.facultyId) filter.faculty_id = query.facultyId;

  // Subject filter
  if (query.subject) {
    filter.subject = {
      $regex: query.subject,
      $options: 'i',
    };
  }

  // Status filter
  if (query.status) {
    Object.assign(
      filter,
      buildStatusFilter(query, ['scheduled', 'cancelled'])
    );
  }

  // Date range
  Object.assign(filter, buildDateFilter(query, 'date'));

  const schedules = await ClassSchedule.find(filter)
    .populate('course_id', 'name')
    .populate('batch_id', 'name')
    .populate('faculty_id', 'name email')
    .sort({ date: 1, start_time: 1 })
    .lean();

  const data = schedules.map((schedule) => ({
    Course: schedule.course_id?.name || 'N/A',
    Batch: schedule.batch_id?.name || 'N/A',
    Faculty: schedule.faculty_id?.name || 'N/A',
    FacultyEmail: schedule.faculty_id?.email || '',
    Subject: schedule.subject || '',
    Date: schedule.date
      ? new Date(schedule.date).toLocaleDateString()
      : '',
    StartTime: schedule.start_time || '',
    EndTime: schedule.end_time || '',
    Status: schedule.status
      ? schedule.status.toUpperCase()
      : '',
  }));

  const columns = [
    { header: 'Course', key: 'Course', width: 25 },
    { header: 'Batch', key: 'Batch', width: 22 },
    { header: 'Faculty', key: 'Faculty', width: 25 },
    { header: 'Faculty Email', key: 'FacultyEmail', width: 30 },
    { header: 'Subject', key: 'Subject', width: 22 },
    { header: 'Date', key: 'Date', width: 16 },
    { header: 'Start Time', key: 'StartTime', width: 15 },
    { header: 'End Time', key: 'EndTime', width: 15 },
    { header: 'Status', key: 'Status', width: 15 },
  ];

  return generateWorkbook(data, columns, 'Schedules');
};
// =====================================================
// B-41: CLASS TESTS REPORT
// =====================================================

exports.getClassTestsReport = async (query = {}) => {
  const filter = {
    deleted_at: null
  };

  // Validate filter IDs
  validateObjectId(query.courseId, 'courseId');
  validateObjectId(query.batchId, 'batchId');
  validateObjectId(query.facultyId, 'facultyId');

  if (query.courseId) filter.course_id = query.courseId;
  if (query.batchId) filter.batch_id = query.batchId;
  if (query.facultyId) filter.faculty_id = query.facultyId;

  if (query.status) {
    Object.assign(
      filter,
      buildStatusFilter(query, [
        'draft',
        'scheduled',
        'completed',
        'cancelled',
        'archived'
      ])
    );
  }

  if (query.subject) {
    filter.subject = {
      $regex: query.subject,
      $options: 'i'
    };
  }

  // Support both fromDate/toDate and from_date/to_date
  const fromDate = query.fromDate || query.from_date;
  const toDate = query.toDate || query.to_date;

  if (fromDate || toDate) {
    filter.test_date = {};

    if (fromDate) {
      const start = new Date(fromDate);

      if (Number.isNaN(start.getTime())) {
        throw new Error('Invalid fromDate');
      }

      start.setHours(0, 0, 0, 0);
      filter.test_date.$gte = start;
    }

    if (toDate) {
      const end = new Date(toDate);

      if (Number.isNaN(end.getTime())) {
        throw new Error('Invalid toDate');
      }

      end.setHours(23, 59, 59, 999);
      filter.test_date.$lte = end;
    }
  }

  const tests = await ClassTest.find(filter)
    .populate('course_id', 'name')
    .populate('batch_id', 'name')
    .populate('faculty_id', 'name email')
    .sort({ test_date: -1 })
    .lean();

  const testIds = tests.map(test => test._id);

  // Fetch marks for all tests in one query
  const marks = testIds.length
    ? await ClassTestMark.find({
        class_test_id: { $in: testIds }
      })
        .select('class_test_id marks_obtained')
        .lean()
    : [];

  // Group marks by class test
  const marksMap = new Map();

  for (const mark of marks) {
    const testId = String(mark.class_test_id);

    if (!marksMap.has(testId)) {
      marksMap.set(testId, []);
    }

    marksMap.get(testId).push(Number(mark.marks_obtained));
  }

  const data = tests.map(test => {
    const testMarks = marksMap.get(String(test._id)) || [];

    const passed = testMarks.filter(
      marks => marks >= Number(test.passing_marks)
    ).length;

    const failed = testMarks.filter(
      marks => marks < Number(test.passing_marks)
    ).length;

    const totalMarks = testMarks.reduce(
      (sum, marks) => sum + marks,
      0
    );

    return {
      TestTitle: test.title || '',
      Course: test.course_id?.name || 'N/A',
      Batch: test.batch_id?.name || 'N/A',
      Faculty: test.faculty_id?.name || 'N/A',
      FacultyEmail: test.faculty_id?.email || '',
      Subject: test.subject || '',
      TestDate: test.test_date
        ? new Date(test.test_date).toLocaleDateString()
        : '',
      MaxMarks: test.max_marks,
      PassingMarks: test.passing_marks,
      Duration: test.duration_minutes ?? '',
      Status: test.status
        ? test.status.toUpperCase()
        : '',
      MarksEntered: testMarks.length,
      AverageMarks: testMarks.length
        ? Number((totalMarks / testMarks.length).toFixed(2))
        : 0,
      HighestMarks: testMarks.length
        ? Math.max(...testMarks)
        : 0,
      LowestMarks: testMarks.length
        ? Math.min(...testMarks)
        : 0,
      Passed: passed,
      Failed: failed
    };
  });

  const columns = [
    { header: 'Test Title', key: 'TestTitle', width: 25 },
    { header: 'Course', key: 'Course', width: 22 },
    { header: 'Batch', key: 'Batch', width: 20 },
    { header: 'Faculty', key: 'Faculty', width: 22 },
    { header: 'Faculty Email', key: 'FacultyEmail', width: 28 },
    { header: 'Subject', key: 'Subject', width: 22 },
    { header: 'Test Date', key: 'TestDate', width: 16 },
    { header: 'Max Marks', key: 'MaxMarks', width: 12 },
    { header: 'Passing Marks', key: 'PassingMarks', width: 15 },
    { header: 'Duration (Minutes)', key: 'Duration', width: 18 },
    { header: 'Status', key: 'Status', width: 15 },
    { header: 'Marks Entered', key: 'MarksEntered', width: 16 },
    { header: 'Average Marks', key: 'AverageMarks', width: 16 },
    { header: 'Highest Marks', key: 'HighestMarks', width: 16 },
    { header: 'Lowest Marks', key: 'LowestMarks', width: 15 },
    { header: 'Passed', key: 'Passed', width: 12 },
    { header: 'Failed', key: 'Failed', width: 12 }
  ];

  return generateWorkbook(data, columns, 'Class Tests');
};
// =====================================================
// B-41: EXAMS / RESULTS REPORT
// =====================================================

exports.getExamsResultsReport = async (query = {}) => {
  const filter = {
    deleted_at: null
  };

  // Validate IDs
  validateObjectId(query.courseId, 'courseId');
  validateObjectId(query.batchId, 'batchId');
  validateObjectId(query.facultyId, 'facultyId');

  if (query.courseId) filter.course_id = query.courseId;
  if (query.batchId) filter.batch_id = query.batchId;
  if (query.facultyId) filter.faculty_id = query.facultyId;

  if (query.status) {
    const allowedStatuses = [
      'draft',
      'scheduled',
      'ongoing',
      'completed',
      'cancelled',
      'archived'
    ];

    if (!allowedStatuses.includes(query.status)) {
      throw new Error('Invalid exam status');
    }

    filter.status = query.status;
  }

  if (query.examType || query.exam_type) {
    filter.exam_type = query.examType || query.exam_type;
  }

  if (query.resultStatus || query.result_status) {
    const resultStatus = query.resultStatus || query.result_status;

    if (!['draft', 'published'].includes(resultStatus)) {
      throw new Error('Invalid result status');
    }

    filter.result_status = resultStatus;
  }

  if (query.subject) {
    filter.subject = {
      $regex: query.subject,
      $options: 'i'
    };
  }

  // Date filters
  const fromDate = query.fromDate || query.from_date;
  const toDate = query.toDate || query.to_date;

  if (fromDate || toDate) {
    filter.exam_date = {};

    if (fromDate) {
      const start = new Date(fromDate);

      if (Number.isNaN(start.getTime())) {
        throw new Error('Invalid fromDate');
      }

      start.setHours(0, 0, 0, 0);
      filter.exam_date.$gte = start;
    }

    if (toDate) {
      const end = new Date(toDate);

      if (Number.isNaN(end.getTime())) {
        throw new Error('Invalid toDate');
      }

      end.setHours(23, 59, 59, 999);
      filter.exam_date.$lte = end;
    }
  }

  // Fetch exams
  const exams = await Exam.find(filter)
    .populate('course_id', 'name')
    .populate('batch_id', 'name')
    .populate('faculty_id', 'name email')
    .sort({ exam_date: -1 })
    .lean();

  const examIds = exams.map(exam => exam._id);

  // Fetch all marks in one query
  const marks = examIds.length
    ? await ExamMark.find({
        exam_id: { $in: examIds }
      })
        .populate('student_id', 'student_id full_name')
        .sort({ marks_obtained: -1 })
        .lean()
    : [];

  // Group marks by exam
  const marksMap = new Map();

  for (const mark of marks) {
    const examId = String(mark.exam_id);

    if (!marksMap.has(examId)) {
      marksMap.set(examId, []);
    }

    marksMap.get(examId).push(mark);
  }

  const data = [];

  for (const exam of exams) {
    const examMarks = marksMap.get(String(exam._id)) || [];

    // Include exam even when marks are not entered
    const rows = examMarks.length ? examMarks : [null];

    for (const mark of rows) {
      const marksObtained = mark
        ? Number(mark.marks_obtained)
        : null;

      const percentage =
        marksObtained !== null && Number(exam.max_marks) > 0
          ? Number(
              ((marksObtained / Number(exam.max_marks)) * 100)
                .toFixed(2)
            )
          : '';

      const result =
        marksObtained === null
          ? 'NOT ENTERED'
          : marksObtained >= Number(exam.passing_marks)
            ? 'PASS'
            : 'FAIL';

      data.push({
        ExamTitle: exam.title || '',
        Course: exam.course_id?.name || 'N/A',
        Batch: exam.batch_id?.name || 'N/A',
        Faculty: exam.faculty_id?.name || 'N/A',
        FacultyEmail: exam.faculty_id?.email || '',
        Subject: exam.subject || '',
        ExamType: exam.exam_type
          ? exam.exam_type.toUpperCase()
          : '',
        ExamDate: exam.exam_date
          ? new Date(exam.exam_date).toLocaleDateString()
          : '',
        MaxMarks: exam.max_marks,
        PassingMarks: exam.passing_marks,
        StudentID: mark?.student_id?.student_id || '',
        StudentName: mark?.student_id?.full_name || '',
        MarksObtained: marksObtained ?? '',
        Percentage: percentage,
        Result: result,
        ExamStatus: exam.status
          ? exam.status.toUpperCase()
          : '',
        ResultStatus: exam.result_status
          ? exam.result_status.toUpperCase()
          : '',
        Remarks: mark?.remarks || ''
      });
    }
  }

  const columns = [
    { header: 'Exam Title', key: 'ExamTitle', width: 25 },
    { header: 'Course', key: 'Course', width: 22 },
    { header: 'Batch', key: 'Batch', width: 20 },
    { header: 'Faculty', key: 'Faculty', width: 22 },
    { header: 'Faculty Email', key: 'FacultyEmail', width: 28 },
    { header: 'Subject', key: 'Subject', width: 22 },
    { header: 'Exam Type', key: 'ExamType', width: 15 },
    { header: 'Exam Date', key: 'ExamDate', width: 16 },
    { header: 'Max Marks', key: 'MaxMarks', width: 12 },
    { header: 'Passing Marks', key: 'PassingMarks', width: 15 },
    { header: 'Student ID', key: 'StudentID', width: 18 },
    { header: 'Student Name', key: 'StudentName', width: 25 },
    { header: 'Marks Obtained', key: 'MarksObtained', width: 16 },
    { header: 'Percentage', key: 'Percentage', width: 14 },
    { header: 'Result', key: 'Result', width: 15 },
    { header: 'Exam Status', key: 'ExamStatus', width: 15 },
    { header: 'Result Status', key: 'ResultStatus', width: 16 },
    { header: 'Remarks', key: 'Remarks', width: 30 }
  ];

  return generateWorkbook(
    data,
    columns,
    'Exams Results'
  );
};
// ============================================================
// B-41: TC / LC REPORT
// ============================================================

exports.getTcLcReport = async (query = {}) => {
  const filter = {};

  // Certificate type filter
  if (query.type) {
    const type = String(query.type).toUpperCase();

    if (!['TC', 'LC'].includes(type)) {
      const error = new Error('Invalid type. Allowed values: TC, LC');
      error.statusCode = 400;
      throw error;
    }

    filter.type = type;
  }

  // Request status filter
  if (query.status) {
    Object.assign(
      filter,
      buildStatusFilter(query, [
        'requested',
        'approved',
        'issued',
        'rejected',
      ])
    );
  }

  // Filter by request date
  Object.assign(filter, buildDateFilter(query, 'createdAt'));

  // Course and batch filters through Student records
  if (query.courseId || query.batchId) {
    const studentFilter = buildAcademicFilters(query);
    const studentIds = await Student.find(studentFilter).distinct('_id');

    filter.student_id = { $in: studentIds };
  }

  const requests = await TcLc.find(filter)
    .populate({
      path: 'student_id',
      select: 'student_id full_name phone email course_id batch_id',
      populate: [
        { path: 'course_id', select: 'name' },
        { path: 'batch_id', select: 'name' },
      ],
    })
    .populate('requested_by', 'name email')
    .populate('approved_by', 'name email')
    .sort({ createdAt: -1 })
    .lean();

  const data = requests.map((request) => ({
    StudentID: request.student_id?.student_id || 'N/A',
    StudentName: request.student_id?.full_name || 'N/A',
    Phone: request.student_id?.phone || '',
    Email: request.student_id?.email || '',
    Course: request.student_id?.course_id?.name || 'N/A',
    Batch: request.student_id?.batch_id?.name || 'N/A',

    CertificateType: request.type || '',
    CertificateNo: request.certificate_no || '',
    Reason: request.reason || '',

    RequestDate: request.createdAt
      ? new Date(request.createdAt).toLocaleDateString()
      : '',

    Status: request.status
      ? request.status.toUpperCase()
      : '',

    RequestedBy: request.requested_by?.name || '',
    ApprovedBy: request.approved_by?.name || '',

    IssueDate: request.issue_date
      ? new Date(request.issue_date).toLocaleDateString()
      : '',

    RejectionReason: request.rejection_reason || '',
    EligibilityNote: request.eligibility_note || '',
  }));

  const columns = [
    { header: 'Student ID', key: 'StudentID', width: 16 },
    { header: 'Student Name', key: 'StudentName', width: 25 },
    { header: 'Phone', key: 'Phone', width: 15 },
    { header: 'Email', key: 'Email', width: 25 },
    { header: 'Course', key: 'Course', width: 22 },
    { header: 'Batch', key: 'Batch', width: 22 },
    { header: 'Certificate Type', key: 'CertificateType', width: 16 },
    { header: 'Certificate No', key: 'CertificateNo', width: 20 },
    { header: 'Reason', key: 'Reason', width: 30 },
    { header: 'Request Date', key: 'RequestDate', width: 16 },
    { header: 'Status', key: 'Status', width: 14 },
    { header: 'Requested By', key: 'RequestedBy', width: 20 },
    { header: 'Approved By', key: 'ApprovedBy', width: 20 },
    { header: 'Issue Date', key: 'IssueDate', width: 16 },
    { header: 'Rejection Reason', key: 'RejectionReason', width: 30 },
    { header: 'Eligibility Note', key: 'EligibilityNote', width: 35 },
  ];

  return generateWorkbook(data, columns, 'TC LC Report');
};
// ============================================================
// B-41: LIBRARY ISSUES REPORT
// ============================================================

exports.getLibraryIssuesReport = async (query = {}) => {
  const filter = {};

  // Validate and apply status filter
  if (query.status) {
    Object.assign(
      filter,
      buildStatusFilter(query, ['issued', 'returned', 'overdue'])
    );
  }

  // Issue date range
  Object.assign(filter, buildDateFilter(query, 'issueDate'));

  // Optional student and book filters
  validateObjectId(query.studentId, 'studentId');
  validateObjectId(query.bookId, 'bookId');

  if (query.studentId) filter.student = query.studentId;
  if (query.bookId) filter.book = query.bookId;

  // Optional course and batch filters
  if (query.courseId || query.batchId) {
    const studentFilter = buildAcademicFilters(query);
    const studentIds = await Student.find(studentFilter).distinct('_id');

    filter.student = { $in: studentIds };
  }

  const issues = await BookIssue.find(filter)
    .populate('book', 'title author bookCode')
    .populate('student', 'student_id full_name phone email')
    .populate('issuedBy', 'name')
    .sort({ issueDate: -1 })
    .lean();

  const today = new Date();

  const data = issues.map((issue) => {
    const isOverdue =
      issue.status === 'issued' &&
      issue.dueDate &&
      new Date(issue.dueDate) < today;

    return {
      BookCode: issue.book?.bookCode || 'N/A',
      BookTitle: issue.book?.title || 'N/A',
      Author: issue.book?.author || '',
      StudentID: issue.student?.student_id || 'N/A',
      StudentName: issue.student?.full_name || 'N/A',
      Phone: issue.student?.phone || '',
      Email: issue.student?.email || '',

      IssueDate: issue.issueDate
        ? new Date(issue.issueDate).toLocaleDateString()
        : '',

      DueDate: issue.dueDate
        ? new Date(issue.dueDate).toLocaleDateString()
        : '',

      ReturnDate: issue.returnDate
        ? new Date(issue.returnDate).toLocaleDateString()
        : '',

      Status: isOverdue
        ? 'OVERDUE'
        : (issue.status || '').toUpperCase(),

      IssuedBy: issue.issuedBy?.name || '',

      DaysOverdue: isOverdue
        ? Math.floor(
            (today - new Date(issue.dueDate)) /
            (1000 * 60 * 60 * 24)
          )
        : 0,
    };
  });

  const columns = [
    { header: 'Book Code', key: 'BookCode', width: 15 },
    { header: 'Book Title', key: 'BookTitle', width: 28 },
    { header: 'Author', key: 'Author', width: 20 },
    { header: 'Student ID', key: 'StudentID', width: 16 },
    { header: 'Student Name', key: 'StudentName', width: 25 },
    { header: 'Phone', key: 'Phone', width: 16 },
    { header: 'Email', key: 'Email', width: 25 },
    { header: 'Issue Date', key: 'IssueDate', width: 16 },
    { header: 'Due Date', key: 'DueDate', width: 16 },
    { header: 'Return Date', key: 'ReturnDate', width: 16 },
    { header: 'Status', key: 'Status', width: 14 },
    { header: 'Issued By', key: 'IssuedBy', width: 20 },
    { header: 'Days Overdue', key: 'DaysOverdue', width: 14 },
  ];

  return generateWorkbook(data, columns, 'Library Issues');
};