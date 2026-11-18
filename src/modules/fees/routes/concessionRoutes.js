const express = require('express');
const router = express.Router();
const concessionController = require('../controllers/concessionController');
const { verifyToken } = require('../../../middlewares/auth');
const { authorizeOrPermission } = require('../../../middlewares/authorize');

router.use(verifyToken);

router.post(
  '/',
  authorizeOrPermission('CONCESSIONS_CREATE', 'super_admin'),
  concessionController.createConcession
);
router.get(
  '/',
  authorizeOrPermission('CONCESSIONS_VIEW', 'super_admin', 'office_staff'),
  concessionController.getConcessions
);
router.get(
  '/:id',
  authorizeOrPermission('CONCESSIONS_VIEW', 'super_admin', 'office_staff'),
  concessionController.getConcessionById
);
router.put(
  '/:id',
  authorizeOrPermission('CONCESSIONS_UPDATE', 'super_admin'),
  concessionController.updateConcession
);
router.delete(
  '/:id',
  authorizeOrPermission('CONCESSIONS_DELETE', 'super_admin'),
  concessionController.deleteConcession
);

module.exports = router;