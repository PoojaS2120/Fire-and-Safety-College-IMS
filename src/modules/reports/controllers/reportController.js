const reportService = require('../services/reportService');


// Helper: Send Excel workbook as a valid XLSX buffer
const streamExcel = async (res, workbook, filename) => {
  const buffer = await workbook.xlsx.writeBuffer();

  res.setHeader(
    'Content-Type',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  );

  res.setHeader(
    'Content-Disposition',
    `attachment; filename="${filename}.xlsx"`
  );

  res.setHeader('Content-Length', buffer.length);

  return res.end(Buffer.from(buffer));
};

// ================= B-28: FEE COLLECTION =================

exports.downloadFeeCollection = async (req, res, next) => {
  try {
    const workbook = await reportService.getFeeCollectionReport(
      req.query
    );

    await streamExcel(
      res,
      workbook,
      `Fee_Collection_${Date.now()}`
    );
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

    await streamExcel(
      res,
      workbook,
      `Pending_Fees_${Date.now()}`
    );
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

    await streamExcel(
      res,
      workbook,
      `Admissions_${Date.now()}`
    );
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

    await streamExcel(
      res,
      workbook,
      `Students_${Date.now()}`
    );
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

    await streamExcel(
      res,
      workbook,
      `Enquiries_${Date.now()}`
    );
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

    await streamExcel(
      res,
      workbook,
      `Receipts_${Date.now()}`
    );
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

    await streamExcel(
      res,
      workbook,
      `Exam_Forms_${Date.now()}`
    );
  } catch (err) {
    next(err);
  }
};

// ================= LIBRARY REPORTS (B-41) =================

exports.downloadOverdueBooks = async (req, res, next) => {
  try {
    const workbook = await reportService.getOverdueBooksReport();

    await streamExcel(
      res,
      workbook,
      `Overdue_Books_${Date.now()}`
    );
  } catch (err) {
    next(err);
  }
};

exports.downloadLibraryInventory = async (req, res, next) => {
  try {
    const workbook = await reportService.getLibraryInventoryReport();

    await streamExcel(
      res,
      workbook,
      `Library_Inventory_${Date.now()}`
    );
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

    await streamExcel(
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

    await streamExcel(
      res,
      workbook,
      `Schedules_${Date.now()}`
    );
  } catch (err) {
    next(err);
  }
};
// B-41: Class Tests Report
exports.downloadClassTests = async (req, res, next) => {
  try {
    const workbook = await reportService.getClassTestsReport(
      req.query
    );

    await streamExcel(
      res,
      workbook,
      `Class_Tests_${Date.now()}`
    );
  } catch (error) {
    next(error);
  }
};
// =====================================================
// B-41: EXAMS / RESULTS REPORT
// =====================================================

exports.downloadExamsResults = async (req, res, next) => {
  try {
    const workbook = await reportService.getExamsResultsReport(
      req.query
    );

    await streamExcel(
      res,
      workbook,
      `Exams_Results_${Date.now()}`
    );
  } catch (error) {
    next(error);
  }
};
// ================= B-41: TC / LC REPORT =================

exports.downloadTcLcReport = async (req, res, next) => {
  try {
    const workbook = await reportService.getTcLcReport(req.query);

    await streamExcel(
      res,
      workbook,
      `TC_LC_Report_${Date.now()}`
    );
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

    await streamExcel(
      res,
      workbook,
      `Library_Issues_${Date.now()}`
    );
  } catch (err) {
    next(err);
  }
};