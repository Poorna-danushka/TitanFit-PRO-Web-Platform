import Attendance from '../models/Attendance.js';
import MemberQRCode from '../models/MemberQRCode.js';
import User from '../models/User.js';
import QRCode from 'qrcode';
import { asyncHandler } from '../utils/asyncHandler.js';
import { NotFoundError, ValidationError } from '../utils/errors.js';
import logger from '../utils/logger.js';
import { HTTP_STATUS } from '../constants/index.js';
import { checkUserMembershipStatus } from '../utils/membershipHelper.js';

/**
 * Generate or get QR code for member
 * POST /api/v1/attendance/generate-qr
 */
export const generateQRCode = asyncHandler(async (req, res) => {
  const user = await User.findById(req.userId);
  if (!user) {
    throw new NotFoundError('User');
  }

  // Validate active membership if not staff/admin
  const isPrivileged = ['admin', 'ADMIN', 'SYSTEM_ADMIN', 'STAFF', 'TRAINER'].includes(user.role);
  if (!isPrivileged) {
    const membershipStatus = await checkUserMembershipStatus(req.userId);
    if (!membershipStatus.hasActiveMembership) {
      if (membershipStatus.isPendingVerification) {
        return res.status(HTTP_STATUS.FORBIDDEN).json({
          success: false,
          code: 'PENDING_VERIFICATION',
          message: 'Your bank transfer is awaiting administrator verification.',
        });
      }
      return res.status(HTTP_STATUS.FORBIDDEN).json({
        success: false,
        code: 'MEMBERSHIP_REQUIRED',
        message: 'Active membership required for gym attendance.',
      });
    }
  }

  let qrCodeRecord = await MemberQRCode.findOne({ memberId: req.userId });
  if (!qrCodeRecord) {
    qrCodeRecord = await MemberQRCode.findOne({ userId: req.userId });
  }

  const qrData = `GYM_MEMBER_${user._id}`;
  const qrCodeImage = await QRCode.toDataURL(qrData);

  if (!qrCodeRecord) {
    qrCodeRecord = new MemberQRCode({
      memberId: user._id,
      userId: user._id,
      qrCodeData: qrData,
      isActive: true,
    });
    await qrCodeRecord.save();
  }

  res.status(HTTP_STATUS.OK).json({
    success: true,
    data: {
      qrCodeData: qrData,
      qrImage: qrCodeImage,
      member: {
        name: user.name,
        email: user.email,
        role: user.role,
      },
    },
  });
});

/**
 * Get member's QR code
 * GET /api/v1/attendance/my-qr
 */
export const getMyQRCode = asyncHandler(async (req, res) => {
  const user = await User.findById(req.userId);
  if (!user) {
    throw new NotFoundError('User');
  }

  // Validate active membership if not staff/admin
  const isPrivileged = ['admin', 'ADMIN', 'SYSTEM_ADMIN', 'STAFF', 'TRAINER'].includes(user.role);
  if (!isPrivileged) {
    const membershipStatus = await checkUserMembershipStatus(req.userId);
    if (!membershipStatus.hasActiveMembership) {
      if (membershipStatus.isPendingVerification) {
        return res.status(HTTP_STATUS.FORBIDDEN).json({
          success: false,
          code: 'PENDING_VERIFICATION',
          message: 'Your bank transfer is awaiting administrator verification.',
        });
      }
      return res.status(HTTP_STATUS.FORBIDDEN).json({
        success: false,
        code: 'MEMBERSHIP_REQUIRED',
        message: 'Active membership required for gym attendance.',
      });
    }
  }

  const qrData = `GYM_MEMBER_${user._id}`;
  const qrCodeImage = await QRCode.toDataURL(qrData);

  res.status(HTTP_STATUS.OK).json({
    success: true,
    data: {
      qrCodeData: qrData,
      qrCodeImage: qrCodeImage,
      qrImage: qrCodeImage,
      member: {
        name: user.name,
        email: user.email,
      },
    },
  });
});

/**
 * Scan QR Code & Record Attendance (Check-in or Check-out)
 * POST /api/v1/attendance/scan-qr & POST /api/v1/attendance/check-in
 */
export const scanQR = asyncHandler(async (req, res) => {
  const { qrData, memberId } = req.body;
  const rawInput = qrData || memberId;

  if (!rawInput) {
    throw new ValidationError('QR code data or Member ID is required');
  }

  // Parse member ID from string, JSON, or QR prefix
  let targetUserId = rawInput;
  if (typeof rawInput === 'string') {
    if (rawInput.startsWith('GYM_MEMBER_')) {
      targetUserId = rawInput.replace('GYM_MEMBER_', '').trim();
    } else if (rawInput.startsWith('{')) {
      try {
        const parsed = JSON.parse(rawInput);
        targetUserId = parsed.userId || parsed.memberId || targetUserId;
      } catch (e) {
        // Fallthrough
      }
    }
  }

  // Find user by ID or email
  let user = await User.findById(targetUserId).catch(() => null);
  if (!user) {
    user = await User.findOne({ email: rawInput }).catch(() => null);
  }

  if (!user) {
    // Search in MemberQRCode table
    const qrRecord = await MemberQRCode.findOne({ qrCodeData: rawInput });
    if (qrRecord) {
      user = await User.findById(qrRecord.memberId || qrRecord.userId);
    }
  }

  if (!user) {
    return res.status(404).json({
      success: false,
      message: 'Invalid QR Code or Member account not found.',
    });
  }

  // Validate active membership for gym access if user is not staff/admin
  const isPrivileged = ['admin', 'ADMIN', 'SYSTEM_ADMIN', 'STAFF', 'TRAINER'].includes(user.role);
  if (!isPrivileged) {
    const membershipStatus = await checkUserMembershipStatus(user._id);
    if (!membershipStatus.hasActiveMembership) {
      if (membershipStatus.isPendingVerification) {
        return res.status(HTTP_STATUS.FORBIDDEN).json({
          success: false,
          code: 'PENDING_VERIFICATION',
          message: 'Your bank transfer is awaiting administrator verification.',
        });
      }
      return res.status(HTTP_STATUS.FORBIDDEN).json({
        success: false,
        code: 'MEMBERSHIP_REQUIRED',
        message: 'Member does not have an active membership.',
      });
    }
  }

  // Check if member is currently checked in (without checkout time)
  const activeAttendance = await Attendance.findOne({
    $or: [{ userId: user._id }, { memberId: user._id }],
    checkOutTime: null,
  }).sort({ checkInTime: -1 });

  if (activeAttendance) {
    // Process Check-Out
    const now = new Date();
    const durationMs = now.getTime() - new Date(activeAttendance.checkInTime).getTime();
    const durationMinutes = Math.max(1, Math.round(durationMs / (1000 * 60)));

    activeAttendance.checkOutTime = now;
    activeAttendance.status = 'CHECKED_OUT';
    activeAttendance.duration = durationMinutes;
    await activeAttendance.save();

    logger.info(`Member checked out via QR scan: ${user.email} (${durationMinutes} min)`);

    return res.status(HTTP_STATUS.OK).json({
      success: true,
      action: 'CHECK_OUT',
      message: `Goodbye ${user.name}! Checked out successfully (${durationMinutes} min session).`,
      attendance: activeAttendance,
      member: {
        id: user._id,
        name: user.name,
        email: user.email,
      },
    });
  }

  // Process Check-In & Record Attendance
  const newAttendance = new Attendance({
    userId: user._id,
    memberId: user._id,
    checkInTime: new Date(),
    status: 'CHECKED_IN',
    method: 'QR',
  });

  await newAttendance.save();
  logger.info(`Member checked in via QR scan: ${user.email}`);

  res.status(HTTP_STATUS.CREATED).json({
    success: true,
    action: 'CHECK_IN',
    message: `Welcome ${user.name}! Attendance recorded & checked in successfully.`,
    attendance: newAttendance,
    member: {
      id: user._id,
      name: user.name,
      email: user.email,
    },
  });
});

export const checkIn = scanQR;

/**
 * Check-out member
 * POST /api/v1/attendance/check-out
 */
export const checkOut = asyncHandler(async (req, res) => {
  const targetId = req.body.memberId || req.userId;
  const attendance = await Attendance.findOneAndUpdate(
    {
      $or: [{ userId: targetId }, { memberId: targetId }],
      checkOutTime: null,
    },
    {
      checkOutTime: new Date(),
      status: 'CHECKED_OUT',
    },
    { new: true }
  );

  if (!attendance) {
    return res.status(404).json({
      success: false,
      message: 'No active check-in record found for this member.',
    });
  }

  logger.info(`Member checked out: ${targetId}`);

  res.status(HTTP_STATUS.OK).json({
    success: true,
    message: 'Checked out successfully.',
    data: attendance,
  });
});

/**
 * Get member's attendance history
 * GET /api/v1/attendance/history & GET /api/v1/attendance/my-history
 */
export const getAttendanceHistory = asyncHandler(async (req, res) => {
  const attendanceLogs = await Attendance.find({
    $or: [{ userId: req.userId }, { memberId: req.userId }],
  })
    .populate('userId memberId', 'name email firstName lastName')
    .sort({ checkInTime: -1 })
    .limit(50);

  res.status(HTTP_STATUS.OK).json({
    success: true,
    history: attendanceLogs,
    data: attendanceLogs,
  });
});

/**
 * Get all attendance records (admin/staff only)
 * GET /api/v1/attendance/admin/records
 */
export const getAllAttendance = asyncHandler(async (req, res) => {
  const attendanceLogs = await Attendance.find({})
    .populate('userId memberId', 'name email firstName lastName')
    .sort({ checkInTime: -1 })
    .limit(100);

  res.status(HTTP_STATUS.OK).json({
    success: true,
    data: attendanceLogs,
    history: attendanceLogs,
  });
});

/**
 * Get attendance statistics
 * GET /api/v1/attendance/admin/stats & GET /api/v1/attendance/stats
 */
export const getAttendanceStats = asyncHandler(async (req, res) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const todayCount = await Attendance.countDocuments({
    checkInTime: { $gte: today },
  });

  const activeCheckedInCount = await Attendance.countDocuments({
    checkOutTime: null,
  });

  res.status(HTTP_STATUS.OK).json({
    success: true,
    data: {
      todayAttendanceCount: todayCount,
      currentlyInGymCount: activeCheckedInCount,
    },
  });
});
