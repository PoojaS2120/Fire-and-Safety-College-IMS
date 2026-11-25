const express = require('express');
const router = express.Router();
const concessionController = require('../controllers/concessionController');
const { verifyToken } = require('../../../middlewares/auth');
const { authorizeOrPermission } = require('../../../middlewares/authorize');

router.use(verifyToken);

router.post(
  '/',
  authorizeOrPermission('fees.concessions.create'),
  concessionController.createConcession
);
router.get(
  '/',
  authorizeOrPermission('fees.concessions.view'),
  concessionController.getConcessions
);
router.get(
  '/:id',
  authorizeOrPermission('fees.concessions.view'),
  concessionController.getConcessionById
);
router.put(
  '/:id',
  authorizeOrPermission('fees.concessions.update'),
  concessionController.updateConcession
);
router.delete(
  '/:id',
  authorizeOrPermission('fees.concessions.delete'),
  concessionController.deleteConcession
);

module.exports = router;