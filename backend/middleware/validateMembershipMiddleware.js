import Membership from '../models/Membership.js';
import { ForbiddenError } from '../utils/errors.js';

/**
 * Validate if user has an active membership
 */
export const validateMembershipMiddleware = async (req, res, next) => {
  try {
    const membership = await Membership.findOne({
      userId: req.userId,
      status: 'ACTIVE',
      endDate: { $gt: new Date() },
    });

    if (!membership) {
      return res.status(403).json({
        success: false,
        message: 'Active membership required for this action',
      });
    }

    req.membership = membership;
    next();
  } catch (error) {
    return res.status(403).json({
      success: false,
      message: 'Access forbidden',
    });
  }
};
