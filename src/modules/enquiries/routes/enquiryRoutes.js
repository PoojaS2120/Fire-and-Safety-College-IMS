const express = require('express');
const router = express.Router();

const { verifyToken } = require('../../../middlewares/auth');
const { authorize } = require('../../../middlewares/authorize');
const enquiryController = require('../controllers/enquiryController');
const { uploadAdmissionImages } = require('../../uploads/middleware/uploadMiddleware');
router.use(verifyToken, authorize('super_admin', 'office_staff'));

// Create enquiry
router.post('/', enquiryController.createEnquiry);

// Get all enquiries with filters and pagination
router.get('/', enquiryController.getEnquiries);

router.get('/summary', enquiryController.getEnquirySummary);
router.put('/:id/status', enquiryController.updateEnquiryStatus);
router.put('/:id', enquiryController.updateEnquiry);

router.get('/:id/admission-prefill', enquiryController.getAdmissionPrefill);
router.get(
  '/:id/admission-form',
  enquiryController.getAdmissionForm
);
router.put(
  '/:id/admission-form',
  uploadAdmissionImages.fields([
    { name: 'student_photo', maxCount: 1 },
    { name: 'student_signature', maxCount: 1 },
    { name: 'parent_signature', maxCount: 1 },
  ]),
  enquiryController.updateAdmissionForm
);
router.post(
  '/:id/convert',
  uploadAdmissionImages.fields([
    { name: 'student_photo', maxCount: 1 },
    { name: 'student_signature', maxCount: 1 },
    { name: 'parent_signature', maxCount: 1 }, // <-- ADDED
  ]),
  enquiryController.convertEnquiry
);
router.get(
  '/:id/admission-form/download',
  enquiryController.downloadAdmissionForm
);
router.get(
  '/:id/admission-form/images/:imageType',
  enquiryController.getAdmissionFormImage
);

// Fetch existing group members automatically
router.get(
  '/:id/group-members',
  enquiryController.getGroupMembers
);

// NEW: Delete enquiry
router.delete('/:id', enquiryController.deleteEnquiry);

router.get('/:id', enquiryController.getEnquiryById);

module.exports = router;