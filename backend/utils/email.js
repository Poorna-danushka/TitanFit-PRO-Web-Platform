import nodemailer from 'nodemailer';
import logger from './logger.js';

let transporter;

const initializeEmailService = () => {
  const host = process.env.SMTP_HOST;
  const port = parseInt(process.env.SMTP_PORT || '587', 10);
  const user = process.env.SMTP_USER || process.env.EMAIL_USER;
  const pass = process.env.SMTP_PASS || process.env.EMAIL_PASSWORD;

  if (host && user) {
    transporter = nodemailer.createTransport({
      host,
      port,
      secure: process.env.SMTP_SECURE === 'true' || port === 465,
      auth: { user, pass },
    });
    logger.info(`✅ SMTP Transporter initialized with host: ${host}:${port}`);
  } else if (user) {
    transporter = nodemailer.createTransport({
      service: process.env.EMAIL_SERVICE || 'gmail',
      auth: { user, pass },
    });
    logger.info('✅ Nodemailer service initialized');
  } else {
    logger.warn('⚠️ SMTP/Email credentials not fully configured in env. Email dispatch will be simulated.');
  }
};

/**
 * Send email verification link
 */
export const sendVerificationEmail = async (email, verificationLink) => {
  if (!transporter) initializeEmailService();

  const mailOptions = {
    from: process.env.SMTP_FROM || process.env.EMAIL_FROM || process.env.SMTP_USER || 'noreply@gymfitpro.local',
    to: email,
    subject: 'Verify Your GymFit Pro Account',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #0b0b0e; color: #ffffff; padding: 30px; border-radius: 16px;">
        <h2 style="color: #22c55e; margin-bottom: 20px;">Verify Your Email</h2>
        <p style="color: #d1d5db; line-height: 1.6;">Welcome to GymFit Pro! Click the button below to verify your account:</p>
        <p style="margin: 30px 0;">
          <a href="${verificationLink}" style="background-color: #22c55e; color: #000000; padding: 12px 28px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">
            Verify Email Address
          </a>
        </p>
        <p style="color: #6b7280; font-size: 12px;">This link expires in 24 hours.</p>
      </div>
    `,
  };

  try {
    if (transporter) {
      await transporter.sendMail(mailOptions);
      logger.info(`Verification email sent to ${email}`);
    } else {
      logger.info(`[Simulated Email] Verification email link for ${email}: ${verificationLink}`);
    }
  } catch (error) {
    logger.error(`Failed to send verification email to ${email}: ${error.message}`);
  }
};

/**
 * Send payment receipt email
 * @param {string} email - Member recipient email
 * @param {object} details - Receipt details
 */
export const sendPaymentReceipt = async (email, details) => {
  if (!transporter) initializeEmailService();

  const receiptId = details.receiptId || details.transactionId || `REC-${Date.now()}`;
  const amountFormatted = (details.amount || 0).toLocaleString();
  const dateStr = details.date ? new Date(details.date).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) : new Date().toLocaleDateString();

  const mailOptions = {
    from: process.env.SMTP_FROM || process.env.EMAIL_FROM || process.env.SMTP_USER || 'payments@gymfitpro.local',
    to: email,
    subject: `GymFit Pro Payment Receipt - #${receiptId}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #0b0b0e; color: #ffffff; padding: 32px; border-radius: 16px; border: 1px solid #1f2937;">
        <div style="display: flex; justify-content: space-between; align-items: center; border-b: 1px solid #1f2937; pb: 20px; margin-bottom: 24px;">
          <h1 style="color: #22c55e; margin: 0; font-size: 24px;">GymFit <span style="color: #ffffff;">Pro</span></h1>
          <span style="background-color: #22c55e20; color: #22c55e; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: bold;">PAID & VERIFIED</span>
        </div>

        <h2 style="font-size: 18px; color: #ffffff; margin-bottom: 12px;">Official Payment Receipt</h2>
        <p style="color: #9ca3af; font-size: 14px; margin-bottom: 24px;">Thank you for your purchase! Your gym membership is active.</p>

        <div style="background-color: #111115; border: 1px solid #1f2937; padding: 20px; border-radius: 12px; margin-bottom: 24px;">
          <div style="display: flex; justify-content: space-between; margin-bottom: 10px;">
            <span style="color: #9ca3af; font-size: 14px;">Receipt ID:</span>
            <span style="color: #ffffff; font-weight: bold; font-size: 14px;">#${receiptId}</span>
          </div>
          <div style="display: flex; justify-content: space-between; margin-bottom: 10px;">
            <span style="color: #9ca3af; font-size: 14px;">Package / Plan:</span>
            <span style="color: #ffffff; font-weight: bold; font-size: 14px;">${details.packageName || 'Gym Membership'}</span>
          </div>
          <div style="display: flex; justify-content: space-between; margin-bottom: 10px;">
            <span style="color: #9ca3af; font-size: 14px;">Amount Paid:</span>
            <span style="color: #22c55e; font-weight: bold; font-size: 16px;">LKR ${amountFormatted}</span>
          </div>
          <div style="display: flex; justify-content: space-between; margin-bottom: 10px;">
            <span style="color: #9ca3af; font-size: 14px;">Payment Method:</span>
            <span style="color: #ffffff; font-weight: bold; font-size: 14px;">${(details.paymentMethod || 'CARD').toUpperCase()}</span>
          </div>
          <div style="display: flex; justify-content: space-between;">
            <span style="color: #9ca3af; font-size: 14px;">Date:</span>
            <span style="color: #ffffff; font-size: 14px;">${dateStr}</span>
          </div>
        </div>

        <p style="color: #6b7280; font-size: 12px; text-align: center; margin-top: 24px;">
          GymFit Pro Fitness Center • Contact Support if you have any questions.
        </p>
      </div>
    `,
  };

  try {
    if (transporter) {
      await transporter.sendMail(mailOptions);
      logger.info(`✅ Payment receipt email sent to ${email} for receipt #${receiptId}`);
    } else {
      logger.info(`[Simulated Email Receipt] Sent to ${email} for LKR ${amountFormatted} (#${receiptId})`);
    }
  } catch (error) {
    logger.error(`Failed to send payment receipt email to ${email}: ${error.message}`);
  }
};

/**
 * Send welcome email
 */
export const sendWelcomeEmail = async (email, name) => {
  if (!transporter) initializeEmailService();

  const mailOptions = {
    from: process.env.SMTP_FROM || process.env.EMAIL_FROM || process.env.SMTP_USER || 'welcome@gymfitpro.local',
    to: email,
    subject: 'Welcome to GymFit Pro!',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #0b0b0e; color: #ffffff; padding: 30px; border-radius: 16px;">
        <h2 style="color: #22c55e;">Welcome ${name}! 💪</h2>
        <p style="color: #d1d5db; line-height: 1.6;">You're now part of the GymFit Pro community. Start your fitness journey today!</p>
        <p style="color: #6b7280; font-size: 12px; margin-top: 30px;">GymFit Pro Team</p>
      </div>
    `,
  };

  try {
    if (transporter) await transporter.sendMail(mailOptions);
  } catch (error) {
    logger.error(`Failed to send welcome email: ${error.message}`);
  }
};

/**
 * Send welcome email to admin-created staff/trainer/admin accounts.
 * Includes temporary password and forced change instructions.
 *
 * @param {string} email       - Recipient email
 * @param {string} name        - Recipient full name
 * @param {string} tempPassword - Plaintext temporary password (shown once)
 * @param {string} role        - TRAINER | STAFF | ADMIN
 * @param {string} createdByName - Name of the admin who created the account
 */
export const sendStaffWelcomeEmail = async (email, name, tempPassword, role, createdByName = 'Admin') => {
  if (!transporter) initializeEmailService();

  const roleLabel = {
    TRAINER:      'Trainer',
    STAFF:        'Staff / Reception',
    ADMIN:        'Administrator',
    SYSTEM_ADMIN: 'System Administrator',
  }[role?.toUpperCase()] || role;

  const loginUrl = process.env.FRONTEND_URL
    ? `${process.env.FRONTEND_URL}/login`
    : 'http://localhost:3000/login';

  const mailOptions = {
    from: process.env.SMTP_FROM || process.env.SMTP_USER || 'noreply@gymfitpro.local',
    to: email,
    subject: `Your GymFit Pro Account Has Been Created — ${roleLabel}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #0b0b0e; color: #ffffff; padding: 0; border-radius: 16px; overflow: hidden; border: 1px solid #1f2937;">

        <!-- Header -->
        <div style="background: linear-gradient(135deg, #111827 0%, #0b0b0e 100%); padding: 36px 36px 24px; border-bottom: 1px solid #1f2937;">
          <h1 style="margin: 0 0 4px; font-size: 26px; font-weight: 900; color: #ffffff;">
            GymFit <span style="color: #22c55e;">Pro</span>
          </h1>
          <p style="margin: 0; color: #6b7280; font-size: 12px; text-transform: uppercase; letter-spacing: 2px;">Fitness Management System</p>
        </div>

        <!-- Body -->
        <div style="padding: 36px;">
          <div style="background: #22c55e15; border: 1px solid #22c55e40; border-radius: 12px; padding: 16px 20px; margin-bottom: 28px;">
            <p style="margin: 0; color: #22c55e; font-size: 13px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px;">
              ✅ Account Created Successfully
            </p>
          </div>

          <h2 style="margin: 0 0 8px; font-size: 22px; color: #ffffff;">Welcome, ${name}! 👋</h2>
          <p style="color: #9ca3af; line-height: 1.7; margin: 0 0 24px;">
            Your <strong style="color: #ffffff;">GymFit Pro ${roleLabel}</strong> account has been set up by <strong style="color: #ffffff;">${createdByName}</strong>.
            Use the temporary credentials below to log in for the first time.
          </p>

          <!-- Credentials Box -->
          <div style="background: #111115; border: 1px solid #374151; border-radius: 12px; padding: 24px; margin-bottom: 28px;">
            <p style="margin: 0 0 16px; font-size: 11px; text-transform: uppercase; letter-spacing: 2px; color: #6b7280; font-weight: 700;">Your Login Credentials</p>

            <div style="margin-bottom: 14px;">
              <span style="display: block; font-size: 11px; color: #6b7280; margin-bottom: 4px; text-transform: uppercase; letter-spacing: 1px;">Email Address</span>
              <span style="display: block; font-size: 16px; color: #60a5fa; font-weight: 600;">${email}</span>
            </div>

            <div>
              <span style="display: block; font-size: 11px; color: #6b7280; margin-bottom: 4px; text-transform: uppercase; letter-spacing: 1px;">Temporary Password</span>
              <span style="display: block; font-size: 20px; color: #fbbf24; font-weight: 800; letter-spacing: 3px; font-family: 'Courier New', monospace; background: #fbbf2415; padding: 10px 14px; border-radius: 8px; border: 1px solid #fbbf2440;">${tempPassword}</span>
            </div>
          </div>

          <!-- Warning -->
          <div style="background: #fbbf2410; border: 1px solid #fbbf2440; border-radius: 10px; padding: 14px 18px; margin-bottom: 28px;">
            <p style="margin: 0; color: #fbbf24; font-size: 13px; line-height: 1.6;">
              ⚠️ <strong>This is a temporary password.</strong> You will be required to create a new secure password immediately after your first login. This temporary password expires in 24 hours.
            </p>
          </div>

          <!-- CTA Button -->
          <div style="text-align: center; margin-bottom: 32px;">
            <a href="${loginUrl}" style="display: inline-block; background: #22c55e; color: #000000; padding: 14px 36px; text-decoration: none; border-radius: 10px; font-weight: 800; font-size: 15px; letter-spacing: 0.5px;">
              Log In to GymFit Pro →
            </a>
          </div>

          <!-- Steps -->
          <div style="border-top: 1px solid #1f2937; padding-top: 24px;">
            <p style="margin: 0 0 14px; font-size: 13px; color: #6b7280; font-weight: 700; text-transform: uppercase; letter-spacing: 1px;">First Login Steps</p>
            <div style="display: flex; flex-direction: column; gap: 10px;">
              <div style="display: flex; align-items: flex-start; gap: 12px;">
                <span style="background: #22c55e; color: #000; width: 22px; height: 22px; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; font-size: 11px; font-weight: 900; flex-shrink: 0;">1</span>
                <p style="margin: 0; color: #9ca3af; font-size: 14px; line-height: 1.5;">Visit the login page and enter your email &amp; temporary password above.</p>
              </div>
              <div style="display: flex; align-items: flex-start; gap: 12px;">
                <span style="background: #22c55e; color: #000; width: 22px; height: 22px; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; font-size: 11px; font-weight: 900; flex-shrink: 0;">2</span>
                <p style="margin: 0; color: #9ca3af; font-size: 14px; line-height: 1.5;">You will be automatically redirected to the password change screen.</p>
              </div>
              <div style="display: flex; align-items: flex-start; gap: 12px;">
                <span style="background: #22c55e; color: #000; width: 22px; height: 22px; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; font-size: 11px; font-weight: 900; flex-shrink: 0;">3</span>
                <p style="margin: 0; color: #9ca3af; font-size: 14px; line-height: 1.5;">Set a strong new password to secure your account and access your dashboard.</p>
              </div>
            </div>
          </div>
        </div>

        <!-- Footer -->
        <div style="background: #111115; border-top: 1px solid #1f2937; padding: 20px 36px; text-align: center;">
          <p style="margin: 0; color: #4b5563; font-size: 12px;">
            GymFit Pro Fitness Management • This is an automated message — do not reply.<br/>
            If you did not expect this email, contact your gym administrator immediately.
          </p>
        </div>
      </div>
    `,
  };

  try {
    if (transporter) {
      await transporter.sendMail(mailOptions);
      logger.info(`✅ Staff welcome email sent to ${email} (role: ${role})`);
    } else {
      logger.info(`[Simulated Email] Staff welcome for ${email} | Temp password: ${tempPassword}`);
    }
  } catch (error) {
    logger.error(`Failed to send staff welcome email to ${email}: ${error.message}`);
    throw error; // re-throw so caller can handle
  }
};

/**
 * Send Plan Expiration & Renewal Email Notification
 *
 * @param {string} email - Member email address
 * @param {string} name - Member full name
 * @param {object} membershipDetails - Current plan details (packageName, endDate, price, duration)
 * @param {Array} availablePackages - Array of active available packages in system
 */
export const sendPlanExpirationEmail = async (email, name, membershipDetails, availablePackages = []) => {
  if (!transporter) initializeEmailService();

  const completionDateStr = membershipDetails.endDate
    ? new Date(membershipDetails.endDate).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
    : 'Upcoming Days';

  const packagesUrl = process.env.FRONTEND_URL
    ? `${process.env.FRONTEND_URL}/packages`
    : 'http://localhost:3000/packages';

  // Build HTML table/list of available packages
  const packagesHtml = availablePackages.length > 0
    ? availablePackages.slice(0, 4).map((pkg) => {
        const hasPT = Boolean(
          pkg.hasPersonalTrainer ||
          pkg.maxPTSessions > 0 ||
          (pkg.benefits || []).some((b) => /trainer|1-on-1|pt/i.test(b)) ||
          /vip|pro|elite|trainer/i.test(pkg.name || '')
        );

        return `
          <div style="background: #111115; border: 1px solid ${hasPT ? '#a855f7' : '#1f2937'}; border-radius: 12px; padding: 16px; margin-bottom: 12px;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
              <h3 style="margin: 0; color: #ffffff; font-size: 16px; font-weight: bold;">
                ${pkg.name} ${hasPT ? '<span style="background: #a855f720; color: #c4b5fd; font-size: 10px; padding: 2px 8px; border-radius: 10px; margin-left: 6px;">PT INCLUDED</span>' : ''}
              </h3>
              <span style="color: #22c55e; font-weight: 800; font-size: 15px;">LKR ${(pkg.price || 0).toLocaleString()}</span>
            </div>
            <p style="margin: 0 0 8px; color: #9ca3af; font-size: 12px; line-height: 1.4;">
              ${pkg.description || 'Comprehensive gym floor access & training features.'}
            </p>
            <div style="font-size: 11px; color: #6b7280;">Duration: <strong style="color: #d1d5db;">${pkg.duration || '1 Month'}</strong></div>
          </div>
        `;
      }).join('')
    : '<p style="color: #9ca3af; font-size: 13px;">Browse all plans on our member portal.</p>';

  const mailOptions = {
    from: process.env.SMTP_FROM || process.env.EMAIL_FROM || process.env.SMTP_USER || 'renewals@gymfitpro.local',
    to: email,
    subject: `Your GymFit Pro Membership Completes on ${completionDateStr} — Review Renewal Plans`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 620px; margin: 0 auto; background: #0b0b0e; color: #ffffff; padding: 0; border-radius: 16px; overflow: hidden; border: 1px solid #1f2937;">

        <!-- Header -->
        <div style="background: linear-gradient(135deg, #111827 0%, #0b0b0e 100%); padding: 32px 32px 20px; border-bottom: 1px solid #1f2937;">
          <h1 style="margin: 0 0 4px; font-size: 24px; font-weight: 900; color: #ffffff;">
            GymFit <span style="color: #22c55e;">Pro</span>
          </h1>
          <p style="margin: 0; color: #6b7280; font-size: 12px; text-transform: uppercase; letter-spacing: 2px;">Membership Expiration & Renewal Notice</p>
        </div>

        <!-- Body -->
        <div style="padding: 32px;">
          <div style="background: #eab30815; border: 1px solid #eab30840; border-radius: 12px; padding: 14px 18px; margin-bottom: 24px;">
            <p style="margin: 0; color: #fde047; font-size: 13px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px;">
              ⏰ Current Gym Membership Completing Soon
            </p>
          </div>

          <h2 style="margin: 0 0 8px; font-size: 20px; color: #ffffff;">Hello ${name},</h2>
          <p style="color: #9ca3af; line-height: 1.6; margin: 0 0 24px; font-size: 14px;">
            Your active gym package <strong style="color: #ffffff;">${membershipDetails.packageName || 'Gym Membership'}</strong> is set to complete on <strong style="color: #fde047;">${completionDateStr}</strong>. To maintain uninterrupted access to gym facilities, QR entry pass, and trainer scheduling, review the available renewal options below.
          </p>

          <!-- Current Plan Details Box -->
          <div style="background: #111115; border: 1px solid #1f2937; border-radius: 12px; padding: 20px; margin-bottom: 28px;">
            <p style="margin: 0 0 14px; font-size: 11px; text-transform: uppercase; letter-spacing: 2px; color: #6b7280; font-weight: 700;">Expiring Membership Summary</p>
            <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
              <span style="color: #9ca3af; font-size: 13px;">Current Package:</span>
              <span style="color: #ffffff; font-weight: bold; font-size: 13px;">${membershipDetails.packageName || 'Gym Package'}</span>
            </div>
            <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
              <span style="color: #9ca3af; font-size: 13px;">Completion Date:</span>
              <span style="color: #fde047; font-weight: bold; font-size: 13px;">${completionDateStr}</span>
            </div>
            <div style="display: flex; justify-content: space-between;">
              <span style="color: #9ca3af; font-size: 13px;">Package Duration:</span>
              <span style="color: #ffffff; font-size: 13px;">${membershipDetails.duration || '1 Month'}</span>
            </div>
          </div>

          <!-- Newly Available Plans Section -->
          <div style="margin-bottom: 28px;">
            <h3 style="margin: 0 0 14px; font-size: 16px; color: #ffffff; font-weight: 700;">
              ✨ Available Packages & Renewal Plans
            </h3>
            ${packagesHtml}
          </div>

          <!-- CTA Button -->
          <div style="text-align: center; margin-bottom: 24px;">
            <a href="${packagesUrl}" style="display: inline-block; background: #22c55e; color: #000000; padding: 14px 36px; text-decoration: none; border-radius: 10px; font-weight: 800; font-size: 15px; letter-spacing: 0.5px;">
              Choose New Plan & Renew Now →
            </a>
          </div>
        </div>

        <!-- Footer -->
        <div style="background: #111115; border-top: 1px solid #1f2937; padding: 20px 32px; text-align: center;">
          <p style="margin: 0; color: #4b5563; font-size: 12px;">
            GymFit Pro Fitness Management • Automated Membership Service<br/>
            Need help selecting a plan? Contact gym reception counter or reply to this email.
          </p>
        </div>
      </div>
    `,
  };

  try {
    if (transporter) {
      await transporter.sendMail(mailOptions);
      logger.info(`✅ Expiration email sent to ${email} for completion date: ${completionDateStr}`);
    } else {
      logger.info(`[Simulated Email] Expiration notice sent to ${email} (Completes: ${completionDateStr})`);
    }
  } catch (error) {
    logger.error(`Failed to send expiration email to ${email}: ${error.message}`);
  }
};

/**
 * Send Password Reset Temporary OTP Email
 *
 * @param {string} email - User email address
 * @param {string} name - User full name
 * @param {string} tempPassword - Temporary password/OTP
 */
export const sendForgotPasswordOtpEmail = async (email, name, tempPassword) => {
  if (!transporter) initializeEmailService();

  const loginUrl = process.env.FRONTEND_URL
    ? `${process.env.FRONTEND_URL}/login`
    : 'http://localhost:3000/login';

  const mailOptions = {
    from: process.env.SMTP_FROM || process.env.SMTP_USER || 'noreply@gymfitpro.local',
    to: email,
    subject: 'GymFit Pro — Your Temporary One-Time Password (OTP)',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #0b0b0e; color: #ffffff; padding: 0; border-radius: 16px; overflow: hidden; border: 1px solid #1f2937;">

        <!-- Header -->
        <div style="background: linear-gradient(135deg, #111827 0%, #0b0b0e 100%); padding: 36px 36px 24px; border-bottom: 1px solid #1f2937;">
          <h1 style="margin: 0 0 4px; font-size: 26px; font-weight: 900; color: #ffffff;">
            GymFit <span style="color: #22c55e;">Pro</span>
          </h1>
          <p style="margin: 0; color: #6b7280; font-size: 12px; text-transform: uppercase; letter-spacing: 2px;">Password Recovery System</p>
        </div>

        <!-- Body -->
        <div style="padding: 36px;">
          <div style="background: #22c55e15; border: 1px solid #22c55e40; border-radius: 12px; padding: 16px 20px; margin-bottom: 28px;">
            <p style="margin: 0; color: #22c55e; font-size: 13px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px;">
              🔑 Password Reset Requested
            </p>
          </div>

          <h2 style="margin: 0 0 8px; font-size: 22px; color: #ffffff;">Hello, ${name || 'Gym Member'}! 👋</h2>
          <p style="color: #9ca3af; line-height: 1.7; margin: 0 0 24px;">
            We received a request to reset your password. Use the temporary One-Time Password (OTP) below to sign in to your account.
          </p>

          <!-- OTP Box -->
          <div style="background: #111115; border: 1px solid #374151; border-radius: 12px; padding: 24px; margin-bottom: 28px; text-align: center;">
            <p style="margin: 0 0 12px; font-size: 11px; text-transform: uppercase; letter-spacing: 2px; color: #6b7280; font-weight: 700;">Your Temporary One-Time Password (OTP)</p>
            <div style="font-size: 26px; color: #fbbf24; font-weight: 900; letter-spacing: 4px; font-family: 'Courier New', monospace; background: #fbbf2415; padding: 14px 20px; border-radius: 10px; border: 1px dashed #fbbf2460; display: inline-block;">
              ${tempPassword}
            </div>
          </div>

          <!-- Mandatory Password Change Warning -->
          <div style="background: #fbbf2410; border: 1px solid #fbbf2440; border-radius: 10px; padding: 14px 18px; margin-bottom: 28px;">
            <p style="margin: 0; color: #fbbf24; font-size: 13px; line-height: 1.6;">
              ⚠️ <strong>Mandatory Requirement:</strong> For security reasons, as soon as you log in with this temporary password, you will be required to set a new permanent password before accessing your account dashboard.
            </p>
          </div>

          <!-- CTA Button -->
          <div style="text-align: center; margin-bottom: 32px;">
            <a href="${loginUrl}" style="display: inline-block; background: #22c55e; color: #000000; padding: 14px 36px; text-decoration: none; border-radius: 10px; font-weight: 800; font-size: 15px; letter-spacing: 0.5px;">
              Log In Now →
            </a>
          </div>

          <!-- Notice -->
          <div style="border-top: 1px solid #1f2937; padding-top: 20px;">
            <p style="margin: 0; color: #6b7280; font-size: 12px; line-height: 1.6;">
              If you did not request a password reset, please ignore this email or contact support if you suspect unauthorized access.
            </p>
          </div>
        </div>

        <!-- Footer -->
        <div style="background: #111115; border-top: 1px solid #1f2937; padding: 20px 36px; text-align: center;">
          <p style="margin: 0; color: #4b5563; font-size: 12px;">
            GymFit Pro Fitness Center • Security & Auth Services
          </p>
        </div>
      </div>
    `,
  };

  try {
    if (transporter) {
      await transporter.sendMail(mailOptions);
      logger.info(`✅ Forgot password OTP email sent to ${email}`);
    } else {
      logger.info(`[Simulated Email] Forgot password OTP for ${email}: ${tempPassword}`);
    }
  } catch (error) {
    logger.error(`Failed to send forgot password OTP email to ${email}: ${error.message}`);
    throw error;
  }
};

export { initializeEmailService };

