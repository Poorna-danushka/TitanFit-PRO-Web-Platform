import Membership from '../models/Membership.js';
import Purchase from '../models/Purchase.js';

/**
 * Authoritative central helper to determine user's membership and pending bank transfer status.
 *
 * Rules:
 * - Active Membership: A valid Membership record with status === 'ACTIVE' and endDate > now.
 * - Pending Bank Transfer: A Purchase with paymentMethod === 'bank_transfer' and
 *   status in ['pending_approval', 'pending_verification', 'pending'].
 * - An existing active membership is NOT revoked or replaced by a pending bank transfer purchase.
 *
 * @param {string|Object} userId
 * @returns {Promise<{
 *   hasActiveMembership: boolean,
 *   isPendingVerification: boolean,
 *   membership: Object|null,
 *   pendingPurchase: Object|null,
 *   reason: string|null,
 *   message: string|null
 * }>}
 */
export const checkUserMembershipStatus = async (userId) => {
  if (!userId) {
    return {
      hasActiveMembership: false,
      isPendingVerification: false,
      membership: null,
      pendingPurchase: null,
      reason: 'UNAUTHENTICATED',
      message: 'Authentication required.',
    };
  }

  const now = new Date();

  // Step A: Find the user's latest valid ACTIVE membership
  const activeMembership = await Membership.findOne({
    $or: [{ userId }, { memberId: userId }],
    status: 'ACTIVE',
    endDate: { $gt: now },
  })
    .populate('packageId')
    .populate('planId')
    .sort({ createdAt: -1 });

  // Step B: Find pending bank-transfer purchases awaiting admin verification
  const pendingBankTransfer = await Purchase.findOne({
    userId,
    paymentMethod: 'bank_transfer',
    status: { $in: ['pending_approval', 'pending_verification', 'pending'] },
  })
    .populate('packageId')
    .populate('paymentId')
    .sort({ createdAt: -1 });

  const hasActive = Boolean(activeMembership);
  const isPending = Boolean(pendingBankTransfer);

  let reason = null;
  let message = null;

  if (!hasActive && isPending) {
    reason = 'PENDING_VERIFICATION';
    message = 'Your bank transfer is awaiting administrator verification.';
  } else if (!hasActive && !isPending) {
    reason = 'NO_ACTIVE_MEMBERSHIP';
    message = 'Active membership required for this action';
  }

  return {
    hasActiveMembership: hasActive,
    isPendingVerification: isPending,
    membership: activeMembership || null,
    pendingPurchase: pendingBankTransfer || null,
    reason,
    message,
  };
};

export default {
  checkUserMembershipStatus,
};
