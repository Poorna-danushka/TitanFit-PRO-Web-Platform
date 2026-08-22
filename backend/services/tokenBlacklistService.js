import TokenBlacklist from '../models/TokenBlacklist.js';
import jwt from 'jsonwebtoken';
import logger from '../utils/logger.js';

/**
 * Blacklist a JWT token (on logout or revocation)
 */
export const blacklistToken = async (token, userId = null, reason = 'LOGOUT') => {
  if (!token) return;

  try {
    const decoded = jwt.decode(token);
    const expiresAt = decoded?.exp ? new Date(decoded.exp * 1000) : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    await TokenBlacklist.create({
      token,
      userId: userId || decoded?.userId || decoded?.id,
      reason,
      expiresAt,
    });
    logger.info(`Token blacklisted successfully for user: ${userId || 'unknown'}`);
  } catch (error) {
    if (error.code === 11000) {
      // Token already blacklisted
      return;
    }
    logger.error(`Error blacklisting token: ${error.message}`);
  }
};

/**
 * Check if a JWT token is blacklisted
 */
export const isTokenBlacklisted = async (token) => {
  if (!token) return false;
  try {
    const record = await TokenBlacklist.findOne({ token }).lean();
    return !!record;
  } catch (error) {
    logger.error(`Error checking token blacklist: ${error.message}`);
    return false;
  }
};
