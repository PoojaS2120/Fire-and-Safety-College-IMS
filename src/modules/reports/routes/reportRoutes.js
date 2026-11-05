const express = require('express');
const router = express.Router();

const { verifyToken } = require('../../../middlewares/auth');
const { authorize } = require('../../../middlewares/authorize');
const reportController = require('../controllers/reportController');

router.use(verifyToken);

// Only Admin and Office Staff can download financial/academic reports
const adminOnly = authorize('super_admin', 'office_staff');

// Fees
router.get('/fee-collection', adminOnly, reportController.downloadFeeCollection);
router.get('/pending-fees', adminOnly, reportController.downloadPendingFees);

// Admissions
router.get('/admissions', adminOnly, reportController.downloadAdmissions);
router.get('/enquiries', adminOnly, reportController.downloadEnquiries);

// Library (Librarian can also download)
router.get('/overdue-books', authorize('super_admin', 'office_staff', 'librarian'), reportController.downloadOverdueBooks);
router.get('/library-inventory', authorize('super_admin', 'office_staff', 'librarian'), reportController.downloadLibraryInventory);

module.exports = router;