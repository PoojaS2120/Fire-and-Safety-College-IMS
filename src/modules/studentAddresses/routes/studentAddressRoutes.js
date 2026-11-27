const express = require('express');
const controller = require('../controllers/studentAddressController');
const {
  createAddressValidation,
  updateAddressValidation,
} = require('../validations/studentAddressValidation');
const { verifyToken, authorize } = require('../../../middlewares/auth');

const router = express.Router();

// Auth + ensure role is 'student'
router.use(verifyToken, authorize('student'));

router.post('/', createAddressValidation, controller.create);
router.get('/me', controller.getMe);
router.put('/me', updateAddressValidation, controller.updateMe);

module.exports = router;