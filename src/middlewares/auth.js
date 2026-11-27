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

// ─────────────────────────────────────────────────────────────
// Role / permission helpers (built on top of req.user set by verifyToken)
// req.user = { id, role: <roleName>, permissions: [codes] | ['*'] }
// ─────────────────────────────────────────────────────────────

/**
 * Allow only if the user has ANY of the given role names.
 * Usage: router.use(verifyToken, authorize('student'));
 */
exports.authorize = (...roles) => (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ success: false, message: 'Unauthorized: no user context' });
  }
  if (roles.length && !roles.includes(req.user.role)) {
    return res.status(403).json({
      success: false,
      message: `Forbidden: requires role ${roles.join(' or ')}`,
    });
  }
  return next();
};

/**
 * Allow only if the user has ALL of the given permission codes.
 * super_admin already has ['*'] from resolvePermissions, so we short-circuit.
 * Usage: router.use(verifyToken, requirePermission('student_address.view'));
 */
exports.requirePermission = (...codes) => (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ success: false, message: 'Unauthorized: no user context' });
  }
  const held = Array.isArray(req.user.permissions) ? req.user.permissions : [];
  const isSuper = held.includes('*');
  const hasAll = codes.every((c) => held.includes(c));

  if (!isSuper && !hasAll) {
    return res.status(403).json({
      success: false,
      message: `Forbidden: missing permission ${codes.join(', ')}`,
    });
  }
  return next();
};

/**
 * Pass if user role is in `roles` OR user holds the given permission.
 * Usage: router.use(verifyToken, authorizeOrPermission('student_address.view','admin','office_staff'));
 */
exports.authorizeOrPermission = (permissionCode, ...roles) => (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ success: false, message: 'Unauthorized: no user context' });
  }
  const held = Array.isArray(req.user.permissions) ? req.user.permissions : [];
  const isSuper = held.includes('*');

  const roleOk = roles.includes(req.user.role);
  const permOk = isSuper || (permissionCode && held.includes(permissionCode));

  if (!roleOk && !permOk) {
    return res.status(403).json({
      success: false,
      message: `Forbidden: requires role (${roles.join(', ') || 'none'}) or permission ${permissionCode || 'n/a'}`,
    });
  }
  return next();
};