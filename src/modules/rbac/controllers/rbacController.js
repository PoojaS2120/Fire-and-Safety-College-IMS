
// const Role = require('../models/Role');
// const Permission = require('../models/Permission');
// const User = require('../../auth/models/User');

// // 1. GET ALL PERMISSIONS (Grouped)
// exports.getAllPermissions = async (req, res, next) => {
//   try {
//     const permissions = await Permission.find().sort({ module: 1 });
    
//     // Group them by module for easier UI rendering
//     const grouped = permissions.reduce((acc, p) => {
//       if (!acc[p.module]) acc[p.module] = [];
//       acc[p.module].push(p);
//       return acc;
//     }, {});

//     res.status(200).json({ success: true, data: grouped });
//   } catch (err) { next(err); }
// };

// // 2. GET ALL ROLES
// exports.getAllRoles = async (req, res, next) => {
//   try {
//     const roles = await Role.find().populate('permissions', 'code');
//     res.status(200).json({ success: true, data: roles });
//   } catch (err) { next(err); }
// };

// // 3. CREATE CUSTOM ROLE (This was missing!)
// exports.createRole = async (req, res, next) => {
//   try {
//     const { name, description } = req.body;
    
//     if (!name) {
//       return res.status(400).json({ success: false, message: 'Role name is required' });
//     }

//     const existing = await Role.findOne({ name: name.toLowerCase() });
//     if (existing) {
//       return res.status(409).json({ success: false, message: 'Role name already exists' });
//     }

//     const role = await Role.create({
//       name: name.toLowerCase(),
//       description,
//       isSystem: false,
//       permissions: []
//     });

//     res.status(201).json({ success: true, message: 'Role created', data: role });
//   } catch (err) { next(err); }
// };

// // 4. UPDATE ROLE PERMISSIONS
// exports.updateRolePermissions = async (req, res, next) => {
//   try {
//     const { roleId } = req.params;
//     const { permissionIds } = req.body;

//     const role = await Role.findByIdAndUpdate(
//       roleId,
//       { $set: { permissions: permissionIds } },
//       { returnDocument: 'after' }
//     ).populate('permissions', 'code');

//     res.status(200).json({ success: true, message: 'Permissions updated', data: role });
//   } catch (err) { next(err); }
// };

// // 5. DELETE CUSTOM ROLE
// exports.deleteRole = async (req, res, next) => {
//   try {
//     const { roleId } = req.params;

//     // 1. Find the role
//     const role = await Role.findById(roleId);
//     if (!role) {
//       return res.status(404).json({ success: false, message: 'Role not found' });
//     }

//     // 2. Prevent deleting default system roles
//     if (role.isSystem) {
//       return res.status(403).json({ 
//         success: false, 
//         message: 'Cannot delete default system roles.' 
//       });
//     }

//     // 3. Prevent deleting a role that is assigned to users
//     const usersWithRole = await User.countDocuments({ role: roleId });
//     if (usersWithRole > 0) {
//       return res.status(400).json({ 
//         success: false, 
//         message: `Cannot delete role. ${usersWithRole} user(s) are currently assigned to it.` 
//       });
//     }

//     // 4. Delete the role
//     await Role.findByIdAndDelete(roleId);

//     res.status(200).json({ 
//       success: true, 
//       message: `Role "${role.name}" deleted successfully` 
//     });
//   } catch (err) { next(err); }
// };



const Role = require('../models/Role');
const Permission = require('../models/Permission');
const User = require('../../auth/models/User');

// 1. GET ALL PERMISSIONS (Grouped)
exports.getAllPermissions = async (req, res, next) => {
  try {
    const permissions = await Permission.find().sort({ module: 1 });
    
    const grouped = permissions.reduce((acc, p) => {
      if (!acc[p.module]) acc[p.module] = [];
      acc[p.module].push(p);
      return acc;
    }, {});

    res.status(200).json({ success: true, data: grouped });
  } catch (err) { next(err); }
};

// 2. GET ALL ROLES
exports.getAllRoles = async (req, res, next) => {
  try {
    const roles = await Role.find().populate('permissions', 'code');
    res.status(200).json({ success: true, data: roles });
  } catch (err) { next(err); }
};

// 3. CREATE CUSTOM ROLE
exports.createRole = async (req, res, next) => {
  try {
    const { name, description } = req.body;
    
    if (!name) {
      return res.status(400).json({ success: false, message: 'Role name is required' });
    }

    const existing = await Role.findOne({ name: name.toLowerCase() });
    if (existing) {
      return res.status(409).json({ success: false, message: 'Role name already exists' });
    }

    const role = await Role.create({
      name: name.toLowerCase(),
      description,
      isSystem: false,
      permissions: []
    });

    res.status(201).json({ success: true, message: 'Role created', data: role });
  } catch (err) { next(err); }
};

// 4. UPDATE ROLE PERMISSIONS (With Safety Check)
exports.updateRolePermissions = async (req, res, next) => {
  try {
    const { roleId } = req.params;
    const { permissionIds } = req.body;

    // 🚨 SAFETY CHECK: Prevent wiping permissions if the array is missing
    if (!Array.isArray(permissionIds)) {
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid payload. Expected an array of permissionIds.' 
      });
    }

    const role = await Role.findByIdAndUpdate(
      roleId,
      { $set: { permissions: permissionIds } },
      { returnDocument: 'after' }
    ).populate('permissions', 'code');

    res.status(200).json({ success: true, message: 'Permissions updated', data: role });
  } catch (err) { next(err); }
};

// 5. DELETE CUSTOM ROLE
exports.deleteRole = async (req, res, next) => {
  try {
    const { roleId } = req.params;

    const role = await Role.findById(roleId);
    if (!role) {
      return res.status(404).json({ success: false, message: 'Role not found' });
    }

    if (role.isSystem) {
      return res.status(403).json({ 
        success: false, 
        message: 'Cannot delete default system roles.' 
      });
    }

    const usersWithRole = await User.countDocuments({ role: roleId });
    if (usersWithRole > 0) {
      return res.status(400).json({ 
        success: false, 
        message: `Cannot delete role. ${usersWithRole} user(s) are currently assigned to it.` 
      });
    }

    await Role.findByIdAndDelete(roleId);

    res.status(200).json({ 
      success: true, 
      message: `Role "${role.name}" deleted successfully` 
    });
  } catch (err) { next(err); }
};