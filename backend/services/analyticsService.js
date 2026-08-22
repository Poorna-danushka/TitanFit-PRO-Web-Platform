import logger from '../utils/logger.js';

class AnalyticsService {
  /**
   * Calculate member retention rate
   */
  async calculateRetentionRate(Membership) {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const newMembers = await Membership.countDocuments({
      createdAt: { $gte: thirtyDaysAgo },
    });

    const activeMembers = await Membership.countDocuments({
      status: 'ACTIVE',
      createdAt: { $lt: thirtyDaysAgo },
    });

    const retentionRate = activeMembers > 0 ? (activeMembers / (activeMembers + newMembers)) * 100 : 0;

    return {
      newMembers,
      activeMembers,
      retentionRate: retentionRate.toFixed(2),
    };
  }

  /**
   * Calculate average revenue per member
   */
  async calculateARPM(Membership) {
    const result = await Membership.aggregate([
      {
        $group: {
          _id: null,
          totalRevenue: { $sum: '$price' },
          memberCount: { $sum: 1 },
        },
      },
    ]);

    if (result.length === 0) {
      return { arpm: 0, totalRevenue: 0, memberCount: 0 };
    }

    const { totalRevenue, memberCount } = result[0];
    const arpm = memberCount > 0 ? totalRevenue / memberCount : 0;

    return {
      arpm: arpm.toFixed(2),
      totalRevenue,
      memberCount,
    };
  }

  /**
   * Get monthly revenue trend
   */
  async getMonthlyRevenueTrend(Membership, months = 6) {
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - months);

    const trend = await Membership.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate },
        },
      },
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' },
          },
          revenue: { $sum: '$price' },
          count: { $sum: 1 },
        },
      },
      {
        $sort: { '_id.year': 1, '_id.month': 1 },
      },
    ]);

    return trend;
  }

  /**
   * Get popular classes
   */
  async getPopularClasses(ClassBooking, limit = 5) {
    const popular = await ClassBooking.aggregate([
      {
        $match: { status: 'CONFIRMED' },
      },
      {
        $group: {
          _id: '$classId',
          bookings: { $sum: 1 },
        },
      },
      {
        $sort: { bookings: -1 },
      },
      {
        $limit: limit,
      },
      {
        $lookup: {
          from: 'gymclasses',
          localField: '_id',
          foreignField: '_id',
          as: 'classInfo',
        },
      },
    ]);

    return popular;
  }

  /**
   * Get peak gym hours
   */
  async getPeakGymHours(Attendance, days = 7) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const peakHours = await Attendance.aggregate([
      {
        $match: {
          checkInTime: { $gte: startDate },
        },
      },
      {
        $group: {
          _id: {
            $hour: '$checkInTime',
          },
          count: { $sum: 1 },
        },
      },
      {
        $sort: { count: -1 },
      },
    ]);

    return peakHours;
  }

  /**
   * Get member engagement metrics
   */
  async getMemberEngagementMetrics(Attendance, User) {
    const totalMembers = await User.countDocuments({ role: 'MEMBER' });
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const activeMembers = await Attendance.distinct('userId', {
      checkInTime: { $gte: thirtyDaysAgo },
    });

    const engagementRate = totalMembers > 0 ? (activeMembers.length / totalMembers) * 100 : 0;

    return {
      totalMembers,
      activeMembers: activeMembers.length,
      engagementRate: engagementRate.toFixed(2),
    };
  }

  /**
   * Get trainer performance metrics
   */
  async getTrainerPerformanceMetrics(PersonalTrainingBooking, TrainerProfile) {
    const performance = await PersonalTrainingBooking.aggregate([
      {
        $match: { status: 'CONFIRMED' },
      },
      {
        $group: {
          _id: '$trainerId',
          totalSessions: { $sum: 1 },
          averageRating: { $avg: '$rating' },
        },
      },
      {
        $lookup: {
          from: 'trainerprofiles',
          localField: '_id',
          foreignField: 'userId',
          as: 'trainerInfo',
        },
      },
      {
        $sort: { totalSessions: -1 },
      },
    ]);

    return performance;
  }

  /**
   * Log analytics event
   */
  logAnalyticsEvent(eventType, data) {
    logger.info(`Analytics Event: ${eventType}`, data);
  }
}

export const analyticsService = new AnalyticsService();
