const bonafideService = require('../services/bonafideService');

exports.getBonafide = async (req, res, next) => {
  try {
    const data = await bonafideService.getBonafideData(req.params.id);
    return res.status(200).json({
      success: true,
      message: 'Bonafide certificate data fetched successfully.',
      data,
    });
  } catch (error) {
    next(error);
  }
};