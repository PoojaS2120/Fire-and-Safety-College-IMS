exports.authorize = (...allowedRoles) => {
  return (req, res, next) => {
    // Check if user exists on request (set by verifyToken)
    if (!req.user) {
      return res.status(401).json({ 
        success: false, 
        message: 'Unauthorized: User not found' 
      });
    }

    // Check if the user's role is in the allowed roles
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ 
        success: false, 
        code: 'FORBIDDEN', 
        message: 'You do not have permission to perform this action' 
      });
    }

    next();
  };
};