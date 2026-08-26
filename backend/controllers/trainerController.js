import TrainerProfile from '../models/TrainerProfile.js';
import TrainerAvailability from '../models/TrainerAvailability.js';
import TrainerAssignment from '../models/TrainerAssignment.js';
import PersonalTrainingBooking from '../models/PersonalTrainingBooking.js';
import Membership from '../models/Membership.js';
import Package from '../models/Package.js';
import MembershipPlan from '../models/MembershipPlan.js';
import User from '../models/User.js';
import Notification from '../models/Notification.js';
import { HTTP_STATUS, SUCCESS_MESSAGES } from '../constants/index.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { NotFoundError, ValidationError, UnauthorizedError, ConflictError } from '../utils/errors.js';
import logger from '../utils/logger.js';
import { hasPersonalTrainerAccess, checkPlanIncludesPT } from '../utils/entitlements.js';
import { checkUserMembershipStatus } from '../utils/membershipHelper.js';
import {
  getWeekRange,
  generateHourlySlots,
  getMemberWeeklyBookingCount,
  getCoachWeeklySchedule,
  checkAvailabilityConflicts,
  normalizeTime24,
  format12Hour,
  formatDateOnly,
  timeToMinutes,
  minutesToTime,
  ORDERED_WEEK_DAYS,
  DAY_NAMES,
} from '../utils/availabilityHelper.js';

export { checkPlanIncludesPT };

/**
 * Public: List all active trainers
 * GET /api/v1/trainers
 */
export const listTrainers = asyncHandler(async (req, res) => {
  const { search, specialization } = req.query;

  // Find all active users with role TRAINER
  const trainerUsers = await User.find({ role: 'TRAINER', isActive: { $ne: false } })
    .select('firstName lastName email phone profileImage bio gender')
    .lean();

  const trainerUserIds = trainerUsers.map((u) => u._id);

  // Find or create their TrainerProfiles
  const profiles = await TrainerProfile.find({ userId: { $in: trainerUserIds } }).lean();
  const profileMap = new Map();
  profiles.forEach((p) => profileMap.set(p.userId.toString(), p));

  const trainers = trainerUsers.map((u) => {
    const p = profileMap.get(u._id.toString()) || {};
    return {
      _id: p._id || u._id,
      userId: {
        _id: u._id,
        firstName: u.firstName,
        lastName: u.lastName,
        name: [u.firstName, u.lastName].filter(Boolean).join(' ') || 'Trainer',
        profileImage: u.profileImage,
        gender: u.gender,
        bio: u.bio,
      },
      name: [u.firstName, u.lastName].filter(Boolean).join(' ') || 'Trainer',
      specialization: p.specialization?.length ? p.specialization : null,
      qualification: p.qualification || null,
      certifications: p.certifications?.length ? p.certifications : null,
      experience: p.experience ?? null,
      bio: p.bio || u.bio || null,
      hourlyRate: p.hourlyRate ?? null,
      rating: p.rating ?? null,
      reviewsCount: p.reviewsCount ?? null,
      isAvailable: p.isAvailable !== false,
      totalClients: p.totalClients || 0,
    };
  });

  // Filter if search/specialization query present
  let filtered = trainers;
  if (search) {
    const s = search.toLowerCase();
    filtered = filtered.filter(
      (t) =>
        t.name.toLowerCase().includes(s) ||
        (t.bio && t.bio.toLowerCase().includes(s)) ||
        (t.specialization && t.specialization.some((sp) => sp.toLowerCase().includes(s)))
    );
  }
  if (specialization) {
    const spQuery = specialization.toLowerCase();
    filtered = filtered.filter((t) =>
      t.specialization && t.specialization.some((sp) => sp.toLowerCase().includes(spQuery))
    );
  }

  res.status(HTTP_STATUS.OK).json({
    success: true,
    count: filtered.length,
    trainers: filtered,
    data: filtered,
  });
});

/**
 * Public: Get single trainer by ID
 * GET /api/v1/trainers/:trainerId
 */
export const getTrainer = asyncHandler(async (req, res) => {
  const { trainerId } = req.params;

  let user = await User.findById(trainerId).select('firstName lastName profileImage email gender bio');
  let profile = null;

  if (user) {
    profile = await TrainerProfile.findOne({ userId: user._id });
  } else {
    profile = await TrainerProfile.findById(trainerId).populate('userId', 'firstName lastName profileImage email gender bio');
    if (profile) user = profile.userId;
  }

  if (!user) {
    throw new NotFoundError('Trainer not found');
  }

  const result = {
    _id: profile?._id || user._id,
    userId: {
      _id: user._id,
      name: [user.firstName, user.lastName].filter(Boolean).join(' ') || 'Trainer',
      firstName: user.firstName,
      lastName: user.lastName,
      profileImage: user.profileImage,
      gender: user.gender,
      bio: user.bio,
    },
    name: [user.firstName, user.lastName].filter(Boolean).join(' ') || 'Trainer',
    specialization: profile?.specialization?.length ? profile.specialization : null,
    qualification: profile?.qualification || null,
    certifications: profile?.certifications?.length ? profile.certifications : null,
    experience: profile?.experience ?? null,
    bio: profile?.bio || user.bio || null,
    hourlyRate: profile?.hourlyRate ?? null,
    rating: profile?.rating ?? null,
    reviewsCount: profile?.reviewsCount ?? null,
    isAvailable: profile?.isAvailable !== false,
  };

  res.status(HTTP_STATUS.OK).json({
    success: true,
    trainer: result,
    data: result,
  });
});

/**
 * Protected: Check current member's personal trainer eligibility & active trainer
 * GET /api/v1/trainers/eligibility
 */
export const getTrainerEligibility = asyncHandler(async (req, res) => {
  const userId = req.userId;
  const entitlement = await hasPersonalTrainerAccess(userId);

  res.status(HTTP_STATUS.OK).json({
    success: true,
    isEligible: entitlement.hasAccess,
    isPendingVerification: Boolean(entitlement.isPendingVerification),
    hasPersonalTrainerAccess: entitlement.hasAccess,
    hasTrainer: entitlement.hasTrainer,
    planName: entitlement.planName || null,
    reason: entitlement.reason || null,
    message: entitlement.message || (entitlement.hasAccess ? 'Personal trainer access active.' : 'Active membership plan required.'),
    features: entitlement.features,
    trainer: entitlement.trainer || null,
    membership: entitlement.membership || null,
  });
});

/**
 * Protected: Member selects a personal trainer
 * POST /api/v1/trainers/select
 */
export const selectTrainer = asyncHandler(async (req, res) => {
  const userId = req.userId;
  const { trainerId } = req.body;

  if (!trainerId) {
    throw new ValidationError('Please provide a trainer ID');
  }

  // 1. Verify Member's active membership & eligibility
  const membershipStatus = await checkUserMembershipStatus(userId);

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
      message: 'Active membership required before selecting a trainer.',
    });
  }

  const membership = membershipStatus.membership;
  const plan = membership.planId || membership.packageId;
  const isPTIncluded = checkPlanIncludesPT(plan);
  if (!isPTIncluded) {
    return res.status(HTTP_STATUS.FORBIDDEN).json({
      success: false,
      message: 'Your purchased plan does not include personal training. Please upgrade your plan.',
    });
  }

  // 2. Verify Trainer exists and is active
  let trainerUser = await User.findById(trainerId);
  if (!trainerUser) {
    const profile = await TrainerProfile.findById(trainerId);
    if (profile) {
      trainerUser = await User.findById(profile.userId);
    }
  }

  if (!trainerUser || trainerUser.role !== 'TRAINER' || trainerUser.isActive === false) {
    throw new NotFoundError('Selected trainer is not currently available for bookings.');
  }

  // 3. Find old active assignment (if any) to clean up
  const oldAssignment = await TrainerAssignment.findOne({ memberId: userId, status: 'ACTIVE' });

  if (oldAssignment && oldAssignment.trainerId.toString() !== trainerUser._id.toString()) {
    const oldTrainerId = oldAssignment.trainerId;

    // Cancel all future confirmed bookings with the old trainer
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    await PersonalTrainingBooking.updateMany(
      {
        memberId: userId,
        trainerId: oldTrainerId,
        sessionDate: { $gte: todayStart },
        status: 'CONFIRMED',
      },
      { status: 'CANCELLED', cancelledAt: new Date() }
    );

    // Notify old trainer
    const memberUser2 = await User.findById(userId);
    const oldTrainerUser = await User.findById(oldTrainerId);
    const memberName2 = memberUser2 ? [memberUser2.firstName, memberUser2.lastName].filter(Boolean).join(' ') : 'Member';
    const oldCoachName = oldTrainerUser ? [oldTrainerUser.firstName, oldTrainerUser.lastName].filter(Boolean).join(' ') : 'Coach';
    await Notification.create({
      title: 'Trainee Changed Trainer',
      message: `${memberName2} has selected a different trainer. Their upcoming sessions with you have been released.`,
      type: 'warning',
      createdBy: 'System',
    }).catch((err) => logger.warn(`Notification error: ${err.message}`));

    logger.info(`Cancelled future PT bookings for member ${userId} with old trainer ${oldTrainerId}`);
  }

  // Deactivate any prior active assignment
  await TrainerAssignment.updateMany(
    { memberId: userId, status: 'ACTIVE' },
    { status: 'COMPLETED', completedAt: new Date() }
  );

  // 4. Create new authoritative assignment
  const newAssignment = new TrainerAssignment({
    memberId: userId,
    trainerId: trainerUser._id,
    membershipId: membership._id,
    packageId: plan?._id,
    status: 'ACTIVE',
    assignedAt: new Date(),
  });
  await newAssignment.save();

  // 5. Sync trainerId on active Membership record
  membership.trainerId = trainerUser._id;
  await membership.save();

  logger.info(`Trainer ${trainerUser.email} assigned to member ${userId}`);

  // Notify the new trainer
  const memberUserForNotif = await User.findById(userId);
  const memberNameForNotif = memberUserForNotif ? [memberUserForNotif.firstName, memberUserForNotif.lastName].filter(Boolean).join(' ') : 'A member';
  const newCoachName = [trainerUser.firstName, trainerUser.lastName].filter(Boolean).join(' ');
  await Notification.create({
    title: 'New Trainee Assigned',
    message: `${memberNameForNotif} has selected you as their Personal Trainer.`,
    type: 'info',
    createdBy: 'System',
  }).catch((err) => logger.warn(`Notification error: ${err.message}`));

  const profile = await TrainerProfile.findOne({ userId: trainerUser._id });

  res.status(HTTP_STATUS.CREATED).json({
    success: true,
    message: `Coach ${newCoachName} has been assigned as your Personal Trainer!`,
    assignment: newAssignment,
    trainer: {
      _id: profile?._id || trainerUser._id,
      userId: trainerUser._id,
      name: newCoachName,
      profileImage: trainerUser.profileImage,
      specialization: profile?.specialization?.length ? profile.specialization : null,
      rating: profile?.rating ?? null,
    },
  });
});

/**
 * Protected: Get selected trainer & upcoming bookings for current member
 * GET /api/v1/trainers/my-trainer
 */
export const getMyTrainer = asyncHandler(async (req, res) => {
  const userId = req.userId;

  const assignment = await TrainerAssignment.findOne({
    memberId: userId,
    status: 'ACTIVE',
  }).populate('trainerId', 'firstName lastName email profileImage bio');

  if (!assignment || !assignment.trainerId) {
    return res.status(HTTP_STATUS.OK).json({
      success: true,
      hasTrainer: false,
      trainer: null,
      message: 'No active trainer selected.',
    });
  }

  const tUser = assignment.trainerId;
  const profile = await TrainerProfile.findOne({ userId: tUser._id });

  // Get current week active count
  const currentWeek = getWeekRange(new Date());
  const weeklyBookingsCount = await getMemberWeeklyBookingCount(userId, currentWeek.weekStart, currentWeek.weekEnd);

  // Fetch upcoming confirmed bookings
  const upcomingBookings = await PersonalTrainingBooking.find({
    memberId: userId,
    trainerId: tUser._id,
    sessionDate: { $gte: new Date(new Date().setHours(0, 0, 0, 0)) },
    status: 'CONFIRMED',
  }).sort({ sessionDate: 1, startTime: 1 });

  // Fetch active days count for trainer
  const activeDaysCount = await TrainerAvailability.countDocuments({
    trainerId: tUser._id,
    isAvailable: true,
  });

  res.status(HTTP_STATUS.OK).json({
    success: true,
    hasTrainer: true,
    trainer: {
      _id: profile?._id || tUser._id,
      userId: tUser._id,
      name: [tUser.firstName, tUser.lastName].filter(Boolean).join(' '),
      email: tUser.email,
      profileImage: tUser.profileImage,
      specialization: profile?.specialization || ['Strength & Conditioning'],
      qualification: profile?.qualification || 'Certified Personal Trainer',
      certifications: profile?.certifications || ['NASM CPT'],
      experience: profile?.experience || 4,
      rating: profile?.rating || 4.9,
      bio: profile?.bio || tUser.bio,
      availableDaysCount: activeDaysCount || 5,
    },
    weeklyBookingsCount,
    maxWeeklyLimit: 4,
    remainingWeeklyCapacity: Math.max(0, 4 - weeklyBookingsCount),
    upcomingBookings,
  });
});

/**
 * Protected (Member): Get trainer weekly slots with live status
 * GET /api/v1/trainers/:trainerId/weekly-slots
 */
export const getWeeklySlotsForTrainer = asyncHandler(async (req, res) => {
  const { trainerId } = req.params;
  const { date } = req.query;

  // Resolve trainer user id
  let trainerUserId = trainerId;
  const profile = await TrainerProfile.findById(trainerId);
  if (profile && profile.userId) {
    trainerUserId = profile.userId;
  }

  const trainerUser = await User.findById(trainerUserId);
  if (!trainerUser || trainerUser.role !== 'TRAINER') {
    throw new NotFoundError('Trainer not found');
  }

  const targetDate = date || formatDateOnly(new Date());
  const scheduleData = await getCoachWeeklySchedule(trainerUserId, targetDate, req.userId);

  // Member's current weekly booking count in this targeted week
  const weekInfo = getWeekRange(targetDate);
  const memberWeeklyBookings = await getMemberWeeklyBookingCount(req.userId, weekInfo.weekStart, weekInfo.weekEnd);

  res.status(HTTP_STATUS.OK).json({
    success: true,
    trainerId: trainerUserId,
    targetDate,
    weekStart: scheduleData.weekStart,
    weekEnd: scheduleData.weekEnd,
    memberWeeklyBookings,
    maxWeeklyLimit: 4,
    remainingWeeklyCapacity: Math.max(0, 4 - memberWeeklyBookings),
    summary: scheduleData.summary,
    days: scheduleData.days,
  });
});

/**
 * Legacy / Compatibility: Get trainer availability for a single date
 * GET /api/v1/trainers/:trainerId/availability
 */
export const getTrainerAvailability = asyncHandler(async (req, res) => {
  const { trainerId } = req.params;
  const { date } = req.query;

  let trainerUserId = trainerId;
  const profile = await TrainerProfile.findById(trainerId);
  if (profile && profile.userId) {
    trainerUserId = profile.userId;
  }

  const targetDate = date || formatDateOnly(new Date());
  const scheduleData = await getCoachWeeklySchedule(trainerUserId, targetDate, req.userId);
  const targetDay = scheduleData.days.find((d) => d.date === targetDate) || scheduleData.days[0];

  res.status(HTTP_STATUS.OK).json({
    success: true,
    trainerId: trainerUserId,
    date: targetDate,
    slots: targetDay ? targetDay.slots : [],
    summary: scheduleData.summary,
  });
});

/**
 * Protected: Book single or multi sessions with trainer
 * POST /api/v1/trainers/book & POST /api/v1/trainers/multi-book
 */
export const bookTrainerSession = asyncHandler(async (req, res) => {
  const userId = req.userId;
  const {
    trainerId,
    sessionDate,
    date,
    timeSlot,
    startTime: startTimeInput,
    endTime: endTimeInput,
    focusArea,
    notes,
    sessions: rawSessions,
  } = req.body;

  // 1. Verify member eligibility & PT entitlement
  const membershipStatus = await checkUserMembershipStatus(userId);
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
      message: 'Active membership required to book trainer sessions.',
    });
  }

  const membership = membershipStatus.membership;
  const plan = membership.planId || membership.packageId;
  const isPTIncluded = checkPlanIncludesPT(plan);
  if (!isPTIncluded) {
    return res.status(HTTP_STATUS.FORBIDDEN).json({
      success: false,
      message: 'Personal training is not included in your membership plan.',
    });
  }

  // 2. Resolve trainer user ID
  let targetTrainerUserId = trainerId;
  const profile = await TrainerProfile.findById(trainerId);
  if (profile && profile.userId) {
    targetTrainerUserId = profile.userId;
  }

  const trainerUser = await User.findById(targetTrainerUserId);
  if (!trainerUser || trainerUser.role !== 'TRAINER' || trainerUser.isActive === false) {
    throw new NotFoundError('Selected trainer is not available.');
  }

  const memberUser = await User.findById(userId);

  // Normalize requested sessions into a list
  let sessionRequests = [];

  if (Array.isArray(rawSessions) && rawSessions.length > 0) {
    sessionRequests = rawSessions;
  } else {
    const targetDate = sessionDate || date;
    if (!targetDate || (!timeSlot && !startTimeInput)) {
      throw new ValidationError('Please provide session date and time slot.');
    }
    sessionRequests = [
      {
        sessionDate: targetDate,
        date: targetDate,
        timeSlot,
        startTime: startTimeInput,
        endTime: endTimeInput,
        focusArea: focusArea || '1-on-1 Coaching & Form Technique',
        notes: notes || '',
      },
    ];
  }

  if (sessionRequests.length === 0) {
    throw new ValidationError('No sessions specified for booking.');
  }

  // Expand recurring weekday requests into concrete date requests across the FULL membership duration
  const expandedSessionRequests = [];
  const membershipEndDate = membership.endDate
    ? new Date(membership.endDate)
    : new Date(Date.now() + 30 * 86400000);
  membershipEndDate.setHours(23, 59, 59, 999);

  for (const sess of sessionRequests) {
    if (sess.recurring || sess.dayOfWeek !== undefined) {
      const targetDayOfWeek = parseInt(
        sess.dayOfWeek !== undefined
          ? sess.dayOfWeek
          : (sess.date ? new Date(sess.date).getDay() : 1),
        10
      );

      // Generate a unique ID to group all occurrences of this one weekly slot selection
      const recurringSlotId = `${userId}_${targetDayOfWeek}_${normalizeTime24(sess.startTime || (sess.timeSlot ? sess.timeSlot.split(' - ')[0] : '00:00'))}_${Date.now()}`;

      const startDate = new Date();
      startDate.setHours(0, 0, 0, 0);

      // Find the first occurrence of targetDayOfWeek from today onwards
      let currentPointer = new Date(startDate);
      while (currentPointer.getDay() !== targetDayOfWeek) {
        currentPointer.setDate(currentPointer.getDate() + 1);
      }

      // Generate one occurrence per week until membership end date
      let w = 0;
      while (true) {
        const occurDate = new Date(currentPointer);
        occurDate.setDate(occurDate.getDate() + w * 7);
        occurDate.setHours(0, 0, 0, 0);
        if (occurDate > membershipEndDate) break;

        const dateStr = formatDateOnly(occurDate);
        expandedSessionRequests.push({
          ...sess,
          sessionDate: dateStr,
          date: dateStr,
          isRecurring: true,
          recurringDayOfWeek: targetDayOfWeek,
          recurringSlotId,
        });
        w++;
      }
    } else {
      expandedSessionRequests.push(sess);
    }
  }

  sessionRequests = expandedSessionRequests;

  // Deduplicate session requests by date + startTime within the batch
  const seenSlotKeys = new Set();
  const uniqueRequests = [];
  for (const s of sessionRequests) {
    const sDate = s.sessionDate || s.date;
    let sTime = null;
    if (s.timeSlot) {
      sTime = normalizeTime24(s.timeSlot.split(' - ')[0]);
    } else if (s.startTime) {
      sTime = normalizeTime24(s.startTime);
    }
    const key = `${sDate}_${sTime}`;
    if (!seenSlotKeys.has(key)) {
      seenSlotKeys.add(key);
      uniqueRequests.push(s);
    }
  }
  sessionRequests = uniqueRequests;

  // 3. Validate past dates/times & Group requested sessions by calendar week (Monday-Sunday) to validate weekly 4-session limit
  const now = new Date();
  const weekSessionsMap = new Map();

  for (const sess of sessionRequests) {
    const sessDateStr = sess.sessionDate || sess.date;
    if (!sessDateStr) {
      throw new ValidationError('Each session must specify a valid date.');
    }

    // Determine startTime and endTime
    let startTime = null;
    let endTime = null;
    if (sess.timeSlot) {
      if (sess.timeSlot.includes(' - ')) {
        const parts = sess.timeSlot.split(' - ');
        startTime = normalizeTime24(parts[0]);
        endTime = normalizeTime24(parts[1]) || minutesToTime(timeToMinutes(startTime) + 60);
      } else {
        startTime = normalizeTime24(sess.timeSlot);
        endTime = minutesToTime(timeToMinutes(startTime) + 60);
      }
    } else if (sess.startTime) {
      startTime = normalizeTime24(sess.startTime);
      endTime = sess.endTime ? normalizeTime24(sess.endTime) : minutesToTime(timeToMinutes(startTime) + 60);
    }

    if (!startTime || !endTime) {
      throw new ValidationError('Invalid session time slot specified.');
    }

    // Verify slot is not in the past
    const [y, m, d] = sessDateStr.split('-').map(Number);
    const [sh, sm] = startTime.split(':').map(Number);
    const slotStartDateTime = new Date(y, m - 1, d, sh, sm, 0, 0);

    if (slotStartDateTime < now) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        success: false,
        message: `Cannot book session in the past (${sessDateStr} at ${format12Hour(startTime)}).`,
      });
    }

    const weekInfo = getWeekRange(sessDateStr);
    const weekKey = weekInfo.weekStartStr;

    if (!weekSessionsMap.has(weekKey)) {
      weekSessionsMap.set(weekKey, {
        weekStart: weekInfo.weekStart,
        weekEnd: weekInfo.weekEnd,
        weekStartStr: weekInfo.weekStartStr,
        weekEndStr: weekInfo.weekEndStr,
        sessions: [],
      });
    }

    weekSessionsMap.get(weekKey).sessions.push({
      ...sess,
      startTime,
      endTime,
    });
  }

  // Validate limit per week
  for (const [weekKey, weekGroup] of weekSessionsMap.entries()) {
    const currentActiveCount = await getMemberWeeklyBookingCount(
      userId,
      weekGroup.weekStart,
      weekGroup.weekEnd
    );

    const requestedCount = weekGroup.sessions.length;

    if (currentActiveCount + requestedCount > 4) {
      return res.status(HTTP_STATUS.CONFLICT).json({
        success: false,
        message: `You have already booked ${currentActiveCount} session(s) for the week of ${weekGroup.weekStartStr}. Booking ${requestedCount} more would exceed the maximum limit of 4 sessions per week.`,
        currentActiveCount,
        maxWeeklyLimit: 4,
      });
    }
  }

  // 4. Fetch Coach's weekly availability rules to validate each slot
  const coachRules = await TrainerAvailability.find({ trainerId: targetTrainerUserId }).lean();
  const ruleMap = new Map();
  coachRules.forEach((r) => ruleMap.set(r.dayOfWeek, r));

  // Additional pre-validation of coach rules & slot duration
  for (const sess of sessionRequests) {
    const sessDateStr = sess.sessionDate || sess.date;
    const parsedDate = new Date(sessDateStr);
    const startTime = sess.startTime || normalizeTime24(sess.timeSlot?.split(' - ')[0]);
    const endTime = sess.endTime || minutesToTime(timeToMinutes(startTime) + 60);

    const startMin = timeToMinutes(startTime);
    const endMin = timeToMinutes(endTime);
    if (endMin - startMin !== 60) {
      throw new ValidationError(`Training session must be exactly 1 hour. Received: ${startTime} to ${endTime}`);
    }

    const dayOfWeek = parsedDate.getDay();
    const rule = ruleMap.get(dayOfWeek);
    if (rule && !rule.isAvailable) {
      return res.status(HTTP_STATUS.CONFLICT).json({
        success: false,
        message: `Coach is not available on ${DAY_NAMES[dayOfWeek]}s.`,
      });
    }

    if (rule && rule.isAvailable) {
      const ruleStartMin = timeToMinutes(rule.startTime);
      const ruleEndMin = timeToMinutes(rule.endTime);
      if (startMin < ruleStartMin || endMin > ruleEndMin) {
        return res.status(HTTP_STATUS.CONFLICT).json({
          success: false,
          message: `Requested slot (${format12Hour(startTime)} - ${format12Hour(endTime)}) is outside coach's working hours (${format12Hour(rule.startTime)} - ${format12Hour(rule.endTime)}).`,
        });
      }
    }
  }

  // 5. ATOMIC SESSION & TRANSACTION LIFECYCLE
  let session = null;

  try {
    session = await mongoose.startSession();
    session.startTransaction();
  } catch (transErr) {
    logger.error(`Failed to start database transaction for booking: ${transErr.message}`);
    if (session) {
      try { session.endSession(); } catch (_) {}
    }
    return res.status(HTTP_STATUS.SERVICE_UNAVAILABLE).json({
      success: false,
      message: 'Booking service is temporarily unavailable. Please try again.',
    });
  }

  const createdBookings = [];
  const pendingNotifications = [];

  try {
    const saveOpts = { session };

    for (const sess of sessionRequests) {
      const sessDateStr = sess.sessionDate || sess.date;
      const parsedDate = new Date(sessDateStr);
      parsedDate.setHours(0, 0, 0, 0);

      const startTime = sess.startTime || normalizeTime24(sess.timeSlot?.split(' - ')[0]);
      const endTime = sess.endTime || minutesToTime(timeToMinutes(startTime) + 60);

      const startOfDay = new Date(parsedDate);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(parsedDate);
      endOfDay.setHours(23, 59, 59, 999);

      // Check if slot is already booked by anyone
      const existingQuery = PersonalTrainingBooking.findOne({
        trainerId: targetTrainerUserId,
        sessionDate: { $gte: startOfDay, $lte: endOfDay },
        startTime,
        status: 'CONFIRMED',
      });

      if (session) {
        existingQuery.session(session);
      }

      const existingBooking = await existingQuery;

      if (existingBooking) {
        if (existingBooking.memberId.toString() === userId.toString()) {
          createdBookings.push(existingBooking);
          continue;
        }

        if (session) {
          await session.abortTransaction();
        }

        return res.status(HTTP_STATUS.CONFLICT).json({
          success: false,
          message: `The slot on ${formatDateOnly(parsedDate)} at ${format12Hour(startTime)} - ${format12Hour(endTime)} is already booked by another member. Please choose a different slot.`,
        });
      }

      // Create booking document
      const booking = new PersonalTrainingBooking({
        trainerId: targetTrainerUserId,
        memberId: userId,
        packageId: plan?._id,
        sessionDate: parsedDate,
        startTime,
        endTime,
        focusArea: sess.focusArea || '1-on-1 Coaching & Form Technique',
        notes: sess.notes || '',
        status: 'CONFIRMED',
        isRecurring: Boolean(sess.isRecurring),
        dayOfWeek: sess.recurringDayOfWeek ?? parsedDate.getDay(),
        recurringSlotId: sess.recurringSlotId || null,
      });

      await booking.save(saveOpts);
      createdBookings.push(booking);

      // Queue Notifications (only sent post-commit!)
      const formattedDate = formatDateOnly(parsedDate);
      const formattedSlot = `${format12Hour(startTime)} - ${format12Hour(endTime)}`;
      const memberName = memberUser?.name || [memberUser?.firstName, memberUser?.lastName].filter(Boolean).join(' ') || 'Member';
      const coachName = trainerUser?.name || [trainerUser?.firstName, trainerUser?.lastName].filter(Boolean).join(' ') || 'Coach';

      pendingNotifications.push({
        title: 'New Training Session Booked',
        message: `${memberName} booked a session for ${formattedDate} (${formattedSlot}). Focus: ${booking.focusArea}`,
        type: 'info',
        createdBy: memberName,
      });

      pendingNotifications.push({
        title: 'Training Session Confirmed',
        message: `Your 1-on-1 session with Coach ${coachName} on ${formattedDate} (${formattedSlot}) is confirmed!`,
        type: 'success',
        createdBy: 'System',
      });
    }

    // Update membership PT usage & active trainer assignment
    membership.ptSessionsUsedThisMonth = (membership.ptSessionsUsedThisMonth || 0) + createdBookings.length;
    await membership.save(saveOpts);

    const assignmentQuery = TrainerAssignment.findOne({
      memberId: userId,
      trainerId: targetTrainerUserId,
      status: 'ACTIVE',
    });

    if (session) {
      assignmentQuery.session(session);
    }

    const existingAssignment = await assignmentQuery;

    if (!existingAssignment) {
      await TrainerAssignment.create(
        [
          {
            memberId: userId,
            trainerId: targetTrainerUserId,
            membershipId: membership._id,
            packageId: plan?._id,
            status: 'ACTIVE',
          },
        ],
        saveOpts
      );
    }

    // COMMIT TRANSACTION
    if (session) {
      await session.commitTransaction();
    }

    // Post-Commit Notifications
    for (const notif of pendingNotifications) {
      await Notification.create(notif).catch((err) => logger.warn(`Notification error: ${err.message}`));
    }

    logger.info(`Successfully booked ${createdBookings.length} PT sessions for member ${userId}`);

    res.status(HTTP_STATUS.CREATED).json({
      success: true,
      message:
        createdBookings.length === 1
          ? 'Personal training session successfully booked and confirmed!'
          : `Successfully confirmed ${createdBookings.length} personal training sessions!`,
      bookings: createdBookings,
      booking: createdBookings[0],
    });
  } catch (error) {
    if (session) {
      try {
        await session.abortTransaction();
      } catch (abortErr) {
        logger.warn(`Failed to abort transaction: ${abortErr.message}`);
      }
    }

    // Handle MongoDB duplicate key collision on unique compound index
    if (error.code === 11000 || /E11000/i.test(error.message)) {
      return res.status(HTTP_STATUS.CONFLICT).json({
        success: false,
        message: 'This time slot was just booked by another member. Please choose a different time.',
      });
    }
    throw error;
  } finally {
    if (session) {
      try {
        session.endSession();
      } catch (_) {}
    }
  }
});

/**
 * Protected: Cancel personal training booking
 * DELETE /api/v1/trainers/bookings/:bookingId
 */
export const cancelTrainerBooking = asyncHandler(async (req, res) => {
  const { bookingId } = req.params;
  const userId = req.userId;

  const booking = await PersonalTrainingBooking.findById(bookingId)
    .populate('memberId', 'firstName lastName name email')
    .populate('trainerId', 'firstName lastName name email');

  if (!booking) {
    throw new NotFoundError('Booking not found');
  }

  // Authorization: user must be either the member, the trainer, or an admin
  const isMember = booking.memberId && booking.memberId._id.toString() === userId.toString();
  const isTrainer = booking.trainerId && booking.trainerId._id.toString() === userId.toString();
  const isAdmin = req.user?.role === 'ADMIN' || req.user?.role === 'SYSTEM_ADMIN' || req.user?.isSystemAdmin;

  if (!isMember && !isTrainer && !isAdmin) {
    throw new UnauthorizedError('You are not authorized to cancel this booking.');
  }

  booking.status = 'CANCELLED';
  booking.cancelledAt = new Date();
  await booking.save();

  const formattedDate = formatDateOnly(booking.sessionDate);
  const formattedSlot = `${format12Hour(booking.startTime)} - ${format12Hour(booking.endTime)}`;
  const memberName = booking.memberId?.name || [booking.memberId?.firstName, booking.memberId?.lastName].filter(Boolean).join(' ') || 'Member';
  const coachName = booking.trainerId?.name || [booking.trainerId?.firstName, booking.trainerId?.lastName].filter(Boolean).join(' ') || 'Coach';

  // Dispatch cancellation notification
  await Notification.create({
    title: 'Training Session Cancelled',
    message: `Training session on ${formattedDate} (${formattedSlot}) with Coach ${coachName} and member ${memberName} has been cancelled.`,
    type: 'warning',
    createdBy: isMember ? memberName : coachName,
  }).catch((err) => logger.warn(`Notification error: ${err.message}`));

  logger.info(`Personal training booking cancelled: ${bookingId} by user ${userId}`);

  res.status(HTTP_STATUS.OK).json({
    success: true,
    message: 'Training session cancelled successfully. The slot is now open.',
    data: booking,
    booking,
  });
});

/**
 * Protected (Coach/Admin): Update booking status (e.g. COMPLETED, NO_SHOW)
 * PATCH /api/v1/trainers/bookings/:bookingId/status
 */
export const updateBookingStatus = asyncHandler(async (req, res) => {
  const { bookingId } = req.params;
  const { status } = req.body;

  if (!['CONFIRMED', 'COMPLETED', 'CANCELLED', 'NO_SHOW'].includes(status)) {
    throw new ValidationError('Invalid booking status.');
  }

  const booking = await PersonalTrainingBooking.findById(bookingId);
  if (!booking) {
    throw new NotFoundError('Booking not found');
  }

  const isTrainer = booking.trainerId.toString() === req.userId.toString();
  const isAdmin = req.user?.role === 'ADMIN' || req.user?.role === 'SYSTEM_ADMIN' || req.user?.isSystemAdmin;

  if (!isTrainer && !isAdmin) {
    throw new UnauthorizedError('Only the assigned coach or an administrator can update session status.');
  }

  booking.status = status;
  if (status === 'CANCELLED') {
    booking.cancelledAt = new Date();
  }
  await booking.save();

  res.status(HTTP_STATUS.OK).json({
    success: true,
    message: `Session status updated to ${status}.`,
    booking,
  });
});

/**
 * Protected (Coach): Get Coach Training Space (Real sessions & active roster)
 * GET /api/v1/trainers/training-space
 */
export const getCoachTrainingSpace = asyncHandler(async (req, res) => {
  const trainerUserId = req.userId;

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todayEnd = new Date();
  todayEnd.setHours(23, 59, 59, 999);

  // 1. Today's sessions
  const todayBookings = await PersonalTrainingBooking.find({
    trainerId: trainerUserId,
    sessionDate: { $gte: todayStart, $lte: todayEnd },
    status: { $in: ['CONFIRMED', 'COMPLETED', 'NO_SHOW'] },
  })
    .populate('memberId', 'firstName lastName name email phone profileImage weight height')
    .sort({ startTime: 1 })
    .lean();

  // 2. Upcoming sessions (future days)
  const upcomingBookings = await PersonalTrainingBooking.find({
    trainerId: trainerUserId,
    sessionDate: { $gt: todayEnd },
    status: 'CONFIRMED',
  })
    .populate('memberId', 'firstName lastName name email phone profileImage weight height')
    .sort({ sessionDate: 1, startTime: 1 })
    .limit(20)
    .lean();

  // 3. Completed historical sessions count
  const completedCount = await PersonalTrainingBooking.countDocuments({
    trainerId: trainerUserId,
    status: 'COMPLETED',
  });

  // 4. Active trainee roster: strictly members who:
  //    (a) have an active membership plan including Personal Trainer access
  //    (b) have selected this specific trainer
  //    (c) are currently actively assigned to this trainer
  const activeAssignments = await TrainerAssignment.find({
    trainerId: trainerUserId,
    status: 'ACTIVE',
  })
    .populate('memberId', 'firstName lastName name email phone profileImage weight height')
    .lean();

  const activeTrainees = [];
  const processedMemberIds = new Set();

  for (const a of activeAssignments) {
    if (!a.memberId || !a.memberId._id) continue;
    const memberIdStr = a.memberId._id.toString();
    if (processedMemberIds.has(memberIdStr)) continue;

    // Check personal trainer entitlement and active trainer
    const entitlement = await hasPersonalTrainerAccess(a.memberId._id);
    if (!entitlement.hasAccess) {
      await TrainerAssignment.findByIdAndUpdate(a._id, { status: 'CANCELLED', cancelledAt: new Date() });
      continue; // Member has no active PT entitlement or expired membership
    }

    // Verify this trainer is the currently assigned trainer
    if (!entitlement.trainer || entitlement.trainer.userId.toString() !== trainerUserId.toString()) {
      continue; // Member has selected another trainer or is not assigned to this trainer
    }

    processedMemberIds.add(memberIdStr);
    activeTrainees.push({
      id: a.memberId._id,
      name: a.memberId.name || [a.memberId.firstName, a.memberId.lastName].filter(Boolean).join(' ') || 'Member',
      email: a.memberId.email,
      phone: a.memberId.phone || 'N/A',
      profileImage: a.memberId.profileImage,
      weight: a.memberId.weight || 70,
      height: a.memberId.height || 175,
      assignedAt: a.assignedAt || entitlement.trainer.assignedAt,
      status: 'ACTIVE',
      planName: entitlement.planName || 'Personal Trainer Plan',
      ptSessionsUsed: entitlement.membership?.ptSessionsUsed || 0,
      maxPTSessions: entitlement.membership?.maxPTSessions || 8,
    });
  }

  // Also check active memberships assigned directly with trainerId
  const membershipsWithTrainer = await Membership.find({
    trainerId: trainerUserId,
    status: 'ACTIVE',
    endDate: { $gt: new Date() },
  })
    .populate('memberId', 'firstName lastName name email phone profileImage weight height')
    .populate('userId', 'firstName lastName name email phone profileImage weight height')
    .lean();

  for (const m of membershipsWithTrainer) {
    const member = m.memberId || m.userId;
    if (!member || !member._id) continue;
    const memberIdStr = member._id.toString();
    if (processedMemberIds.has(memberIdStr)) continue;

    const entitlement = await hasPersonalTrainerAccess(member._id);
    if (!entitlement.hasAccess) continue;
    if (!entitlement.trainer || entitlement.trainer.userId.toString() !== trainerUserId.toString()) continue;

    processedMemberIds.add(memberIdStr);
    activeTrainees.push({
      id: member._id,
      name: member.name || [member.firstName, member.lastName].filter(Boolean).join(' ') || 'Member',
      email: member.email,
      phone: member.phone || 'N/A',
      profileImage: member.profileImage,
      weight: member.weight || 70,
      height: member.height || 175,
      assignedAt: m.createdAt,
      status: 'ACTIVE',
      planName: entitlement.planName || 'Personal Trainer Plan',
      ptSessionsUsed: entitlement.membership?.ptSessionsUsed || 0,
      maxPTSessions: entitlement.membership?.maxPTSessions || 8,
    });
  }

  // 5. Weekly summary metrics
  const weekInfo = getWeekRange(new Date());
  const weeklySchedule = await getCoachWeeklySchedule(trainerUserId, new Date(), trainerUserId);

  res.status(HTTP_STATUS.OK).json({
    success: true,
    todaySessions: todayBookings.map((b) => ({
      id: b._id,
      clientName: b.memberId?.name || [b.memberId?.firstName, b.memberId?.lastName].filter(Boolean).join(' ') || 'Member',
      clientEmail: b.memberId?.email,
      clientPhone: b.memberId?.phone || '+94 77 000 0000',
      clientProfileImage: b.memberId?.profileImage,
      date: 'Today',
      sessionDate: formatDateOnly(b.sessionDate),
      timeSlot: `${format12Hour(b.startTime)} - ${format12Hour(b.endTime)}`,
      startTime: b.startTime,
      endTime: b.endTime,
      focus: b.focusArea || '1-on-1 Coaching',
      notes: b.notes,
      status: b.status,
    })),
    upcomingSessions: upcomingBookings.map((b) => ({
      id: b._id,
      clientName: b.memberId?.name || [b.memberId?.firstName, b.memberId?.lastName].filter(Boolean).join(' ') || 'Member',
      clientEmail: b.memberId?.email,
      clientPhone: b.memberId?.phone || '+94 77 000 0000',
      clientProfileImage: b.memberId?.profileImage,
      sessionDate: formatDateOnly(b.sessionDate),
      timeSlot: `${format12Hour(b.startTime)} - ${format12Hour(b.endTime)}`,
      startTime: b.startTime,
      endTime: b.endTime,
      focus: b.focusArea || '1-on-1 Coaching',
      notes: b.notes,
      status: b.status,
    })),
    trainees: activeTrainees,
    stats: {
      todaySessionsCount: todayBookings.length,
      todayRemainingCount: todayBookings.filter((b) => b.status === 'CONFIRMED').length,
      activeClientsCount: activeTrainees.length,
      completedSessionsCount: completedCount,
      availableDaysThisWeek: weeklySchedule.summary.availableDays,
      bookedSlotsThisWeek: weeklySchedule.summary.bookedThisWeek,
      openSlotsThisWeek: weeklySchedule.summary.openSlotsThisWeek,
      totalWeeklySlots: weeklySchedule.summary.totalWeeklySlots,
    },
  });
});

/**
 * Protected (Coach): Get coach's own weekly availability configuration & stats
 * GET /api/v1/trainers/weekly-availability
 */
export const getCoachWeeklyAvailability = asyncHandler(async (req, res) => {
  const trainerUserId = req.userId;

  const rules = await TrainerAvailability.find({ trainerId: trainerUserId }).lean();
  const ruleMap = new Map();
  rules.forEach((r) => ruleMap.set(r.dayOfWeek, r));

  // Build standard 7-day configuration (Ordered Mon..Sun)
  const defaultSchedule = ORDERED_WEEK_DAYS.map((dayOfWeek) => {
    const existing = ruleMap.get(dayOfWeek);
    const isAvail = existing ? existing.isAvailable !== false : dayOfWeek !== 0; // Default Sun off
    const startTime = existing?.startTime ? normalizeTime24(existing.startTime) : '09:00';
    const endTime = existing?.endTime ? normalizeTime24(existing.endTime) : '17:00';

    const slots = isAvail ? generateHourlySlots(startTime, endTime) : [];

    return {
      dayOfWeek,
      dayName: DAY_NAMES[dayOfWeek],
      isAvailable: isAvail,
      startTime,
      endTime,
      formattedStartTime: format12Hour(startTime),
      formattedEndTime: format12Hour(endTime),
      slotsCount: slots.length,
      slots,
    };
  });

  const scheduleData = await getCoachWeeklySchedule(trainerUserId, new Date(), trainerUserId);

  res.status(HTTP_STATUS.OK).json({
    success: true,
    schedule: defaultSchedule,
    summary: scheduleData.summary,
    liveWeek: scheduleData,
  });
});

/**
 * Protected (Coach): Update coach's weekly availability with conflict protection
 * PUT /api/v1/trainers/weekly-availability
 */
export const updateCoachWeeklyAvailability = asyncHandler(async (req, res) => {
  const trainerUserId = req.userId;
  const { schedule, days } = req.body;

  const updatedSchedule = schedule || days;
  if (!Array.isArray(updatedSchedule) || updatedSchedule.length === 0) {
    throw new ValidationError('Please provide a valid weekly schedule array.');
  }

  // 1. Validate start/end times and complete 1-hour durations
  for (const day of updatedSchedule) {
    const dayOfWeek = parseInt(day.dayOfWeek, 10);
    if (isNaN(dayOfWeek) || dayOfWeek < 0 || dayOfWeek > 6) {
      throw new ValidationError(`Invalid dayOfWeek: ${day.dayOfWeek}`);
    }

    if (day.isAvailable !== false) {
      const startTime = normalizeTime24(day.startTime);
      const endTime = normalizeTime24(day.endTime);

      if (!startTime || !endTime) {
        throw new ValidationError(`Valid start and end times required for ${DAY_NAMES[dayOfWeek]}.`);
      }

      const startMin = timeToMinutes(startTime);
      const endMin = timeToMinutes(endTime);

      if (startMin >= endMin) {
        throw new ValidationError(`Start time (${startTime}) must be before end time (${endTime}) for ${DAY_NAMES[dayOfWeek]}.`);
      }

      if (endMin - startMin < 60) {
        throw new ValidationError(`Availability window must be at least 1 hour for ${DAY_NAMES[dayOfWeek]}.`);
      }
    }
  }

  // 2. Check for conflicts with confirmed future bookings
  const conflicts = await checkAvailabilityConflicts(trainerUserId, updatedSchedule);
  if (conflicts.length > 0) {
    return res.status(HTTP_STATUS.CONFLICT).json({
      success: false,
      message: `You have ${conflicts.length} confirmed future booking(s) that conflict with this new availability schedule. Please reschedule or cancel those sessions before reducing your hours.`,
      conflicts,
    });
  }

  // 3. Upsert availability rules in database
  for (const day of updatedSchedule) {
    const dayOfWeek = parseInt(day.dayOfWeek, 10);
    const isAvail = Boolean(day.isAvailable);
    const startTime = normalizeTime24(day.startTime) || '09:00';
    const endTime = normalizeTime24(day.endTime) || '17:00';

    await TrainerAvailability.findOneAndUpdate(
      { trainerId: trainerUserId, dayOfWeek },
      {
        trainerId: trainerUserId,
        dayOfWeek,
        startTime,
        endTime,
        isAvailable: isAvail,
      },
      { upsert: true, new: true }
    );
  }

  logger.info(`Coach ${trainerUserId} updated weekly availability schedule.`);

  const scheduleData = await getCoachWeeklySchedule(trainerUserId, new Date(), trainerUserId);

  res.status(HTTP_STATUS.OK).json({
    success: true,
    message: 'Weekly training schedule updated successfully!',
    summary: scheduleData.summary,
    liveWeek: scheduleData,
  });
});

/**
 * Protected: Member's own PT bookings
 * GET /api/v1/trainers/my-bookings
 */
export const getMyBookings = asyncHandler(async (req, res) => {
  const userId = req.userId;

  const bookings = await PersonalTrainingBooking.find({ memberId: userId })
    .populate('trainerId', 'firstName lastName profileImage email')
    .sort({ sessionDate: -1, startTime: -1 });

  res.status(HTTP_STATUS.OK).json({
    success: true,
    bookings,
    count: bookings.length,
  });
});

/**
 * Protected: Trainer updates profile
 * PUT /api/v1/trainers/profile
 */
export const updateTrainerProfile = asyncHandler(async (req, res) => {
  const { specialization, qualification, certifications, experience, bio, hourlyRate } = req.body;

  let trainerProfile = await TrainerProfile.findOne({ userId: req.userId });
  if (!trainerProfile) {
    trainerProfile = new TrainerProfile({ userId: req.userId });
  }

  if (specialization) trainerProfile.specialization = Array.isArray(specialization) ? specialization : [specialization];
  if (qualification) trainerProfile.qualification = qualification;
  if (certifications) trainerProfile.certifications = Array.isArray(certifications) ? certifications : [certifications];
  if (experience !== undefined) trainerProfile.experience = experience;
  if (bio) trainerProfile.bio = bio;
  if (hourlyRate !== undefined) trainerProfile.hourlyRate = hourlyRate;

  await trainerProfile.save();

  res.status(HTTP_STATUS.OK).json({
    success: true,
    message: SUCCESS_MESSAGES.PROFILE_UPDATED,
    data: trainerProfile,
  });
});

/**
 * Protected: Trainer's own profile
 * GET /api/v1/trainers/profile
 */
export const getTrainerProfile = asyncHandler(async (req, res) => {
  const trainerProfile = await TrainerProfile.findOne({ userId: req.userId })
    .populate('userId', 'firstName lastName email phone profileImage');

  if (!trainerProfile) {
    const user = await User.findById(req.userId);
    return res.status(HTTP_STATUS.OK).json({
      success: true,
      data: {
        userId: user,
        specialization: ['General Fitness'],
        experience: 2,
        isAvailable: true,
      },
    });
  }

  res.status(HTTP_STATUS.OK).json({
    success: true,
    data: trainerProfile,
  });
});

/**
 * Legacy availability helpers
 */
export const setAvailability = asyncHandler(async (req, res) => {
  const { dayOfWeek, startTime, endTime, isAvailable } = req.body;
  const availability = await TrainerAvailability.findOneAndUpdate(
    { trainerId: req.userId, dayOfWeek: dayOfWeek || 1 },
    {
      trainerId: req.userId,
      dayOfWeek: dayOfWeek || 1,
      startTime: startTime || '09:00',
      endTime: endTime || '17:00',
      isAvailable: isAvailable !== false,
    },
    { upsert: true, new: true }
  );
  res.status(HTTP_STATUS.CREATED).json({ success: true, data: availability });
});

export const updateAvailability = asyncHandler(async (req, res) => {
  const { availabilityId } = req.params;
  const updated = await TrainerAvailability.findByIdAndUpdate(availabilityId, req.body, { new: true });
  res.status(HTTP_STATUS.OK).json({ success: true, data: updated });
});

export const deleteAvailability = asyncHandler(async (req, res) => {
  const { availabilityId } = req.params;
  await TrainerAvailability.findByIdAndDelete(availabilityId);
  res.status(HTTP_STATUS.OK).json({ success: true, message: 'Availability removed' });
});

/**
 * Protected (Member): Cancel all future occurrences of a recurring slot selection
 * DELETE /api/v1/trainers/recurring-slots/:recurringSlotId
 *
 * This frees the weekly slot (decreases the 4-slot count) and cancels all future bookings
 * that share the same recurringSlotId. Historical completed/past sessions are preserved.
 */
export const cancelRecurringSlot = asyncHandler(async (req, res) => {
  const { recurringSlotId } = req.params;
  const userId = req.userId;

  if (!recurringSlotId) {
    throw new ValidationError('recurringSlotId is required.');
  }

  // Find all future CONFIRMED bookings with this recurringSlotId that belong to this member
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const futurBookings = await PersonalTrainingBooking.find({
    recurringSlotId,
    memberId: userId,
    sessionDate: { $gte: todayStart },
    status: 'CONFIRMED',
  });

  if (futurBookings.length === 0) {
    return res.status(HTTP_STATUS.OK).json({
      success: true,
      message: 'No future sessions found for this recurring slot. Slot is already released.',
      cancelledCount: 0,
    });
  }

  // Get trainer info for notification
  const sampleBooking = futurBookings[0];
  const trainerUser = await User.findById(sampleBooking.trainerId).select('firstName lastName');
  const memberUser = await User.findById(userId).select('firstName lastName');
  const memberName = memberUser ? [memberUser.firstName, memberUser.lastName].filter(Boolean).join(' ') : 'Member';
  const coachName = trainerUser ? [trainerUser.firstName, trainerUser.lastName].filter(Boolean).join(' ') : 'Coach';

  // Cancel all future occurrences
  const result = await PersonalTrainingBooking.updateMany(
    {
      recurringSlotId,
      memberId: userId,
      sessionDate: { $gte: todayStart },
      status: 'CONFIRMED',
    },
    { status: 'CANCELLED', cancelledAt: new Date() }
  );

  // Notify trainer
  await Notification.create({
    title: 'Recurring Session Slot Released',
    message: `${memberName} has released their recurring weekly training slot. ${result.modifiedCount} future session(s) cancelled.`,
    type: 'warning',
    createdBy: memberName,
  }).catch((err) => logger.warn(`Notification error: ${err.message}`));

  logger.info(`Member ${userId} cancelled recurring slot ${recurringSlotId}: ${result.modifiedCount} bookings cancelled.`);

  res.status(HTTP_STATUS.OK).json({
    success: true,
    message: `Recurring training slot released. ${result.modifiedCount} future session(s) have been cancelled.`,
    cancelledCount: result.modifiedCount,
    recurringSlotId,
  });
});
