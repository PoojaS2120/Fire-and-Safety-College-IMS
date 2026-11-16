// exports.authorize = (...allowedRoles) => {
//   return (req, res, next) => {
//     // Check if user exists on request (set by verifyToken)
//     if (!req.user) {
//       return res.status(401).json({ 
//         success: false, 
//         message: 'Unauthorized: User not found' 
//       });
//     }

//     // Check if the user's role is in the allowed roles
//     if (!allowedRoles.includes(req.user.role)) {
//       return res.status(403).json({ 
//         success: false, 
//         code: 'FORBIDDEN', 
//         message: 'You do not have permission to perform this action' 
//       });
//     }

//     next();
//   };
// };


/** Role-name check (legacy, still used by most routes). */
exports.authorize = (...allowedRoles) => (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ success: false, message: 'Unauthorized: User not found' });
  }
  if (!allowedRoles.includes(req.user.role)) {
    return res.status(403).json({
      success: false,
      code: 'FORBIDDEN',
      message: 'You do not have permission to perform this action',
    });
  }
  next();
};

/**
 * Migration helper: allow if role name is in the list OR the user's role has the permission.
 * This makes custom roles (created in RBAC screen) actually work on existing routes.
 * Usage: authorizeOrPermission('fees.manage', 'super_admin', 'office_staff')
 */
exports.authorizeOrPermission = (permission, ...allowedRoles) => (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ success: false, message: 'Unauthorized: User not found' });
  }
  const perms = req.user.permissions || [];
  if (allowedRoles.includes(req.user.role) || perms.includes('*') || perms.includes(permission)) {
    return next();
  }
  return res.status(403).json({
    success: false,
    code: 'FORBIDDEN',
    message: 'You do not have permission to perform this action',
  });
};