const FacultyAssignment = require('../models/FacultyAssignment');
const User = require('../../auth/models/User');
const Course = require('../../courses/models/Course');
const Batch = require('../../courses/models/Batch');

// ==========================================================
// 1. ASSIGN FACULTY (with full validation)
// ==========================================================
exports.assignFaculty = async (data) => {
  // 1. Verify user exists and has role "faculty"
  const faculty = await User.findById(data.faculty_id);
  if (!faculty || faculty.role !== 'faculty') {
    throw {
      statusCode: 400,
      message: 'Invalid faculty ID or user is not a faculty member',
    };
  }

  if (!faculty.is_active) {
    throw {
      statusCode: 400,
      message: 'Cannot assign an inactive faculty member',
    };
  }

  // 2. Verify course exists and is active
  const course = await Course.findOne({
    _id: data.course_id,
    status: 'active',
  });
  if (!course) {
    throw {
      statusCode: 400,
      message: 'Course not found or inactive',
    };
  }

  // 3. Verify batch exists, is active, and belongs to the course
  const batch = await Batch.findOne({
    _id: data.batch_id,
    course_id: data.course_id,
    status: 'active',
  });
  if (!batch) {
    throw {
      statusCode: 400,
      message: 'Batch not found, inactive, or does not belong to this course',
    };
  }

  // 4. Check for duplicate assignment
  const existing = await FacultyAssignment.findOne({
    faculty_id: data.faculty_id,
    batch_id: data.batch_id,
    subject: data.subject,
  });

  if (existing) {
    throw {
      statusCode: 409,
      message: 'This faculty is already assigned to this batch and subject',
    };
  }

  // 5. Create the assignment
  const assignment = await FacultyAssignment.create(data);

  // 6. Return populated version
  return await FacultyAssignment.findById(assignment._id)
    .populate('faculty_id', 'name email phone')
    .populate('course_id', 'name duration')
    .populate('batch_id', 'name start_date end_date');
};

// ==========================================================
// 2. LIST ASSIGNMENTS (with faculty scope enforced)
// ==========================================================
exports.getAssignments = async (query, user) => {
  const filter = {};

  // Faculty can only see their own assignments
  if (user && user.role === 'faculty') {
    filter.faculty_id = user.id;
  } else if (query.faculty_id) {
    filter.faculty_id = query.faculty_id;
  }

  if (query.course_id) filter.course_id = query.course_id;
  if (query.batch_id) filter.batch_id = query.batch_id;
  if (query.subject) filter.subject = query.subject;

  return await FacultyAssignment.find(filter)
    .populate('faculty_id', 'name email phone is_active')
    .populate('course_id', 'name duration')
    .populate('batch_id', 'name start_date end_date')
    .sort({ createdAt: -1 });
};

// ==========================================================
// 3. REMOVE ASSIGNMENT (with dependent data check)
// ==========================================================
exports.removeAssignment = async (assignmentId) => {
  const assignment = await FacultyAssignment.findById(assignmentId);
  if (!assignment) {
    throw { statusCode: 404, message: 'Assignment not found' };
  }

  // Optional: warn if data exists for this assignment
  // Uncomment if you want strict protection
  /*
  const ClassSchedule = require('../../classschedules/models/ClassSchedule');
  const ClassTest = require('../../classtests/models/Test');
  const Material = require('../../materials/models/Material');

  const scheduleCount = await ClassSchedule.countDocuments({
    faculty_id: assignment.faculty_id,
    batch_id: assignment.batch_id,
    subject: assignment.subject,
  });

  if (scheduleCount > 0) {
    throw {
      statusCode: 400,
      message: `Cannot remove — ${scheduleCount} class schedule(s) exist for this assignment. Cancel/delete them first.`,
    };
  }
  */

  await FacultyAssignment.findByIdAndDelete(assignmentId);
  return { message: 'Assignment removed successfully' };
};

// ==========================================================
// 4. HELPER — Check if faculty is assigned (reusable)
// ==========================================================
exports.isFacultyAssigned = async (facultyId, courseId, batchId, subject) => {
  const assignment = await FacultyAssignment.findOne({
    faculty_id: facultyId,
    course_id: courseId,
    batch_id: batchId,
    subject,
  });
  return !!assignment;
};