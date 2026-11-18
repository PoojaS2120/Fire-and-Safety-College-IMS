
// const deny = (res, msg) => res.status(403).json({ success: false, code: 'FORBIDDEN', message: msg });
// const has = (perms, c) => perms.includes('*') || perms.includes(c);
// const noUser = (res) => res.status(401).json({ success: false, message: 'Unauthorized: User not found' });

// const requirePermission = (...codes) => (req, res, next) => {
//   if (!req.user) return noUser(res);
//   const perms = req.user.permissions || [];
//   return codes.some((c) => has(perms, c)) ? next() : deny(res, `Forbidden: Missing permission "${codes.join('" or "')}"`);
// };

// requirePermission.all = (...codes) => (req, res, next) => {
//   if (!req.user) return noUser(res);
//   const perms = req.user.permissions || [];
//   const missing = codes.filter((c) => !has(perms, c));
//   return missing.length ? deny(res, `Forbidden: Missing permission "${missing.join('", "')}"`) : next();
// };

// module.exports = requirePermission;



// Permission guard. Codes come from config/permissionCatalog.js  (module.page[.tab].action)
//
//   requirePermission('fees.fees.create')                  needs this
//   requirePermission('a.b.update', 'a.b.override')                  needs ANY of these
//   requirePermission.all('a.b.view', 'a.b.update')                  needs ALL of these
//   requirePermission.orRoles(['student'], 'fees.fees.view') permission OR one of the roles
//
// Uses req.user.permissions set by verifyToken (role + extra - denied). No extra DB query.
// super_admin carries '*'.
const deny = (res, msg) => res.status(403).json({ success: false, code: 'FORBIDDEN', message: msg });
const noUser = (res) => res.status(401).json({ success: false, message: 'Unauthorized: User not found' });
const has = (perms, c) => perms.includes('*') || perms.includes(c);

const requirePermission = (...codes) => (req, res, next) => {
  if (!req.user) return noUser(res);
  const perms = req.user.permissions || [];
  if (codes.some((c) => has(perms, c))) return next();
  return deny(res, `Forbidden: Missing permission "${codes.join('" or "')}"`);
};

requirePermission.all = (...codes) => (req, res, next) => {
  if (!req.user) return noUser(res);
  const perms = req.user.permissions || [];
  const missing = codes.filter((c) => !has(perms, c));
  return missing.length ? deny(res, `Forbidden: Missing permission "${missing.join('", "')}"`) : next();
};

requirePermission.orRoles = (roles, ...codes) => (req, res, next) => {
  if (!req.user) return noUser(res);
  if (roles.includes(req.user.role)) return next();
  const perms = req.user.permissions || [];
  if (codes.some((c) => has(perms, c))) return next();
  return deny(res, `Forbidden: Missing permission "${codes.join('" or "')}"`);
};

module.exports = requirePermission;