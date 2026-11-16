const subjectService = require('../services/subjectService');
const { createSubjectSchema, updateSubjectSchema } = require('../validations/subjectValidation');

// CREATE
exports.createSubject = async (req, res, next) => {
  try {
    const { error, value } = createSubjectSchema.validate(req.body);
    if (error) return res.status(400).json({ success: false, message: error.details[0].message });

    const subject = await subjectService.createSubject(value, req.user.id);
    
    return res.status(201).json({ 
      success: true, 
      message: 'Subject created successfully.', 
      data: subject 
    });
  } catch (err) { next(err); }
};

// GET ALL
exports.getSubjects = async (req, res, next) => {
  try {
    const result = await subjectService.getSubjects(req.query);
    
    return res.status(200).json({ 
      success: true, 
      data: result.subjects,
      pagination: result.pagination
    });
  } catch (err) { next(err); }
};

// GET ONE
exports.getSubjectById = async (req, res, next) => {
  try {
    const subject = await subjectService.getSubjectById(req.params.id);
    
    return res.status(200).json({ 
      success: true, 
      data: subject 
    });
  } catch (err) { next(err); }
};

// UPDATE
exports.updateSubject = async (req, res, next) => {
  try {
    const { error, value } = updateSubjectSchema.validate(req.body);
    if (error) return res.status(400).json({ success: false, message: error.details[0].message });

    const subject = await subjectService.updateSubject(req.params.id, value);
    
    return res.status(200).json({ 
      success: true, 
      message: 'Subject updated successfully.', 
      data: subject 
    });
  } catch (err) { next(err); }
};

// DELETE
exports.deleteSubject = async (req, res, next) => {
  try {
    const result = await subjectService.deleteSubject(req.params.id);
    
    return res.status(200).json({ 
      success: true, 
      message: result.message 
    });
  } catch (err) { next(err); }
};