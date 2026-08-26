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
/**
 * Calculates exact membership endDate based on package duration string or durationMonths / durationDays.
 */
export const calculateMembershipEndDate = (startDate = new Date(), pkg) => {
  const end = new Date(startDate);
  if (!pkg) {
    end.setMonth(end.getMonth() + 1);
    return end;
  }

  if (typeof pkg.durationMonths === 'number' && pkg.durationMonths > 0) {
    end.setMonth(end.getMonth() + pkg.durationMonths);
    return end;
  }

  if (typeof pkg.durationDays === 'number' && pkg.durationDays > 0) {
    end.setDate(end.getDate() + pkg.durationDays);
    return end;
  }

  const durationStr = String(pkg.duration || '').toLowerCase();

  if (durationStr.includes('year') || durationStr.includes('annual')) {
    const match = durationStr.match(/(\d+)\s*year/);
    const years = match ? parseInt(match[1]) : 1;
    end.setFullYear(end.getFullYear() + years);
  } else if (durationStr.includes('day')) {
    const match = durationStr.match(/(\d+)\s*day/);
    const days = match ? parseInt(match[1]) : 30;
    end.setDate(end.getDate() + days);
  } else if (durationStr.includes('month')) {
    const match = durationStr.match(/(\d+)\s*month/);
    const months = match ? parseInt(match[1]) : 1;
    end.setMonth(end.getMonth() + months);
  } else {
    // Default 1 month
    end.setMonth(end.getMonth() + 1);
  }

  return end;
};

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

  // Auto-expire active memberships whose endDate has passed
  await Membership.updateMany(
    { $or: [{ userId }, { memberId: userId }], status: 'ACTIVE', endDate: { $lte: now } },
    { status: 'EXPIRED' }
  ).catch(() => {});

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
  calculateMembershipEndDate,
};
