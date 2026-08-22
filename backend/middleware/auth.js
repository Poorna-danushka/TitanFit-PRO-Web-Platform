import { verifyAccessToken } from '../utils/jwt.js';
import { isTokenBlacklisted } from '../services/tokenBlacklistService.js';
import User from '../models/User.js';

/**
 * Verify JWT token middleware (Extracts from HTTP-Only cookie or Bearer header)
 */
export const authMiddleware = async (req, res, next) => {
  try {
    let token = req.cookies?.accessToken;

    if (!token) {
      const authHeader = req.headers.authorization;
      if (authHeader && authHeader.startsWith('Bearer ')) {
        token = authHeader.substring(7);
      }
    }

    if (!token) {
      return res.status(401).json({ success: false, message: 'Authentication required. No token provided.' });
    }

    // Check if token has been blacklisted / revoked
    const isRevoked = await isTokenBlacklisted(token);
    if (isRevoked) {
      return res.status(401).json({ success: false, message: 'Session revoked. Please log in again.' });
    }

    const decoded = verifyAccessToken(token);
    if (!decoded || decoded.type !== 'access') {
      return res.status(401).json({ success: false, message: 'Invalid or expired access token.' });
    }

    req.token = token;
    req.userId = decoded.userId;

    // Fetch user role & system admin status for fast authorization
    const user = await User.findById(decoded.userId).select('role isSystemAdmin isActive name email');
    if (!user || !user.isActive) {
      return res.status(401).json({ success: false, message: 'User account is inactive or not found.' });
    }

    req.user = user;
    req.userRole = (user.role || 'MEMBER').toUpperCase();
    next();
  } catch (error) {
    return res.status(401).json({ success: false, message: 'Invalid or expired token.' });
  }
};

/**
 * Flexible Multi-Role Middleware
 * Example: roleMiddleware(['ADMIN', 'STAFF'])
 */
export const roleMiddleware = (allowedRoles = []) => {
  return (req, res, next) => {
    if (!req.userRole) {
      return res.status(401).json({ success: false, message: 'Authentication required.' });
    }

    const isSystemAdmin = req.user?.isSystemAdmin || req.userRole === 'SYSTEM_ADMIN';
    if (isSystemAdmin) {
      return next(); // SYSTEM_ADMIN bypasses all role restrictions
    }

    const normalizedAllowed = allowedRoles.map(r => r.toUpperCase());
    if (normalizedAllowed.includes('ADMIN')) {
      normalizedAllowed.push('SYSTEM_ADMIN');
    }

    if (normalizedAllowed.length > 0 && !normalizedAllowed.includes(req.userRole)) {
      return res.status(403).json({
        success: false,
        message: `Forbidden. Requires one of the following roles: ${allowedRoles.join(', ')}`,
      });
    }

    next();
  };
};

/**
 * Admin-only middleware
 */
export const adminMiddleware = roleMiddleware(['ADMIN', 'SYSTEM_ADMIN']);

/**
 * Staff-or-Admin middleware
 */
export const staffOrAdminMiddleware = roleMiddleware(['STAFF', 'ADMIN', 'SYSTEM_ADMIN']);

/**
 * Trainer-or-Admin middleware
 */
export const trainerOrAdminMiddleware = roleMiddleware(['TRAINER', 'ADMIN', 'SYSTEM_ADMIN']);

/**
 * Optional auth middleware
 */
export const optionalAuth = async (req, res, next) => {
  try {
    let token = req.cookies?.accessToken;
    if (!token && req.headers.authorization?.startsWith('Bearer ')) {
      token = req.headers.authorization.substring(7);
    }
    if (token && !(await isTokenBlacklisted(token))) {
      const decoded = verifyAccessToken(token);
      req.userId = decoded.userId;
    }
    next();
  } catch (error) {
    next();
  }
};

export default authMiddleware;
