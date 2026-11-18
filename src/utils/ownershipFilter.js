// utils/ownershipFilter.js

/**
 * Builds a MongoDB filter based on user role and ownership.
 * - Faculty: filter.{ownerField} = user.id
 * - Super Admin / Office Staff: No filter (see all), but can filter by owner if passed in query.
 * 
 * @param {Object} user - req.user
 * @param {String} ownerField - 'faculty_id' or 'created_by'
 * @param {Object} query - req.query
 * @returns {Object} MongoDB filter object
 */
function buildOwnershipFilter(user, ownerField = 'faculty_id', query = {}) {
  const filter = {};

  if (!user) return filter;

  // Super Admin / Office Staff → see everything
  if (user.role === 'super_admin' || user.role === 'office_staff') {
    if (query[ownerField]) {
      filter[ownerField] = query[ownerField];
    }
    return filter;
  }

  // Faculty → only their own records
  if (user.role === 'faculty') {
    filter[ownerField] = user.id;
    return filter;
  }

  // Other roles (student) → no access by default
  throw {
    statusCode: 403,
    message: 'You are not authorized to access this resource.',
  };
}

module.exports = { buildOwnershipFilter };