import User from '../models/User.js';
import Membership from '../models/Membership.js';
import Attendance from '../models/Attendance.js';
import PersonalTrainingBooking from '../models/PersonalTrainingBooking.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { NotFoundError } from '../utils/errors.js';
import logger from '../utils/logger.js';
import { HTTP_STATUS } from '../constants/index.js';

/**
 * Get admin dashboard stats
 * GET /api/v1/admin/dashboard
 */
export const getDashboardStats = asyncHandler(async (req, res) => {
  const totalMembers = await User.countDocuments({ role: 'MEMBER' });
  const totalTrainers = await User.countDocuments({ role: 'TRAINER' });
  const totalStaff = await User.countDocuments({ role: 'STAFF' });
  const activeMemberships = await Membership.countDocuments({ status: 'ACTIVE' });

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const todayAttendance = await Attendance.countDocuments({
    checkInTime: { $gte: today },
  });

  const totalPersonalTrainingBookings = await PersonalTrainingBooking.countDocuments({
    status: 'CONFIRMED',
  });

  res.status(HTTP_STATUS.OK).json({
    success: true,
    data: {
      totalMembers,
      totalTrainers,
      totalStaff,
      activeMemberships,
      todayAttendance,
      totalPersonalTrainingBookings,
    },
  });
});

/**
 * Get member analytics
 * GET /api/v1/admin/analytics/members
 */
export const getMemberAnalytics = asyncHandler(async (req, res) => {
  const { startDate, endDate } = req.query;

  let query = {};

  if (startDate || endDate) {
    query.createdAt = {};
    if (startDate) query.createdAt.$gte = new Date(startDate);
    if (endDate) {
      const end = new Date(endDate);
      end.setDate(end.getDate() + 1);
      query.createdAt.$lt = end;
    }
  }

  const monthlyRegistrations = await User.aggregate([
    { $match: { role: 'MEMBER', ...query } },
    {
      $group: {
        _id: {
          year: { $year: '$createdAt' },
          month: { $month: '$createdAt' },
        },
        count: { $sum: 1 },
      },
    },
    { $sort: { '_id.year': 1, '_id.month': 1 } },
  ]);

  const activeMembers = await Membership.countDocuments({ status: 'ACTIVE' });
  const expiredMembers = await Membership.countDocuments({ status: 'EXPIRED' });
  const cancelledMembers = await Membership.countDocuments({ status: 'CANCELLED' });

  res.status(HTTP_STATUS.OK).json({
    success: true,
    data: {
      monthlyRegistrations,
      activeMembers,
      expiredMembers,
      cancelledMembers,
    },
  });
});

/**
 * Get attendance analytics
 * GET /api/v1/admin/analytics/attendance
 */
export const getAttendanceAnalytics = asyncHandler(async (req, res) => {
  const { startDate, endDate } = req.query;

  let query = {};

  if (startDate || endDate) {
    query.checkInTime = {};
    if (startDate) query.checkInTime.$gte = new Date(startDate);
    if (endDate) {
      const end = new Date(endDate);
      end.setDate(end.getDate() + 1);
      query.checkInTime.$lt = end;
    }
  }

  const dailyAttendance = await Attendance.aggregate([
    { $match: query },
    {
      $group: {
        _id: {
          year: { $year: '$checkInTime' },
          month: { $month: '$checkInTime' },
          day: { $dayOfMonth: '$checkInTime' },
        },
        count: { $sum: 1 },
      },
    },
    { $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 } },
  ]);

  const uniqueMembers = await Attendance.distinct('userId', query);

  res.status(HTTP_STATUS.OK).json({
    success: true,
    data: {
      dailyAttendance,
      uniqueMembersCount: uniqueMembers.length,
    },
  });
});

/**
 * Get revenue analytics
 * GET /api/v1/admin/analytics/revenue
 */
export const getRevenueAnalytics = asyncHandler(async (req, res) => {
  const { startDate, endDate } = req.query;

  let query = {};

  if (startDate || endDate) {
    query.createdAt = {};
    if (startDate) query.createdAt.$gte = new Date(startDate);
    if (endDate) {
      const end = new Date(endDate);
      end.setDate(end.getDate() + 1);
      query.createdAt.$lt = end;
    }
  }

  const monthlyRevenue = await Membership.aggregate([
    { $match: query },
    {
      $group: {
        _id: {
          year: { $year: '$createdAt' },
          month: { $month: '$createdAt' },
        },
        totalRevenue: { $sum: '$price' },
        membershipCount: { $sum: 1 },
      },
    },
    { $sort: { '_id.year': 1, '_id.month': 1 } },
  ]);

  res.status(HTTP_STATUS.OK).json({
    success: true,
    data: monthlyRevenue,
  });
});

/**
 * Get user management list
 * GET /api/v1/admin/users
 */
export const getUserManagement = asyncHandler(async (req, res) => {
  const { page = 1, limit = 10, role, search } = req.query;
  const skip = (page - 1) * limit;

  let query = {};

  if (role) query.role = role;

  if (search) {
    query.$or = [
      { firstName: { $regex: search, $options: 'i' } },
      { lastName: { $regex: search, $options: 'i' } },
      { email: { $regex: search, $options: 'i' } },
    ];
  }

  const users = await User.find(query)
    .skip(skip)
    .limit(parseInt(limit))
    .select('-password');

  const total = await User.countDocuments(query);

  res.status(HTTP_STATUS.OK).json({
    success: true,
    data: users,
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total,
      pages: Math.ceil(total / limit),
    },
  });
});

/**
 * Update user role
 * PUT /api/v1/admin/users/:userId/role
 */
export const updateUserRole = asyncHandler(async (req, res) => {
  const { userId } = req.params;
  const { role } = req.body;

  const user = await User.findByIdAndUpdate(
    userId,
    { role },
    { new: true, runValidators: true }
  ).select('-password');

  if (!user) {
    throw new NotFoundError('User');
  }

  logger.info(`User role updated: ${userId} to ${role}`);

  res.status(HTTP_STATUS.OK).json({
    success: true,
    message: 'User role updated successfully',
    data: user,
  });
});

/**
 * Deactivate user account
 * PUT /api/v1/admin/users/:userId/deactivate
 */
export const deactivateUser = asyncHandler(async (req, res) => {
  const { userId } = req.params;

  const user = await User.findByIdAndUpdate(
    userId,
    { isActive: false },
    { new: true }
  ).select('-password');

  if (!user) {
    throw new NotFoundError('User');
  }

  logger.info(`User deactivated: ${userId}`);

  res.status(HTTP_STATUS.OK).json({
    success: true,
    message: 'User deactivated successfully',
    data: user,
  });
});

/**
 * Activate user account
 * PUT /api/v1/admin/users/:userId/activate
 */
export const activateUser = asyncHandler(async (req, res) => {
  const { userId } = req.params;

  const user = await User.findByIdAndUpdate(
    userId,
    { isActive: true },
    { new: true }
  ).select('-password');

  if (!user) {
    throw new NotFoundError('User');
  }

  logger.info(`User activated: ${userId}`);

  res.status(HTTP_STATUS.OK).json({
    success: true,
    message: 'User activated successfully',
    data: user,
  });
});

/**
 * Trigger plan expiration email notifications & package recommendation check manually
 * POST /api/v1/admin/trigger-expiration-notifications
 */
export const triggerExpirationNotifications = asyncHandler(async (req, res) => {
  const { checkAndNotifyExpiringMemberships } = await import('../services/planExpirationScheduler.js');
  const result = await checkAndNotifyExpiringMemberships();

  res.status(HTTP_STATUS.OK).json({
    success: true,
    message: 'Plan expiration notification check executed successfully.',
    data: result,
  });
});
