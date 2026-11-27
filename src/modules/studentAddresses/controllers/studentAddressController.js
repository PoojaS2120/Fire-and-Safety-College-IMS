const service = require('../services/studentAddressService');

const asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next); // ⚠️ ADAPT: use your asyncHandler if exists

// POST /api/v1/student-addresses
const create = asyncHandler(async (req, res) => {
  const data = await service.createAddress(req.user, req.body);
  res.status(201).json({
    success: true,
    message: 'Address submitted successfully',
    data,
  });
});

// GET /api/v1/student-addresses/me
const getMe = asyncHandler(async (req, res) => {
  const data = await service.getMyAddress(req.user);
  res.status(200).json({ success: true, data });
});

// PUT /api/v1/student-addresses/me
const updateMe = asyncHandler(async (req, res) => {
  const data = await service.updateMyAddress(req.user, req.body);
  res.status(200).json({
    success: true,
    message: 'Address updated successfully',
    data,
  });
});

module.exports = { create, getMe, updateMe };