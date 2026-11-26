// modules/enquiries/controllers/groupConcession.controller.js
const service = require('../services/groupConcession.service');

exports.listEnquiries = async (req, res) => {
  try {
    console.log("➡️ Hit /enquiries route with query:", req.query);
    const { search = '', page = 1, limit = 20 } = req.query;
    const data = await service.getEnquiriesForCourse({ search, page: +page, limit: +limit });
    res.json({ success: true, data });
  } catch (err) { 
    console.error("❌ Controller Error (listEnquiries):", err);
    res.status(500).json({ success: false, message: err.message }); 
  }
};

exports.searchStudents = async (req, res) => {
  try {
    console.log("➡️ Hit /students route with query:", req.query);
    const { search = '', page = 1, limit = 20 } = req.query;
    const data = await service.searchStudents({ search, page: +page, limit: +limit });
    res.json({ success: true, data });
  } catch (err) { 
    console.error("❌ Controller Error (searchStudents):", err);
    res.status(500).json({ success: false, message: err.message }); 
  }
};

exports.preview = async (req, res) => {
  try {
    const { enquiryIds = [], studentIds = [], concessionId } = req.body;
    if (!concessionId) {
      return res.status(400).json({ success: false, message: 'concessionId is required' });
    }
    const result = await service.previewGroupConcession({ enquiryIds, studentIds, concessionId });
    if (!result.valid) return res.status(400).json({ success: false, errors: result.errors });
    res.json({ success: true, data: result });
  } catch (err) { 
    console.error("❌ Controller Error (preview):", err);
    res.status(500).json({ success: false, message: err.message }); 
  }
};