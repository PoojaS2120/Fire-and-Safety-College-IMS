const userService = require('../services/userService');
const { createUserSchema, updateUserSchema } = require('../validations/userValidation');

exports.createUser = async (req, res, next) => {
  try {
    const { error } = createUserSchema.validate(req.body);
    if (error) return res.status(400).json({ success: false, message: error.details[0].message });

    const user = await userService.createUser(req.body);
    res.status(201).json({ success: true, message: 'User created successfully', data: user });
  } catch (err) { next(err); }
};

exports.getUsers = async (req, res, next) => {
  try {
    const users = await userService.getUsers(req.query);
    res.status(200).json({ success: true, data: users });
  } catch (err) { next(err); }
};

exports.getUserById = async (req, res, next) => {
  try {
    const user = await userService.getUserById(req.params.id);
    res.status(200).json({ success: true, data: user });
  } catch (err) { next(err); }
};

exports.updateUser = async (req, res, next) => {
  try {
    const { error } = updateUserSchema.validate(req.body);
    if (error) return res.status(400).json({ success: false, message: error.details[0].message });

    const user = await userService.updateUser(req.params.id, req.body);
    res.status(200).json({ success: true, message: 'User updated', data: user });
  } catch (err) { next(err); }
};

exports.toggleStatus = async (req, res, next) => {
  try {
    const result = await userService.toggleStatus(req.params.id);
    res.status(200).json({ success: true, message: result.message });
  } catch (err) { next(err); }
};

exports.adminResetPassword = async (req, res, next) => {
  try {
    if (!req.body.password) return res.status(400).json({ success: false, message: 'New password required' });
    
    const result = await userService.adminResetPassword(req.params.id, req.body.password);
    res.status(200).json({ success: true, message: result.message });
  } catch (err) { next(err); }
};