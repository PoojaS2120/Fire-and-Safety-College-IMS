
const express = require('express');
const router = express.Router();

const publicEnquiryController = require('../controllers/publicEnquiryController');

// Public enquiry submission — no JWT or RBAC
router.post('/', publicEnquiryController.createPublicEnquiry);

module.exports = router;
