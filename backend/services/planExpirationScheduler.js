import cron from 'node-cron';
import Membership from '../models/Membership.js';
import Package from '../models/Package.js';
import User from '../models/User.js';
import Notification from '../models/Notification.js';
import { sendPlanExpirationEmail } from '../utils/email.js';
import logger from '../utils/logger.js';

/**
 * Checks for active memberships completing/expiring within 3 days (or already expired)
 * and dispatches customized email notifications with current plan completion details
 * and newly available plans in the system.
 */
export const checkAndNotifyExpiringMemberships = async () => {
  try {
    logger.info('🔍 Running plan expiration check and notification service...');

    const now = new Date();
    // 3 days from now threshold
    const threeDaysFromNow = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);

    // Auto-expire active memberships whose endDate has passed
    await Membership.updateMany(
      { status: 'ACTIVE', endDate: { $lte: now } },
      { status: 'EXPIRED' }
    ).catch(() => {});

    // Find memberships completing/expiring within 3 days or recently expired, not yet notified
    const expiringMemberships = await Membership.find({
      $or: [
        { status: 'ACTIVE', endDate: { $lte: threeDaysFromNow } },
        { status: 'EXPIRED', endDate: { $gte: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000) } }
      ],
      expirationNotified: { $ne: true },
    })
      .populate('memberId')
      .populate('userId')
      .populate('packageId');

    if (expiringMemberships.length === 0) {
      logger.info('ℹ️ No expiring memberships requiring notification at this time.');
      return { success: true, processedCount: 0, notifiedCount: 0 };
    }

    // Fetch all currently active packages available in the system
    const availablePackages = await Package.find({ isActive: { $ne: false } }).sort({ price: 1 });

    let notifiedCount = 0;

    for (const membership of expiringMemberships) {
      const user = membership.memberId || membership.userId;
      if (!user || !user.email) {
        continue;
      }

      const pkg = membership.packageId;
      const packageName = pkg?.name || 'Gym Package';
      const duration = pkg?.duration || '1 Month';
      const price = pkg?.price || 0;

      const membershipDetails = {
        packageName,
        endDate: membership.endDate,
        startDate: membership.startDate,
        duration,
        price,
      };

      const completionDateStr = new Date(membership.endDate).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });

      // 1. Send Email Notification
      await sendPlanExpirationEmail(
        user.email,
        user.name || `${user.firstName || ''} ${user.lastName || ''}`.trim() || 'Valued Member',
        membershipDetails,
        availablePackages
      );

      // 2. Dispatch In-App Notification
      await Notification.create({
        title: 'Gym Membership Completes Soon ⏰',
        message: `Your active plan (${packageName}) completes on ${completionDateStr}. Check out available new plans & renew your membership today!`,
        type: 'warning',
        pinned: true,
        createdBy: 'System',
      }).catch((err) => logger.warn(`In-app notification error: ${err.message}`));

      // 3. Mark Membership as Notified
      membership.expirationNotified = true;
      membership.expirationNotifiedAt = new Date();
      await membership.save();

      notifiedCount++;
    }

    logger.info(`✅ Plan expiration notifications sent to ${notifiedCount} member(s).`);
    return { success: true, processedCount: expiringMemberships.length, notifiedCount };
  } catch (error) {
    logger.error(`❌ Error in planExpirationScheduler: ${error.message}`);
    return { success: false, error: error.message };
  }
};

/**
 * Starts the cron scheduler for plan expiration notifications.
 */
export const startPlanExpirationScheduler = ({ runOnStart = false } = {}) => {
  const cronExpression = process.env.EXPIRATION_CRON_SCHEDULE || '0 8 * * *'; // Daily at 8:00 AM

  logger.info(`⏰ Initializing Plan Expiration Scheduler [Schedule: "${cronExpression}"]`);

  cron.schedule(cronExpression, async () => {
    logger.info('⏰ Executing scheduled daily plan expiration notification check...');
    await checkAndNotifyExpiringMemberships();
  });

  if (runOnStart) {
    logger.info('🚀 Executing initial plan expiration notification check on server start...');
    checkAndNotifyExpiringMemberships();
  }
};

export default {
  checkAndNotifyExpiringMemberships,
  startPlanExpirationScheduler,
};
