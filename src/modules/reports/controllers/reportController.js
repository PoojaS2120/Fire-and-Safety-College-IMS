
const XLSX = require('xlsx');
const reportService = require('../services/reportService');

// Helper: Send SheetJS workbook as a valid XLSX buffer.
const streamExcel = (res, workbook, filename) => {
  const buffer = XLSX.write(workbook, {
    type: 'buffer',
    bookType: 'xlsx',
  });

  res.setHeader(
    'Content-Type',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  );

  res.setHeader(
    'Content-Disposition',
    `attachment; filename="${filename}.xlsx"`
  );

  res.setHeader('Content-Length', buffer.length);

  return res.end(buffer);
};

// ================= B-28: FEE COLLECTION =================

exports.downloadFeeCollection = async (req, res, next) => {
  try {
    const workbook = await reportService.getFeeCollectionReport(
      req.query
    );

    streamExcel(res, workbook, `Fee_Collection_${Date.now()}`);
  } catch (err) {
    next(err);
  }
};

// ================= B-28: PENDING FEES =================

exports.downloadPendingFees = async (req, res, next) => {
  try {
    const workbook = await reportService.getPendingFeesReport(
      req.query
    );

    streamExcel(res, workbook, `Pending_Fees_${Date.now()}`);
  } catch (err) {
    next(err);
  }
};

// ================= B-28: ADMISSIONS =================

exports.downloadAdmissions = async (req, res, next) => {
  try {
    const workbook = await reportService.getAdmissionsReport(
      req.query
    );

    streamExcel(res, workbook, `Admissions_${Date.now()}`);
  } catch (err) {
    next(err);
  }
};

// ================= B-28: STUDENTS =================

exports.downloadStudents = async (req, res, next) => {
  try {
    const workbook = await reportService.getStudentsReport(
      req.query
    );

    streamExcel(res, workbook, `Students_${Date.now()}`);
  } catch (err) {
    next(err);
  }
};

// ================= B-28: ENQUIRIES =================

exports.downloadEnquiries = async (req, res, next) => {
  try {
    const workbook = await reportService.getEnquiriesReport(
      req.query
    );

    streamExcel(res, workbook, `Enquiries_${Date.now()}`);
  } catch (err) {
    next(err);
  }
};

// ================= B-28: RECEIPTS =================

exports.downloadReceipts = async (req, res, next) => {
  try {
    const workbook = await reportService.getReceiptsReport(
      req.query
    );

    streamExcel(res, workbook, `Receipts_${Date.now()}`);
  } catch (err) {
    next(err);
  }
};

// ================= B-28: EXAM FORMS =================

exports.downloadExamForms = async (req, res, next) => {
  try {
    const workbook = await reportService.getExamFormsReport(
      req.query
    );

    streamExcel(res, workbook, `Exam_Forms_${Date.now()}`);
  } catch (err) {
    next(err);
  }
};

// ================= LIBRARY REPORTS (B-41) =================

exports.downloadOverdueBooks = async (req, res, next) => {
  try {
    const workbook = await reportService.getOverdueBooksReport();

    streamExcel(res, workbook, `Overdue_Books_${Date.now()}`);
  } catch (err) {
    next(err);
  }
};

exports.downloadLibraryInventory = async (req, res, next) => {
  try {
    const workbook = await reportService.getLibraryInventoryReport();

    streamExcel(res, workbook, `Library_Inventory_${Date.now()}`);
  } catch (err) {
    next(err);
  }
};

// ================= B-41: COURSE-WISE STUDENTS =================

exports.downloadCourseWiseStudents = async (req, res, next) => {
  try {
    const workbook = await reportService.getCourseWiseStudentsReport(
      req.query
    );

    streamExcel(
      res,
      workbook,
      `Course_Wise_Students_${Date.now()}`
    );
  } catch (err) {
    next(err);
  }
};

// ================= B-41: SCHEDULES REPORT =================

exports.downloadSchedules = async (req, res, next) => {
  try {
    const workbook = await reportService.getSchedulesReport(
      req.query
    );

    streamExcel(res, workbook, `Schedules_${Date.now()}`);
  } catch (err) {
    next(err);
  }
};

// ================= B-41: CLASS TESTS REPORT =================

exports.downloadClassTests = async (req, res, next) => {
  try {
    const workbook = await reportService.getClassTestsReport(
      req.query
    );

    streamExcel(res, workbook, `Class_Tests_${Date.now()}`);
  } catch (error) {
    next(error);
  }
};

// ================= B-41: EXAMS / RESULTS REPORT =================

exports.downloadExamsResults = async (req, res, next) => {
  try {
    const workbook = await reportService.getExamsResultsReport(
      req.query
    );

    streamExcel(res, workbook, `Exams_Results_${Date.now()}`);
  } catch (error) {
    next(error);
  }
};

// ================= B-41: TC / LC REPORT =================

exports.downloadTcLcReport = async (req, res, next) => {
  try {
    const workbook = await reportService.getTcLcReport(req.query);

    streamExcel(res, workbook, `TC_LC_Report_${Date.now()}`);
  } catch (err) {
    next(err);
  }
};

// ================= B-41: LIBRARY ISSUES =================

exports.downloadLibraryIssues = async (req, res, next) => {
  try {
    const workbook = await reportService.getLibraryIssuesReport(
      req.query
    );

    streamExcel(res, workbook, `Library_Issues_${Date.now()}`);
  } catch (err) {
    next(err);
  }
};
// ================= COMBINED EXCEL REPORT =================

exports.downloadAllReports = async (req, res, next) => {
  try {
    const workbook = await reportService.getCombinedReportsReport(
      req.query
    );

    streamExcel(
      res,
      workbook,
      `Complete_Reports_${Date.now()}`
    );
  } catch (error) {
    next(error);
  }
};