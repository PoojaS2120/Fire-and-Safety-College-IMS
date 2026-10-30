const express = require('express');
const router = express.Router();

const { verifyToken } = require('../../../middlewares/auth');
const { authorize } = require('../../../middlewares/authorize');
const enquiryController = require('../controllers/enquiryController');

router.use(verifyToken, authorize('super_admin', 'office_staff'));

// Create enquiry
router.post('/', enquiryController.createEnquiry);

// Get all enquiries with filters and pagination
router.get('/', enquiryController.getEnquiries);

router.get('/summary', enquiryController.getEnquirySummary);
router.put('/:id/status', enquiryController.updateEnquiryStatus);
router.put('/:id', enquiryController.updateEnquiry);

router.post('/:id/convert', enquiryController.convertEnquiry);

router.get('/:id', enquiryController.getEnquiryById);
module.exports = router;