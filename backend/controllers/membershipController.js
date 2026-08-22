import Membership from '../models/Membership.js';
import MembershipPlan from '../models/MembershipPlan.js';
import User from '../models/User.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { NotFoundError, ValidationError, ConflictError } from '../utils/errors.js';
import logger from '../utils/logger.js';
import { HTTP_STATUS, SUCCESS_MESSAGES, ERROR_MESSAGES } from '../constants/index.js';

/**
 * Get all membership plans
 * GET /api/v1/memberships/plans
 */
export const getMembershipPlans = asyncHandler(async (req, res) => {
  const plans = await MembershipPlan.find({ isActive: true });

  res.status(HTTP_STATUS.OK).json({
    success: true,
    data: plans,
  });
});

/**
 * Create membership plan (admin only)
 * POST /api/v1/memberships/plans
 */
export const createMembershipPlan = asyncHandler(async (req, res) => {
  const { name, price, durationDays, description, features } = req.body;

  const existingPlan = await MembershipPlan.findOne({ name });
  if (existingPlan) {
    throw new ConflictError('Membership plan already exists');
  }

  const plan = new MembershipPlan({
    name,
    price,
    durationDays,
    description,
    features,
  });

  await plan.save();

  logger.info(`Membership plan created: ${plan._id}`);

  res.status(HTTP_STATUS.CREATED).json({
    success: true,
    message: 'Membership plan created successfully',
    data: plan,
  });
});

/**
 * Update membership plan (admin only)
 * PUT /api/v1/memberships/plans/:planId
 */
export const updateMembershipPlan = asyncHandler(async (req, res) => {
  const { planId } = req.params;
  const { name, price, durationDays, description, features, isActive } = req.body;

  const plan = await MembershipPlan.findByIdAndUpdate(
    planId,
    { name, price, durationDays, description, features, isActive },
    { new: true, runValidators: true }
  );

  if (!plan) {
    throw new NotFoundError('Membership Plan');
  }

  logger.info(`Membership plan updated: ${planId}`);

  res.status(HTTP_STATUS.OK).json({
    success: true,
    message: SUCCESS_MESSAGES.PROFILE_UPDATED,
    data: plan,
  });
});

/**
 * Purchase membership
 * POST /api/v1/memberships/purchase
 */
export const purchaseMembership = asyncHandler(async (req, res) => {
  const { planId, paymentMethodId } = req.body;

  const plan = await MembershipPlan.findById(planId);
  if (!plan) {
    throw new NotFoundError('Membership Plan');
  }

  const existingMembership = await Membership.findOne({
    userId: req.userId,
    status: 'ACTIVE',
  });

  if (existingMembership && existingMembership.endDate > new Date()) {
    throw new ConflictError('Member already has an active membership');
  }

  const startDate = new Date();
  const endDate = new Date();
  endDate.setDate(endDate.getDate() + plan.durationDays);

  const membership = new Membership({
    userId: req.userId,
    planId,
    startDate,
    endDate,
    status: 'ACTIVE',
    paymentMethodId,
    price: plan.price,
  });

  await membership.save();

  logger.info(`Membership purchased: ${membership._id} by user ${req.userId}`);

  res.status(HTTP_STATUS.CREATED).json({
    success: true,
    message: SUCCESS_MESSAGES.SUBSCRIPTION_CREATED,
    data: membership,
  });
});

/**
 * Get member's membership
 * GET /api/v1/memberships/my-membership
 */
export const getMyMembership = asyncHandler(async (req, res) => {
  const membership = await Membership.findOne({ userId: req.userId })
    .populate('planId')
    .sort({ createdAt: -1 });

  if (!membership) {
    return res.status(HTTP_STATUS.OK).json({
      success: true,
      data: null,
      message: 'No active membership found',
    });
  }

  res.status(HTTP_STATUS.OK).json({
    success: true,
    data: membership,
  });
});

/**
 * Renew membership
 * POST /api/v1/memberships/renew
 */
export const renewMembership = asyncHandler(async (req, res) => {
  const { planId, paymentMethodId } = req.body;

  const plan = await MembershipPlan.findById(planId);
  if (!plan) {
    throw new NotFoundError('Membership Plan');
  }

  const currentMembership = await Membership.findOne({
    userId: req.userId,
  }).sort({ createdAt: -1 });

  if (!currentMembership) {
    throw new NotFoundError('Membership');
  }

  const startDate = new Date();
  const endDate = new Date();
  endDate.setDate(endDate.getDate() + plan.durationDays);

  const newMembership = new Membership({
    userId: req.userId,
    planId,
    startDate,
    endDate,
    status: 'ACTIVE',
    paymentMethodId,
    price: plan.price,
  });

  await newMembership.save();

  logger.info(`Membership renewed: ${newMembership._id} for user ${req.userId}`);

  res.status(HTTP_STATUS.CREATED).json({
    success: true,
    message: 'Membership renewed successfully',
    data: newMembership,
  });
});

/**
 * Cancel membership
 * POST /api/v1/memberships/cancel
 */
export const cancelMembership = asyncHandler(async (req, res) => {
  const membership = await Membership.findOneAndUpdate(
    { userId: req.userId, status: 'ACTIVE' },
    { status: 'CANCELLED', endDate: new Date() },
    { new: true }
  );

  if (!membership) {
    throw new NotFoundError('Active Membership');
  }

  logger.info(`Membership cancelled: ${membership._id}`);

  res.status(HTTP_STATUS.OK).json({
    success: true,
    message: SUCCESS_MESSAGES.SUBSCRIPTION_CANCELLED,
    data: membership,
  });
});

/**
 * Get all memberships (admin only)
 * GET /api/v1/memberships/admin/all
 */
export const getAllMemberships = asyncHandler(async (req, res) => {
  const { page = 1, limit = 10, status, userId } = req.query;
  const skip = (page - 1) * limit;

  let query = {};
  if (status) query.status = status;
  if (userId) query.userId = userId;

  const memberships = await Membership.find(query)
    .populate('userId', 'firstName lastName email')
    .populate('planId')
    .skip(skip)
    .limit(parseInt(limit))
    .sort({ createdAt: -1 });

  const total = await Membership.countDocuments(query);

  res.status(HTTP_STATUS.OK).json({
    success: true,
    data: memberships,
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total,
      pages: Math.ceil(total / limit),
    },
  });
});
