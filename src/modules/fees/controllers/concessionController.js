const concessionService = require('../services/concessionService');

exports.createConcession = async (req, res, next) => {
  try {
    const data = await concessionService.createConcession(req.body, req.user.id);
    res.status(201).json({ success: true, message: 'Concession created.', data });
  } catch (e) {
    next(e);
  }
};

exports.getConcessions = async (req, res, next) => {
  try {
    const data = await concessionService.getConcessions(req.query);
    res.status(200).json({ success: true, data });
  } catch (e) {
    next(e);
  }
};

exports.getConcessionById = async (req, res, next) => {
  try {
    const data = await concessionService.getConcessionById(req.params.id);
    res.status(200).json({ success: true, data });
  } catch (e) {
    next(e);
  }
};

exports.updateConcession = async (req, res, next) => {
  try {
    const data = await concessionService.updateConcession(req.params.id, req.body);
    res.status(200).json({ success: true, message: 'Concession updated.', data });
  } catch (e) {
    next(e);
  }
};

exports.deleteConcession = async (req, res, next) => {
  try {
    const result = await concessionService.deleteConcession(req.params.id);
    res.status(200).json({ success: true, message: result.message });
  } catch (e) {
    next(e);
  }
};