const Student = require('../models/Student');

async function getSelfStudent(userId) {
  const s = await Student.findOne({ user_id: userId })
    .populate('course_id', 'name duration')
    .populate('batch_id', 'name start_date end_date');
  if (!s) {
    const err = new Error('Student profile not found');
    err.statusCode = 404;
    throw err;
  }
  return s;
}

exports.getMyProfile = async (req, res, next) => {
  try {
    const s = await getSelfStudent(req.user.id);
    res.json({
      success: true,
      data: {
        student_id: s.student_id,
        full_name: s.full_name,
        dob: s.dob,
        gender: s.gender,
        phone: s.phone,
        email: s.email,
        address: s.address,
        guardian_name: s.guardian_name,
        guardian_phone: s.guardian_phone,
        qualification: s.qualification,
        course: s.course_id,
        batch: s.batch_id,
        lifecycle_stage: s.lifecycle_stage,
        stage_status: s.stage_status,
      },
    });
  } catch (err) { next(err); }
};

exports.getMyCourse = async (req, res, next) => {
  try {
    const s = await getSelfStudent(req.user.id);
    res.json({ success: true, data: { course: s.course_id, batch: s.batch_id } });
  } catch (err) { next(err); }
};