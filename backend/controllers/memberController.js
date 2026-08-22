import MemberProfile from '../models/MemberProfile.js';
import User from '../models/User.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { NotFoundError, ValidationError } from '../utils/errors.js';
import logger from '../utils/logger.js';
import { HTTP_STATUS, SUCCESS_MESSAGES, ERROR_MESSAGES } from '../constants/index.js';

/**
 * Get member profile
 * GET /api/v1/members/profile
 */
export const getMemberProfile = asyncHandler(async (req, res) => {
  const memberProfile = await MemberProfile.findOne({ userId: req.userId }).populate('userId', 'firstName lastName email phone profileImage');
  
  if (!memberProfile) {
    return res.status(HTTP_STATUS.NOT_FOUND).json({
      success: false,
      message: 'Member profile not found',
    });
  }

  res.status(HTTP_STATUS.OK).json({
    success: true,
    data: memberProfile,
  });
});

/**
 * Update member profile
 * PUT /api/v1/members/profile
 */
export const updateMemberProfile = asyncHandler(async (req, res) => {
  const { height, weight, bloodType, allergies, medicalConditions, emergencyContact, emergencyContactPhone, goals, fitnessLevel, preferences } = req.body;

  let memberProfile = await MemberProfile.findOne({ userId: req.userId });
  
  if (!memberProfile) {
    memberProfile = new MemberProfile({ userId: req.userId });
  }

  if (height) memberProfile.height = height;
  if (weight) memberProfile.weight = weight;
  if (bloodType) memberProfile.bloodType = bloodType;
  if (allergies) memberProfile.allergies = allergies;
  if (medicalConditions) memberProfile.medicalConditions = medicalConditions;
  if (emergencyContact) memberProfile.emergencyContact = emergencyContact;
  if (emergencyContactPhone) memberProfile.emergencyContactPhone = emergencyContactPhone;
  if (goals) memberProfile.goals = goals;
  if (fitnessLevel) memberProfile.fitnessLevel = fitnessLevel;
  if (preferences) memberProfile.preferences = { ...memberProfile.preferences, ...preferences };

  await memberProfile.save();

  logger.info(`Member profile updated: ${req.userId}`);

  res.status(HTTP_STATUS.OK).json({
    success: true,
    message: SUCCESS_MESSAGES.PROFILE_UPDATED,
    data: memberProfile,
  });
});

/**
 * Get member by ID (admin only)
 * GET /api/v1/members/:memberId
 */
export const getMember = asyncHandler(async (req, res) => {
  const { memberId } = req.params;

  const user = await User.findById(memberId);
  const memberProfile = await MemberProfile.findOne({ userId: memberId });

  if (!user || !memberProfile) {
    throw new NotFoundError('Member');
  }

  res.status(HTTP_STATUS.OK).json({
    success: true,
    data: {
      user,
      profile: memberProfile,
    },
  });
});

/**
 * List all members (admin only)
 * GET /api/v1/members
 */
export const listMembers = asyncHandler(async (req, res) => {
  const { page = 1, limit = 10, search } = req.query;
  const skip = (page - 1) * limit;

  let query = { role: 'MEMBER' };
  
  if (search) {
    query.$or = [
      { firstName: { $regex: search, $options: 'i' } },
      { lastName: { $regex: search, $options: 'i' } },
      { email: { $regex: search, $options: 'i' } },
    ];
  }

  const members = await User.find(query)
    .skip(skip)
    .limit(parseInt(limit));

  const total = await User.countDocuments(query);

  res.status(HTTP_STATUS.OK).json({
    success: true,
    data: members,
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total,
      pages: Math.ceil(total / limit),
    },
  });
});

/**
 * Delete member (soft delete)
 * DELETE /api/v1/members/:memberId
 */
export const deleteMember = asyncHandler(async (req, res) => {
  const { memberId } = req.params;

  const user = await User.findByIdAndUpdate(
    memberId,
    { deletedAt: new Date() },
    { new: true }
  );

  if (!user) {
    throw new NotFoundError('Member');
  }

  logger.info(`Member deleted (soft): ${memberId}`);

  res.status(HTTP_STATUS.OK).json({
    success: true,
    message: 'Member deleted successfully',
  });
});
