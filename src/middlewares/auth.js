// const jwt = require('jsonwebtoken');
// const User = require('../modules/auth/models/User');
// const resolvePermissions = require('../modules/rbac/utils/resolvePermissions');

// /**
//  * Verifies the JWT, then loads the user fresh from the DB so that:
//  *  - deactivated users are blocked immediately
//  *  - role / permission changes apply immediately (no stale token role)
//  * Sets req.user = { id, role (name), permissions: [codes] }
//  * permissions = (role + user extra) - user denied;  super_admin => ['*']
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
//       .select('is_active role extra_permissions denied_permissions')
//       .populate(resolvePermissions.POPULATE);

//     if (!user || !user.role) {
//       return res.status(401).json({ success: false, message: 'Unauthorized: User not found' });
//     }
//     if (!user.is_active) {
//       return res.status(403).json({ success: false, message: 'Account is deactivated' });
//     }

//     req.user = {
//       id: String(user._id),
//       role: user.role.name,
//       permissions: resolvePermissions(user),
//     };
//     next();
//   } catch (err) {
//     next(err);
//   }
// };




const jwt = require('jsonwebtoken');
const User = require('../modules/auth/models/User');
const Student = require('../modules/students/models/Student'); // <-- ADD THIS
const resolvePermissions = require('../modules/rbac/utils/resolvePermissions');

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

    // 🚨 NEW: BLOCKED STUDENT CHECK
    if (user.role.name === 'student') {
      const student = await Student.findOne({ user_id: user._id }).select('status block_reason');

      if (student && student.status === 'blocked') {
        return res.status(403).json({
          success: false,
          code: 'ACCOUNT_BLOCKED',
          message: `Your account has been blocked. Reason: ${student.block_reason || 'Contact administration.'}`,
        });
      }
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