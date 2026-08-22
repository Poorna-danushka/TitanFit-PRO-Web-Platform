import User from '../models/User.js';
import logger from '../utils/logger.js';
import { generateAccessToken, generateRefreshToken, generateVerificationToken, verifyAccessToken, verifyRefreshToken, verifyVerificationToken } from '../utils/jwt.js';
import { ERROR_MESSAGES, SUCCESS_MESSAGES } from '../constants/index.js';
import { sendVerificationEmail, sendWelcomeEmail } from '../utils/email.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { blacklistToken } from '../services/tokenBlacklistService.js';
import { generateCsrfToken } from '../middleware/csrf.js';

/**
 * Helper to set Auth & CSRF Cookies
 */
const setAuthCookies = (res, accessToken, refreshToken) => {
  const isProd = process.env.NODE_ENV === 'production';

  // HTTP-Only Access Token Cookie
  res.cookie('accessToken', accessToken, {
    httpOnly: true,
    secure: isProd,
    sameSite: 'lax',
    maxAge: 15 * 60 * 1000, // 15 minutes
  });

  // HTTP-Only Refresh Token Cookie
  res.cookie('refreshToken', refreshToken, {
    httpOnly: true,
    secure: isProd,
    sameSite: 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  });

  // Double-Submit CSRF Cookie (readable by JS to attach X-CSRF-Token header)
  const csrfToken = generateCsrfToken();
  res.cookie('XSRF-TOKEN', csrfToken, {
    httpOnly: false,
    secure: isProd,
    sameSite: 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });

  return csrfToken;
};

/**
 * Get CSRF Token
 * GET /api/v1/auth/csrf-token
 */
export const getCsrfToken = asyncHandler(async (req, res) => {
  const csrfToken = generateCsrfToken();
  const isProd = process.env.NODE_ENV === 'production';

  res.cookie('XSRF-TOKEN', csrfToken, {
    httpOnly: false,
    secure: isProd,
    sameSite: 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });

  res.status(200).json({
    success: true,
    csrfToken,
  });
});

/**
 * Register a new user
 * POST /api/v1/auth/register
 */
export const register = asyncHandler(async (req, res) => {
  const { name, firstName, lastName, email, password, phone } = req.body;
  const normalizedEmail = (email || '').trim().toLowerCase();

  // Check if user already exists
  const existingUser = await User.findOne({ email: normalizedEmail });
  if (existingUser) {
    return res.status(409).json({
      success: false,
      message: ERROR_MESSAGES.EMAIL_ALREADY_EXISTS,
    });
  }

  const nameTrimmed = (name || '').trim();
  const nameParts = nameTrimmed ? nameTrimmed.split(/\s+/) : [];
  const parsedFirstName = firstName || nameParts[0] || 'Gym';
  // Only set a real lastName if the user typed 2+ words (e.g. "John Doe")
  const parsedLastName = lastName || (nameParts.length > 1 ? nameParts.slice(1).join(' ') : '');

  // Create user (Public signup is strictly MEMBER role only)
  const user = new User({
    firstName: parsedFirstName,
    lastName: parsedLastName,
    email: normalizedEmail,
    phone: phone ? phone.trim() : undefined,
    password,
    role: 'MEMBER',
    isSystemAdmin: false,
    emailVerificationExpiry: new Date(Date.now() + 24 * 60 * 60 * 1000),
  });

  await user.save();

  const verificationToken = generateVerificationToken(user._id);
  user.emailVerificationToken = verificationToken;
  await user.save();

  // Generate tokens & set HTTP-Only cookies
  const accessToken = generateAccessToken(user._id);
  const refreshToken = generateRefreshToken(user._id);
  const csrfToken = setAuthCookies(res, accessToken, refreshToken);

  try {
    const verificationLink = `${process.env.FRONTEND_URL}/verify-email?token=${verificationToken}`;
    await sendVerificationEmail(normalizedEmail, verificationLink);
  } catch (error) {
    logger.warn(`Failed to send verification email to ${normalizedEmail}: ${error.message}`);
  }

  logger.info(`New user registered: ${normalizedEmail}`);

  res.status(201).json({
    success: true,
    message: SUCCESS_MESSAGES.REGISTRATION_SUCCESS,
    csrfToken,
    user: {
      id:                   user._id,
      _id:                  user._id,
      name:                 user.name,
      firstName:            user.firstName,
      lastName:             user.lastName,
      email:                user.email,
      phone:                user.phone,
      role:                 user.role,
      isSystemAdmin:        false,
      profileImage:         null,
      profileImagePublicId: null,
      avatarUrl:            null,
      mustChangePassword:   false,
      isEmailVerified:      user.isEmailVerified,
      createdAt:            user.createdAt,
    },
    tokens: {
      accessToken,
      refreshToken,
    },
  });
});

/**
 * Login user
 * POST /api/v1/auth/login
 */
export const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  const normalizedEmail = (email || '').trim().toLowerCase();

  const user = await User.findOne({ email: normalizedEmail }).select('+password');

  if (!user) {
    return res.status(401).json({
      success: false,
      message: ERROR_MESSAGES.INVALID_CREDENTIALS,
    });
  }

  if (user.isAccountLocked()) {
    return res.status(403).json({
      success: false,
      message: ERROR_MESSAGES.ACCOUNT_LOCKED,
    });
  }

  const isPasswordCorrect = await user.matchPassword(password);
  if (!isPasswordCorrect) {
    await user.incLoginAttempts();
    return res.status(401).json({
      success: false,
      message: ERROR_MESSAGES.INVALID_CREDENTIALS,
    });
  }

  await user.resetLoginAttempts();
  user.lastLogin = new Date();
  user.lastActivityAt = new Date();
  await user.save();

  // Generate tokens & set HTTP-Only cookies
  const accessToken = generateAccessToken(user._id);
  const refreshToken = generateRefreshToken(user._id);
  const csrfToken = setAuthCookies(res, accessToken, refreshToken);

  logger.info(`User logged in: ${email} (${user.role})`);

  res.status(200).json({
    success: true,
    message: SUCCESS_MESSAGES.LOGIN_SUCCESS,
    csrfToken,
    user: {
      id:                   user._id,
      _id:                  user._id,
      name:                 user.name,
      firstName:            user.firstName,
      lastName:             user.lastName,
      email:                user.email,
      phone:                user.phone,
      role:                 user.role,
      isSystemAdmin:        user.isSystemAdmin || user.role === 'SYSTEM_ADMIN',
      bio:                  user.bio,
      weight:               user.weight,
      height:               user.height,
      profileImage:         user.profileImage         || null,
      profileImagePublicId: user.profileImagePublicId || null,
      avatarUrl:            user.profileImage         || null,
      avatarPublicId:       user.profileImagePublicId || null,
      mustChangePassword:   Boolean(user.mustChangePassword),
      isEmailVerified:      user.isEmailVerified,
      subscriptionStatus:   user.subscriptionStatus,
      createdAt:            user.createdAt,
    },
    tokens: {
      accessToken,
      refreshToken,
    },
    warning: !user.isEmailVerified ? 'Please verify your email to unlock all features' : null,
  });
});

/**
 * Refresh access token
 * POST /api/v1/auth/refresh
 */
export const refreshAccessToken = asyncHandler(async (req, res) => {
  const refreshToken = req.cookies?.refreshToken || req.body?.refreshToken;

  if (!refreshToken) {
    return res.status(401).json({
      success: false,
      message: ERROR_MESSAGES.INVALID_TOKEN,
    });
  }

  try {
    const decoded = verifyRefreshToken(refreshToken);
    const user = await User.findById(decoded.userId);

    if (!user) {
      return res.status(401).json({
        success: false,
        message: ERROR_MESSAGES.USER_NOT_FOUND,
      });
    }

    const newAccessToken = generateAccessToken(user._id);
    const newRefreshToken = generateRefreshToken(user._id);
    const csrfToken = setAuthCookies(res, newAccessToken, newRefreshToken);

    res.status(200).json({
      success: true,
      accessToken: newAccessToken,
      csrfToken,
    });
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: ERROR_MESSAGES.INVALID_TOKEN,
    });
  }
});

/**
 * Verify email
 * POST /api/v1/auth/verify-email
 */
export const verifyEmail = asyncHandler(async (req, res) => {
  const { token } = req.body;

  if (!token) {
    return res.status(400).json({
      success: false,
      message: 'Verification token required',
    });
  }

  try {
    const decoded = verifyVerificationToken(token);
    const user = await User.findOne({
      _id: decoded.userId,
      emailVerificationExpiry: { $gt: Date.now() },
    }).select('+emailVerificationToken +emailVerificationExpiry');

    if (!user) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired verification token',
      });
    }

    user.isEmailVerified = true;
    user.emailVerificationToken = undefined;
    user.emailVerificationExpiry = undefined;
    await user.save();

    logger.info(`Email verified for: ${user.email}`);

    res.status(200).json({
      success: true,
      message: 'Email verified successfully',
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: 'Email verification failed',
    });
  }
});

/**
 * Get current user profile
 * GET /api/v1/auth/me
 */
export const getMe = asyncHandler(async (req, res) => {
  const user = await User.findById(req.userId);

  if (!user) {
    return res.status(404).json({
      success: false,
      message: ERROR_MESSAGES.USER_NOT_FOUND,
    });
  }

  res.status(200).json({
    success: true,
    user: {
      id:                   user._id,
      _id:                  user._id,
      name:                 user.name,
      firstName:            user.firstName,
      lastName:             user.lastName,
      email:                user.email,
      phone:                user.phone,
      role:                 user.role,
      isSystemAdmin:        user.isSystemAdmin,
      bio:                  user.bio,
      gender:               user.gender,
      dateOfBirth:          user.dateOfBirth,
      profileImage:         user.profileImage         || null,
      profileImagePublicId: user.profileImagePublicId || null,
      avatarUrl:            user.profileImage         || null,
      avatarPublicId:       user.profileImagePublicId || null,
      mustChangePassword:   Boolean(user.mustChangePassword),
      weight:               user.weight,
      height:               user.height,
      isEmailVerified:      user.isEmailVerified,
      subscriptionStatus:   user.subscriptionStatus,
      createdAt:            user.createdAt,
    },
  });
});

/**
 * Update user profile
 * PUT /api/v1/auth/profile
 */
export const updateProfile = asyncHandler(async (req, res) => {
  const { name, phone, bio, gender, dateOfBirth, weight, height, profileImage } = req.body;

  const updates = {
    ...(phone !== undefined && { phone }),
    ...(bio !== undefined && { bio }),
    ...(gender !== undefined && { gender }),
    ...(dateOfBirth !== undefined && { dateOfBirth }),
    ...(weight !== undefined && { weight }),
    ...(height !== undefined && { height }),
    ...(profileImage !== undefined && { profileImage }),
    lastActivityAt: new Date(),
  };

  if (name) {
    const nameParts = name.trim().split(/\s+/);
    updates.firstName = nameParts[0] || '';
    // Only set lastName when user provided 2+ words (e.g. "John Doe")
    updates.lastName = nameParts.length > 1 ? nameParts.slice(1).join(' ') : '';
  }

  const user = await User.findByIdAndUpdate(
    req.userId,
    updates,
    { new: true, runValidators: true }
  );

  if (!user) {
    return res.status(404).json({
      success: false,
      message: ERROR_MESSAGES.USER_NOT_FOUND,
    });
  }

  logger.info(`Profile updated for: ${user.email}`);

  res.status(200).json({
    success: true,
    message: SUCCESS_MESSAGES.PROFILE_UPDATED,
    user: {
      id:                   user._id,
      _id:                  user._id,
      name:                 user.name,
      firstName:            user.firstName,
      lastName:             user.lastName,
      email:                user.email,
      phone:                user.phone,
      role:                 user.role,
      isSystemAdmin:        user.isSystemAdmin,
      bio:                  user.bio,
      gender:               user.gender,
      dateOfBirth:          user.dateOfBirth,
      profileImage:         user.profileImage         || null,
      profileImagePublicId: user.profileImagePublicId || null,
      avatarUrl:            user.profileImage         || null,
      avatarPublicId:       user.profileImagePublicId || null,
      mustChangePassword:   Boolean(user.mustChangePassword),
      weight:               user.weight,
      height:               user.height,
      isEmailVerified:      user.isEmailVerified,
      createdAt:            user.createdAt,
    },
  });
});

/**
 * Resend verification email
 * POST /api/v1/auth/resend-verification
 */
export const resendVerificationEmail = asyncHandler(async (req, res) => {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({
      success: false,
      message: 'Email is required',
    });
  }

  try {
    const user = await User.findOne({ email });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: ERROR_MESSAGES.USER_NOT_FOUND,
      });
    }

    if (user.isEmailVerified) {
      return res.status(400).json({
        success: false,
        message: 'Email is already verified',
      });
    }

    const verificationToken = generateVerificationToken(user._id);
    user.emailVerificationToken = verificationToken;
    user.emailVerificationExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000);
    await user.save();

    try {
      const verificationLink = `${process.env.FRONTEND_URL}/verify-email?token=${verificationToken}`;
      await sendVerificationEmail(email, verificationLink);
    } catch (error) {
      logger.warn(`Failed to send verification email to ${email}: ${error.message}`);
      return res.status(500).json({
        success: false,
        message: 'Failed to send verification email',
      });
    }

    logger.info(`Verification email resent to: ${email}`);

    res.status(200).json({
      success: true,
      message: 'Verification email sent successfully',
    });
  } catch (error) {
    logger.error(`Error resending verification email: ${error.message}`);
    return res.status(500).json({
      success: false,
      message: 'Failed to resend verification email',
    });
  }
});

/**
 * Logout user (Blacklists JWT & Clears HTTP-Only Cookies)
 * POST /api/v1/auth/logout
 */
export const logout = asyncHandler(async (req, res) => {
  if (req.token) {
    await blacklistToken(req.token, req.userId, 'LOGOUT');
  }

  res.clearCookie('accessToken');
  res.clearCookie('refreshToken');
  res.clearCookie('XSRF-TOKEN');

  logger.info(`User logged out and token blacklisted: ${req.userId || 'unknown'}`);

  res.status(200).json({
    success: true,
    message: SUCCESS_MESSAGES.LOGOUT_SUCCESS,
  });
});

/**
 * Change password (used for forced first-login password update and general password changes)
 * POST /api/v1/auth/change-password
 */
export const changePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;

  if (!currentPassword || !newPassword) {
    return res.status(400).json({
      success: false,
      message: 'Both current password and new password are required.',
    });
  }

  if (newPassword.length < 8) {
    return res.status(400).json({
      success: false,
      message: 'New password must be at least 8 characters long.',
    });
  }

  if (currentPassword === newPassword) {
    return res.status(400).json({
      success: false,
      message: 'New password must be different from your current temporary password.',
    });
  }

  const user = await User.findById(req.userId).select('+password');
  if (!user) {
    return res.status(404).json({
      success: false,
      message: ERROR_MESSAGES.USER_NOT_FOUND,
    });
  }

  const isMatch = await user.matchPassword(currentPassword);
  if (!isMatch) {
    return res.status(400).json({
      success: false,
      message: 'Current password is incorrect.',
    });
  }

  // Update password and clear mustChangePassword flag
  user.password = newPassword;
  user.mustChangePassword = false;
  user.tempPasswordSetAt = undefined;
  await user.save();

  logger.info(`Password successfully updated for user: ${user.email} (mustChangePassword cleared)`);

  res.status(200).json({
    success: true,
    message: 'Password changed successfully. You can now access your dashboard.',
    user: {
      id:                   user._id,
      _id:                  user._id,
      name:                 user.name,
      firstName:            user.firstName,
      lastName:             user.lastName,
      email:                user.email,
      role:                 user.role,
      isSystemAdmin:        user.isSystemAdmin,
      profileImage:         user.profileImage         || null,
      profileImagePublicId: user.profileImagePublicId || null,
      avatarUrl:            user.profileImage         || null,
      avatarPublicId:       user.profileImagePublicId || null,
      mustChangePassword:   false,
      isEmailVerified:      user.isEmailVerified,
    },
  });
});
