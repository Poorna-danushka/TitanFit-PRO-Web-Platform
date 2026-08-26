import { asyncHandler } from '../utils/asyncHandler.js';
import { HTTP_STATUS } from '../constants/index.js';
import { hasPersonalTrainerAccess } from '../utils/entitlements.js';

/**
 * Middleware that strictly requires the authenticated user to have an active
 * membership whose purchased plan includes Personal Trainer.
 * If not, returns HTTP 403 Forbidden with a clear business message.
 */
export const requirePersonalTrainerAccess = asyncHandler(async (req, res, next) => {
  const userId = req.userId || req.user?._id;
  if (!userId) {
    return res.status(HTTP_STATUS.UNAUTHORIZED).json({
      success: false,
      code: 'UNAUTHORIZED',
      message: 'Authentication required.',
    });
  }

  const entitlement = await hasPersonalTrainerAccess(userId);

  if (!entitlement.hasAccess) {
    if (entitlement.isPendingVerification || entitlement.reason === 'PENDING_VERIFICATION') {
      return res.status(HTTP_STATUS.FORBIDDEN).json({
        success: false,
        code: 'PENDING_VERIFICATION',
        hasPersonalTrainerAccess: false,
        reason: 'PENDING_VERIFICATION',
        message: 'Your bank transfer is awaiting administrator verification.',
      });
    }

    return res.status(HTTP_STATUS.FORBIDDEN).json({
      success: false,
      code: 'PT_ENTITLEMENT_REQUIRED',
      hasPersonalTrainerAccess: false,
      reason: entitlement.reason || 'PLAN_DOES_NOT_INCLUDE_PT',
      message: 'Your current membership plan does not include Personal Trainer features.',
    });
  }

  // Attach verified entitlement data to request object
  req.ptEntitlement = entitlement;
  next();
});
