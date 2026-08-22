import crypto from 'crypto';
import logger from '../utils/logger.js';

/**
 * Generate a random CSRF token
 */
export const generateCsrfToken = () => {
  return crypto.randomBytes(32).toString('hex');
};

/**
 * CSRF Protection Middleware
 * Validates X-CSRF-Token header against CSRF cookie on mutating HTTP requests.
 * Exempts initial auth bootstrap endpoints (/login, /register, /csrf-token).
 */
export const csrfMiddleware = (req, res, next) => {
  // Safe HTTP methods do not require CSRF validation
  const safeMethods = ['GET', 'HEAD', 'OPTIONS'];
  if (safeMethods.includes(req.method)) {
    return next();
  }

  // Exempt unauthenticated auth endpoints & public webhooks
  const exemptPaths = [
    '/auth/login',
    '/auth/register',
    '/auth/csrf-token',
    '/auth/verify-email',
    '/auth/resend-verification',
    '/webhook',
  ];

  if (exemptPaths.some((path) => req.originalUrl.includes(path))) {
    return next();
  }

  const csrfCookie = req.cookies?.['XSRF-TOKEN'];
  const csrfHeader = req.headers['x-csrf-token'] || req.headers['x-xsrf-token'];

  if (!csrfCookie || !csrfHeader || csrfCookie !== csrfHeader) {
    logger.warn(`CSRF validation failed for ${req.method} ${req.originalUrl} - IP: ${req.ip}`);
    return res.status(403).json({
      success: false,
      message: 'CSRF validation failed. Invalid or missing X-CSRF-Token header.',
    });
  }

  next();
};
