const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/groupConcession.controller');

// Routes matching the controller exactly
router.get('/enquiries', ctrl.listEnquiries);
router.get('/students', ctrl.searchStudents);
router.post('/preview', ctrl.preview);

module.exports = router;