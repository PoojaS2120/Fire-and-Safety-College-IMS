const ExcelJS = require('exceljs');
const Student = require('../../students/models/Student');
const Enquiry = require('../../enquiries/models/Enquiry');
const StudentFee = require('../../fees/models/StudentFee');
const Payment = require('../../fees/models/Payment');
const Book = require('../../library/models/Book');
const BookIssue = require('../../library/models/BookIssue');

// Helper: Generate Excel workbook from array of objects
const generateWorkbook = async (data, columns, sheetName = 'Report') => {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet(sheetName);

  // Define columns
  worksheet.columns = columns;

  // Style header row
  worksheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
  worksheet.getRow(1).fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF10B981' }, // Brand Green
  };

  // Add rows
  data.forEach((row) => {
    worksheet.addRow(row);
  });

  // Auto-fit columns
  worksheet.columns.forEach((column) => {
    let maxLength = 0;
    column.eachCell({ includeEmpty: true }, (cell) => {
      const columnLength = cell.value ? cell.value.toString().length : 10;
      if (columnLength > maxLength) maxLength = columnLength;
    });
    column.width = maxLength < 10 ? 10 : maxLength + 2;
  });

  return workbook;
};

// ================= 1. FEES REPORTS =================

exports.getFeeCollectionReport = async () => {
  const payments = await Payment.find({ status: 'active' })
    .populate('student_id', 'student_id full_name phone')
    .sort({ payment_date: -1 })
    .lean();

  const data = payments.map((p) => ({
    Receipt: p.receipt_no,
    Date: new Date(p.payment_date).toLocaleDateString(),
    StudentID: p.student_id?.student_id || 'N/A',
    StudentName: p.student_id?.full_name || 'N/A',
    Amount: p.amount,
    Mode: p.mode.toUpperCase(),
    Reference: p.reference_no || '-',
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

  return await generateWorkbook(data, columns, 'Fee Collection');
};

exports.getPendingFeesReport = async () => {
  const fees = await StudentFee.find({ status: { $in: ['pending', 'partial'] } })
    .populate('student_id', 'student_id full_name phone')
    .populate('course_id', 'name')
    .lean();

  const data = fees.filter(f => f.student_id).map((f) => ({
    StudentID: f.student_id.student_id,
    Name: f.student_id.full_name,
    Phone: f.student_id.phone,
    Course: f.course_id?.name || 'N/A',
    FeeName: f.fee_name,
    DueAmount: f.amount_due,
    PaidAmount: f.amount_paid,
    Balance: f.amount_due - f.amount_paid,
    Status: f.status.toUpperCase(),
    RequiredForExam: f.required_for_exam ? 'YES' : 'NO',
  }));

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

  return await generateWorkbook(data, columns, 'Pending Fees');
};

// ================= 2. ADMISSIONS REPORTS =================

exports.getAdmissionsReport = async () => {
  const students = await Student.find()
    .populate('course_id', 'name')
    .populate('batch_id', 'name')
    .sort({ admitted_on: -1 })
    .lean();

  const data = students.map((s) => ({
    ID: s.student_id,
    Name: s.full_name,
    Phone: s.phone,
    Course: s.course_id?.name || 'N/A',
    Batch: s.batch_id?.name || 'N/A',
    AdmittedOn: new Date(s.admitted_on).toLocaleDateString(),
    Status: s.status.toUpperCase(),
    Stage: s.lifecycle_stage,
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

  return await generateWorkbook(data, columns, 'Admissions');
};

exports.getEnquiriesReport = async () => {
  const enquiries = await Enquiry.find()
    .populate('course_interest_id', 'name')
    .sort({ createdAt: -1 })
    .lean();

  const data = enquiries.map((e) => ({
    Name: e.name,
    Phone: e.phone,
    Course: e.course_interest_id?.name || 'N/A',
    Source: e.source || 'N/A',
    Status: e.status.toUpperCase(),
    Date: new Date(e.createdAt).toLocaleDateString(),
  }));

  const columns = [
    { header: 'Name', key: 'Name', width: 25 },
    { header: 'Phone', key: 'Phone', width: 15 },
    { header: 'Course Interest', key: 'Course', width: 20 },
    { header: 'Source', key: 'Source', width: 15 },
    { header: 'Status', key: 'Status', width: 12 },
    { header: 'Date', key: 'Date', width: 15 },
  ];

  return await generateWorkbook(data, columns, 'Enquiries');
};

// ================= 3. LIBRARY REPORTS =================

exports.getOverdueBooksReport = async () => {
  const today = new Date();
  const issues = await BookIssue.find({ status: 'issued', dueDate: { $lt: today } })
    .populate('book', 'title author bookCode')
    .populate('student', 'student_id full_name')
    .lean();

  const data = issues.map((i) => ({
    BookCode: i.book?.bookCode || 'N/A',
    BookTitle: i.book?.title || 'N/A',
    StudentID: i.student?.student_id || 'N/A',
    StudentName: i.student?.full_name || 'N/A',
    IssueDate: new Date(i.issueDate).toLocaleDateString(),
    DueDate: new Date(i.dueDate).toLocaleDateString(),
    DaysOverdue: Math.floor((today - new Date(i.dueDate)) / (1000 * 60 * 60 * 24)),
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

  return await generateWorkbook(data, columns, 'Overdue Books');
};

// ================= 4. LIBRARY INVENTORY =================

exports.getLibraryInventoryReport = async () => {
  const books = await Book.find()
    .populate('category', 'name')
    .lean();

  const data = books.map((b) => ({
    Code: b.bookCode,
    Title: b.title,
    Author: b.author,
    Category: b.category?.name || 'N/A',
    TotalQty: b.totalQty,
    AvailableQty: b.availableQty,
    IssuedQty: b.totalQty - b.availableQty,
    Status: b.status.toUpperCase(),
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

  return await generateWorkbook(data, columns, 'Library Inventory');
};