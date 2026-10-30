const FacultyAssignment = require('../models/FacultyAssignment');
const User = require('../../auth/models/User');

exports.assignFaculty = async (data) => {
  // 1. Check if the user is actually a faculty
  const faculty = await User.findById(data.faculty_id);
  if (!faculty || faculty.role !== 'faculty') {
    throw { statusCode: 400, message: 'Invalid faculty ID or user is not a faculty member' };
  }

  // 2. Create the assignment
  const assignment = await FacultyAssignment.create(data);
  return assignment;
};

exports.getAssignments = async (query) => {
  // If a faculty ID is passed, filter by it. Otherwise, show all (for Super Admin)
  const filter = {};
  if (query.faculty_id) filter.faculty_id = query.faculty_id;

  // Populate names so the frontend can display them easily
  return await FacultyAssignment.find(filter)
    .populate('faculty_id', 'name email')
    .populate('course_id', 'name')
    .populate('batch_id', 'name');
};

exports.removeAssignment = async (assignmentId) => {
  const assignment = await FacultyAssignment.findByIdAndDelete(assignmentId);
  if (!assignment) throw { statusCode: 404, message: 'Assignment not found' };
  return { message: 'Assignment removed successfully' };
};