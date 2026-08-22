import nodemailer from 'nodemailer';
import logger from '../utils/logger.js';

class NotificationService {
  constructor() {
    this.transporter = null;
    this.initializeEmailTransport();
  }

  /**
   * Initialize email transport
   */
  initializeEmailTransport() {
    try {
      if (process.env.SMTP_HOST && process.env.SMTP_PORT) {
        this.transporter = nodemailer.createTransport({
          host: process.env.SMTP_HOST,
          port: parseInt(process.env.SMTP_PORT),
          secure: process.env.SMTP_SECURE === 'true',
          auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASSWORD,
          },
        });
        logger.info('✅ Email notification service initialized');
      }
    } catch (error) {
      logger.warn(`⚠️ Email notification service not available: ${error.message}`);
    }
  }

  /**
   * Send email notification
   */
  async sendEmail(to, subject, html) {
    if (!this.transporter) {
      logger.warn('Email service not configured');
      return false;
    }

    try {
      await this.transporter.sendMail({
        from: process.env.SMTP_FROM_EMAIL || 'noreply@gymfit.com',
        to,
        subject,
        html,
      });

      logger.info(`Email sent to ${to}: ${subject}`);
      return true;
    } catch (error) {
      logger.error(`Failed to send email: ${error.message}`);
      return false;
    }
  }

  /**
   * Send membership notification
   */
  async sendMembershipNotification(member, membership) {
    const html = `
      <h2>Membership Confirmation</h2>
      <p>Hello ${member.firstName},</p>
      <p>Your membership has been confirmed!</p>
      <p><strong>Plan:</strong> ${membership.planName}</p>
      <p><strong>Start Date:</strong> ${membership.startDate.toLocaleDateString()}</p>
      <p><strong>End Date:</strong> ${membership.endDate.toLocaleDateString()}</p>
      <p>Thank you for joining our gym family!</p>
    `;

    return this.sendEmail(member.email, 'Membership Confirmation', html);
  }

  /**
   * Send class booking notification
   */
  async sendClassBookingNotification(member, gymClass, schedule) {
    const html = `
      <h2>Class Booking Confirmation</h2>
      <p>Hello ${member.firstName},</p>
      <p>Your class booking has been confirmed!</p>
      <p><strong>Class:</strong> ${gymClass.name}</p>
      <p><strong>Date:</strong> ${new Date(schedule.date).toLocaleDateString()}</p>
      <p><strong>Time:</strong> ${schedule.startTime} - ${schedule.endTime}</p>
      <p>See you there!</p>
    `;

    return this.sendEmail(member.email, 'Class Booking Confirmation', html);
  }

  /**
   * Send personal training booking notification
   */
  async sendPersonalTrainingNotification(member, trainer, booking) {
    const html = `
      <h2>Personal Training Session Booked</h2>
      <p>Hello ${member.firstName},</p>
      <p>Your personal training session has been booked!</p>
      <p><strong>Trainer:</strong> ${trainer.firstName} ${trainer.lastName}</p>
      <p><strong>Date:</strong> ${new Date(booking.sessionDate).toLocaleDateString()}</p>
      <p><strong>Time:</strong> ${booking.startTime} - ${booking.endTime}</p>
      <p>Looking forward to training with you!</p>
    `;

    return this.sendEmail(member.email, 'Personal Training Session Booked', html);
  }

  /**
   * Send workout reminder
   */
  async sendWorkoutReminder(member, workout) {
    const html = `
      <h2>Time for Your Workout!</h2>
      <p>Hello ${member.firstName},</p>
      <p>You have a scheduled workout today!</p>
      <p><strong>Workout Plan:</strong> ${workout.planName}</p>
      <p><strong>Exercises:</strong> ${workout.exerciseCount}</p>
      <p>Let's get that gains! Come to the gym!</p>
    `;

    return this.sendEmail(member.email, 'Workout Reminder', html);
  }

  /**
   * Send membership expiry warning
   */
  async sendMembershipExpiryWarning(member, membership, daysRemaining) {
    const html = `
      <h2>Membership Expiry Warning</h2>
      <p>Hello ${member.firstName},</p>
      <p>Your membership is expiring soon!</p>
      <p><strong>Days Remaining:</strong> ${daysRemaining}</p>
      <p><strong>Expiry Date:</strong> ${membership.endDate.toLocaleDateString()}</p>
      <p>Please renew your membership to continue enjoying our facilities.</p>
    `;

    return this.sendEmail(member.email, 'Membership Expiry Warning', html);
  }

  /**
   * Send in-app notification (placeholder for future implementation)
   */
  async sendInAppNotification(userId, title, message, type = 'info') {
    // This would be implemented with a notifications database
    logger.info(`In-app notification for user ${userId}: ${title}`);
  }

  /**
   * Send push notification (placeholder for future implementation)
   */
  async sendPushNotification(userId, title, message, data = {}) {
    // This would be implemented with Firebase Cloud Messaging or similar
    logger.info(`Push notification for user ${userId}: ${title}`);
  }
}

export const notificationService = new NotificationService();
