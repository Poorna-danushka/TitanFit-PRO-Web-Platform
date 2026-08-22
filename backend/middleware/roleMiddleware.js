import { ForbiddenError } from '../utils/errors.js';

/**
 * Role-based access control middleware
 */
export const roleMiddleware = (allowedRoles) => {
  return async (req, res, next) => {
    try {
      const User = (await import('../models/User.js')).default;
      const user = await User.findById(req.userId);

      if (!user || !allowedRoles.includes(user.role)) {
        return res.status(403).json({
          success: false,
          message: 'Insufficient permissions for this action',
        });
      }

      req.user = user;
      next();
    } catch (error) {
      return res.status(403).json({
        success: false,
        message: 'Access forbidden',
      });
    }
  };
};

/**
 * Trainer or Admin only middleware
 */
export const trainerOrAdminMiddleware = roleMiddleware(['TRAINER', 'ADMIN']);

/**
 * Admin only middleware (already exists in admin.js, but adding alias here)
 */
export const requireAdmin = roleMiddleware(['ADMIN']);

/**
 * Staff or Admin middleware
 */
export const staffOrAdminMiddleware = roleMiddleware(['STAFF', 'ADMIN']);
