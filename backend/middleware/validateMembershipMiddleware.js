import { checkUserMembershipStatus } from '../utils/membershipHelper.js';

/**
 * Validate if user has an active membership
 * If user has no active membership and a bank transfer is awaiting verification,
 * returns HTTP 403 with code PENDING_VERIFICATION and standardized message.
 */
export const validateMembershipMiddleware = async (req, res, next) => {
  try {
    const userId = req.userId || req.user?._id;
    if (!userId) {
      return res.status(401).json({
        success: false,
        code: 'UNAUTHORIZED',
        message: 'Authentication required.',
      });
    }

    const status = await checkUserMembershipStatus(userId);

    if (status.hasActiveMembership) {
      req.membership = status.membership;
      return next();
    }

    if (status.isPendingVerification) {
      return res.status(403).json({
        success: false,
        code: 'PENDING_VERIFICATION',
        message: 'Your bank transfer is awaiting administrator verification.',
      });
    }

    return res.status(403).json({
      success: false,
      code: 'MEMBERSHIP_REQUIRED',
      message: 'Active membership required for this action',
    });
  } catch (error) {
    return res.status(403).json({
      success: false,
      message: 'Access forbidden',
      error: error.message,
    });
  }
};

