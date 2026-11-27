const express = require('express');
const controller = require('../controllers/adminStudentAddressController');
const {
  adminListValidation,
  adminStudentIdParam,
} = require('../validations/studentAddressValidation');
const {
  verifyToken,
  authorizeOrPermission,
} = require('../../../middlewares/auth');

const router = express.Router();

router.use(verifyToken);
// Anyone with student_address.view permission, or one of these admin roles
router.use(
  authorizeOrPermission('student_address.view', 'super_admin', 'admin', 'office_staff')
);

router.get('/', adminListValidation, controller.list);
router.get('/:studentId', adminStudentIdParam, controller.getByStudent);

module.exports = router;