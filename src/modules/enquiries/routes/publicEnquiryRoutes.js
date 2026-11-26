const express = require('express');
const router = express.Router();

const publicEnquiryController = require('../controllers/publicEnquiryController');

// Public form configuration — no JWT or RBAC
router.get('/form-config', publicEnquiryController.getPublicEnquiryFormConfig);

// Public enquiry submission — no JWT or RBAC
router.post('/', publicEnquiryController.createPublicEnquiry);

module.exports = router;