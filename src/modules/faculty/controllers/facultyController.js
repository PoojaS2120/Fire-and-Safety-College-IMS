const facultyService = require('../services/facultyService');
const { assignFacultySchema } = require('../validations/facultyValidation');

exports.assignFaculty = async (req, res, next) => {
  try {
    const { error } = assignFacultySchema.validate(req.body);
    if (error) return res.status(400).json({ success: false, message: error.details[0].message });

    const assignment = await facultyService.assignFaculty(req.body);
    res.status(201).json({ success: true, message: 'Faculty assigned successfully', data: assignment });
  } catch (err) { next(err); }
};

exports.getAssignments = async (req, res, next) => {
  try {
    const assignments = await facultyService.getAssignments(req.query);
    res.status(200).json({ success: true, data: assignments });
  } catch (err) { next(err); }
};

exports.removeAssignment = async (req, res, next) => {
  try {
    const result = await facultyService.removeAssignment(req.params.id);
    res.status(200).json({ success: true, message: result.message });
  } catch (err) { next(err); }
};