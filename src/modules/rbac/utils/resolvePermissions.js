/**
 * user must be populated with:
 *   role (with role.permissions populated), extra_permissions, denied_permissions
 * Returns array of permission codes. super_admin => ['*'].
 */
function resolvePermissions(user) {
  if (!user || !user.role) return [];
  if (user.role.name === 'super_admin') return ['*'];

  const set = new Set((user.role.permissions || []).map((p) => p.code));
  (user.extra_permissions || []).forEach((p) => set.add(p.code));
  (user.denied_permissions || []).forEach((p) => set.delete(p.code));
  return [...set];
}

// Reusable populate options
resolvePermissions.POPULATE = [
  { path: 'role', select: 'name permissions', populate: { path: 'permissions', select: 'code' } },
  { path: 'extra_permissions', select: 'code' },
  { path: 'denied_permissions', select: 'code' },
];

module.exports = resolvePermissions;