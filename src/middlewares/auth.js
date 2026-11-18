
// const jwt = require('jsonwebtoken');
// const User = require('../modules/auth/models/User');

// /**
//  * Verifies the JWT, then loads the user fresh from the DB so that:
//  *  - deactivated users are blocked immediately
//  *  - role / permission changes apply immediately (no stale token role)
//  * Sets req.user = { id, role (name), permissions: [codes] }
//  */
// exports.verifyToken = async (req, res, next) => {
//   const token = req.headers.authorization?.split(' ')[1];
//   if (!token) {
//     return res.status(401).json({ success: false, message: 'Unauthorized: No token provided' });
//   }

//   let decoded;
//   try {
//     decoded = jwt.verify(token, process.env.JWT_ACCESS_SECRET);
//   } catch (err) {
//     return res.status(401).json({ success: false, message: 'Unauthorized: Invalid or expired token' });
//   }

//   try {
//     const user = await User.findById(decoded.id)
//       .select('is_active role')
//       .populate({ path: 'role', select: 'name permissions', populate: { path: 'permissions', select: 'code' } });

//     if (!user || !user.role) {
//       return res.status(401).json({ success: false, message: 'Unauthorized: User not found' });
//     }
//     if (!user.is_active) {
//       return res.status(403).json({ success: false, message: 'Account is deactivated' });
//     }

//     req.user = {
//       id: String(user._id),
//       role: user.role.name,
//       permissions: user.role.name === 'super_admin' ? ['*'] : user.role.permissions.map((p) => p.code),
//     };
//     next();
//   } catch (err) {
//     next(err);
//   }
// };




const jwt = require('jsonwebtoken');
const User = require('../modules/auth/models/User');
const resolvePermissions = require('../modules/rbac/utils/resolvePermissions');

/**
 * Verifies the JWT, then loads the user fresh from the DB so that:
 *  - deactivated users are blocked immediately
 *  - role / permission changes apply immediately (no stale token role)
 * Sets req.user = { id, role (name), permissions: [codes] }
 * permissions = (role + user extra) - user denied;  super_admin => ['*']
 */
exports.verifyToken = async (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) {
    return res.status(401).json({ success: false, message: 'Unauthorized: No token provided' });
  }

  let decoded;
  try {
    decoded = jwt.verify(token, process.env.JWT_ACCESS_SECRET);
  } catch (err) {
    return res.status(401).json({ success: false, message: 'Unauthorized: Invalid or expired token' });
  }

  try {
    const user = await User.findById(decoded.id)
      .select('is_active role extra_permissions denied_permissions')
      .populate(resolvePermissions.POPULATE);

    if (!user || !user.role) {
      return res.status(401).json({ success: false, message: 'Unauthorized: User not found' });
    }
    if (!user.is_active) {
      return res.status(403).json({ success: false, message: 'Account is deactivated' });
    }

    req.user = {
      id: String(user._id),
      role: user.role.name,
      permissions: resolvePermissions(user),
    };
    next();
  } catch (err) {
    next(err);
  }
};