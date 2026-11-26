
const express = require('express');
const router = express.Router();

const { verifyToken } = require('../../../middlewares/auth');
const { authorize } = require('../../../middlewares/authorize');
const reportController = require('../controllers/reportController');

router.use(verifyToken);

// Admin and Office Staff access
const adminOnly = authorize('super_admin', 'office_staff');

// ================= COMBINED EXCEL REPORT =================

router.get(
  '/export/all',
  adminOnly,
  reportController.downloadAllReports
);

// ================= B-28: ACADEMIC & FINANCIAL REPORTS =================

// Fee Collection
router.get(
  '/fee-collection',
  adminOnly,
  reportController.downloadFeeCollection
);

// Pending Fees
router.get(
  '/pending-fees',
  adminOnly,
  reportController.downloadPendingFees
);

// Admissions
router.get(
  '/admissions',
  adminOnly,
  reportController.downloadAdmissions
);

// Enquiries
router.get(
  '/enquiries',
  adminOnly,
  reportController.downloadEnquiries
);

// Enquiry Status-wise Excel Reports

router.get(
  '/enquiries/interested',
  adminOnly,
  reportController.downloadEnquiryStatusReport
);

router.get(
  '/enquiries/not-interested',
  adminOnly,
  reportController.downloadEnquiryStatusReport
);

router.get(
  '/enquiries/follow-up',
  adminOnly,
  reportController.downloadEnquiryStatusReport
);
// Students
router.get(
  '/students',
  adminOnly,
  reportController.downloadStudents
);

// Receipts
router.get(
  '/receipts',
  adminOnly,
  reportController.downloadReceipts
);

// Exam Forms
router.get(
  '/exam-forms',
  adminOnly,
  reportController.downloadExamForms
);

// ================= B-41: LIBRARY REPORTS =================

// Overdue Books
router.get(
  '/overdue-books',
  authorize('super_admin', 'office_staff', 'librarian'),
  reportController.downloadOverdueBooks
);

// Library Inventory
router.get(
  '/library-inventory',
  authorize('super_admin', 'office_staff', 'librarian'),
  reportController.downloadLibraryInventory
);

// ================= B-41: COURSE-WISE STUDENTS =================

router.get(
  '/course-students',
  adminOnly,
  reportController.downloadCourseWiseStudents
);

// ================= B-41: SCHEDULES REPORT =================

router.get(
  '/schedules',
  adminOnly,
  reportController.downloadSchedules
);

// ================= B-41: TESTS REPORT =================

router.get(
  '/class-tests',
  adminOnly,
  reportController.downloadClassTests
);

router.get(
  '/exams-results',
  adminOnly,
  reportController.downloadExamsResults
);

// ================= TC / LC REPORT =================

router.get(
  '/tc-lc',
  adminOnly,
  reportController.downloadTcLcReport
);

// ================= LIBRARY ISSUES =================

router.get(
  '/library-issues',
  authorize('super_admin', 'office_staff', 'librarian'),
  reportController.downloadLibraryIssues
);

module.exports = router;
