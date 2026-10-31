const express = require('express');
const router = express.Router();
const auditController = require('../controllers/auditController');
const { verifyToken } = require('../../../middlewares/auth');
const { authorize } = require('../../../middlewares/authorize');

// Only Super Admin can view audit logs
router.get('/', verifyToken, authorize('super_admin'), auditController.getLogs);

module.exports = router;