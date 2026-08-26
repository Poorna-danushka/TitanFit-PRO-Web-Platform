import Membership from '../models/Membership.js';
import Package from '../models/Package.js';
import MembershipPlan from '../models/MembershipPlan.js';
import User from '../models/User.js';
import TrainerAssignment from '../models/TrainerAssignment.js';
import TrainerProfile from '../models/TrainerProfile.js';
import { checkUserMembershipStatus } from './membershipHelper.js';

/**
 * Authoritative check helper to determine if a Plan or Package includes Personal Trainer
 * @param {Object| null} plan - Package or MembershipPlan document
 * @returns {boolean}
 */
export const checkPlanIncludesPT = (plan) => {
  if (!plan) return false;
  if (plan.hasPersonalTrainer === true) return true;
  if (plan.maxPTSessions > 0 || plan.maxPTSessionsPerMonth > 0) return true;

  const features = Array.isArray(plan.features) ? plan.features : [];
  const benefits = Array.isArray(plan.benefits) ? plan.benefits : [];
  const allTags = [...features, ...benefits].join(' ').toLowerCase();

  if (/(personal trainer|1-on-1 personal trainer|dedicated coach|pt sessions)/i.test(allTags)) return true;
  if (/(trainer|vip|elite coaching)/i.test(plan.name || '')) return true;

  return false;
};

/**
 * Authoritative backend check: Does this user have active Personal Trainer access?
 * 
 * Rules enforced:
 * 1. User exists
 * 2. User has an active approved membership (status === 'ACTIVE' and not expired)
 * 3. Populated purchased package/plan includes Personal Trainer
 * 4. Pending bank transfer purchases do not grant PT access.
 * 
 * @param {string|Object} userId
 * @returns {Promise<{
 *   hasAccess: boolean,
 *   hasTrainer: boolean,
 *   isPendingVerification?: boolean,
 *   reason?: string,
 *   message?: string,
 *   planName?: string,
 *   membershipId?: string,
 *   packageId?: string,
 *   membership?: Object,
 *   trainer?: Object,
 *   features: { personalTrainer: boolean }
 * }>}
 */
export const hasPersonalTrainerAccess = async (userId) => {
  if (!userId) {
    return {
      hasAccess: false,
      hasTrainer: false,
      isPendingVerification: false,
      reason: 'UNAUTHENTICATED',
      message: 'Authentication required.',
      features: { personalTrainer: false },
    };
  }

  const membershipStatus = await checkUserMembershipStatus(userId);

  if (!membershipStatus.hasActiveMembership) {
    if (membershipStatus.isPendingVerification) {
      return {
        hasAccess: false,
        hasTrainer: false,
        isPendingVerification: true,
        reason: 'PENDING_VERIFICATION',
        message: 'Your bank transfer is awaiting administrator verification.',
        features: { personalTrainer: false },
      };
    }

    return {
      hasAccess: false,
      hasTrainer: false,
      isPendingVerification: false,
      reason: 'NO_ACTIVE_MEMBERSHIP',
      message: 'Active membership required for this action',
      features: { personalTrainer: false },
    };
  }

  const membership = membershipStatus.membership;
  const now = new Date();

  // Ensure start date is valid (if specified)
  if (membership.startDate && new Date(membership.startDate) > now) {
    return {
      hasAccess: false,
      hasTrainer: false,
      reason: 'MEMBERSHIP_NOT_STARTED',
      features: { personalTrainer: false },
    };
  }

  // Ensure payment is successful if paymentStatus field is tracked on membership
  if (membership.paymentStatus && !['PAID', 'COMPLETED', 'SUCCESS', 'APPROVED'].includes(membership.paymentStatus.toUpperCase())) {
    return {
      hasAccess: false,
      hasTrainer: false,
      reason: 'PAYMENT_NOT_COMPLETED',
      features: { personalTrainer: false },
    };
  }

  // Extract purchased package / plan
  const purchasedPlan = membership.packageId || membership.planId;
  const isPTIncluded = checkPlanIncludesPT(purchasedPlan);

  if (!isPTIncluded) {
    return {
      hasAccess: false,
      hasTrainer: false,
      reason: 'PLAN_DOES_NOT_INCLUDE_PT',
      planName: purchasedPlan?.name || 'Standard Plan',
      membershipId: membership._id,
      packageId: purchasedPlan?._id,
      features: { personalTrainer: false },
    };
  }

  // Check if member already selected a coach
  const assignment = await TrainerAssignment.findOne({
    memberId: userId,
    status: 'ACTIVE',
  }).populate('trainerId', 'firstName lastName email profileImage bio');

  let activeTrainer = null;
  if (assignment && assignment.trainerId) {
    const tUser = assignment.trainerId;
    const profile = await TrainerProfile.findOne({ userId: tUser._id });
    activeTrainer = {
      _id: profile?._id || tUser._id,
      userId: tUser._id,
      name: [tUser.firstName, tUser.lastName].filter(Boolean).join(' ') || 'Coach',
      email: tUser.email,
      profileImage: tUser.profileImage,
      specialization: profile?.specialization || ['Strength & Conditioning'],
      experience: profile?.experience || 4,
      rating: profile?.rating || 5.0,
      assignedAt: assignment.assignedAt,
    };
  }

  return {
    hasAccess: true,
    hasTrainer: Boolean(activeTrainer),
    planName: purchasedPlan?.name || 'Pro Plan',
    membershipId: membership._id,
    packageId: purchasedPlan?._id,
    membership: {
      _id: membership._id,
      planName: purchasedPlan?.name,
      startDate: membership.startDate,
      endDate: membership.endDate,
      ptSessionsUsed: membership.ptSessionsUsed || membership.ptSessionsUsedThisMonth || 0,
      maxPTSessions: purchasedPlan?.maxPTSessions || 8,
    },
    trainer: activeTrainer,
    features: {
      personalTrainer: true,
    },
  };
};
