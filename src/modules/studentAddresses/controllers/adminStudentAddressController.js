const service = require('../services/studentAddressService');

const asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next); // ⚠️ ADAPT

// GET /api/v1/admin/student-addresses?page=1&limit=20&search=ram&has_address=true
const list = asyncHandler(async (req, res) => {
  const { page, limit, search, has_address } = req.query;
  const result = await service.listAddressesForAdmin({
    page: page ? Number(page) : 1,
    limit: limit ? Number(limit) : 20,
    search,
    has_address,
  });
  res.status(200).json({ success: true, ...result });
});

// GET /api/v1/admin/student-addresses/:studentId
const getByStudent = asyncHandler(async (req, res) => {
  const { student, address } = await service.getAddressForAdmin(req.params.studentId);
  res.status(200).json({ success: true, data: { student, address } });
});

module.exports = { list, getByStudent };