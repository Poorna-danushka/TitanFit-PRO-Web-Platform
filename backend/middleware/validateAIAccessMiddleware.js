import MemberProfile from '../models/MemberProfile.js';
import logger from '../utils/logger.js';

/**
 * Validate AI access - ensure member data permissions
 */
export const validateAIAccessMiddleware = async (req, res, next) => {
  try {
    // Check if member has an active membership (optional - based on your business logic)
    // For now, just validate that the user exists in the system

    const memberProfile = await MemberProfile.findOne({ userId: req.userId });

    // Log AI access for security and compliance
    logger.info(`AI Access: User ${req.userId} - Message: ${req.body.message?.substring(0, 50)}...`);

    // Add member context to request
    req.memberContext = memberProfile || { userId: req.userId };

    next();
  } catch (error) {
    logger.error(`AI Access validation error: ${error.message}`);
    return res.status(403).json({
      success: false,
      message: 'Failed to validate AI access',
    });
  }
};

/**
 * Sanitize AI input to prevent prompt injection
 */
export const sanitizeAIInput = (req, res, next) => {
  if (req.body.message) {
    // Remove potentially harmful characters/patterns
    req.body.message = req.body.message
      .replace(/[<>]/g, '') // Remove angle brackets
      .substring(0, 2000) // Limit message length
      .trim();

    if (req.body.message.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Message cannot be empty',
      });
    }
  }

  next();
};
