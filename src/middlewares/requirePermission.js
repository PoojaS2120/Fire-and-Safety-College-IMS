const User = require('../modules/auth/models/User');

module.exports = (requiredPermission) => {
  return async (req, res, next) => {
    try {
      const user = await User.findById(req.user.id).populate({
        path: 'role',
        populate: { path: 'permissions' }
      });

      if (!user) return res.status(401).json({ success: false, message: 'User not found' });

      // Super Admin bypasses all checks automatically
      if (user.role.name === 'super_admin') return next();

      const hasPermission = user.role.permissions.some(p => p.code === requiredPermission);

      if (!hasPermission) {
        return res.status(403).json({ 
          success: false, 
          message: `Forbidden: Missing permission "${requiredPermission}"` 
        });
      }
      next();
    } catch (err) {
      next(err);
    }
  };
};