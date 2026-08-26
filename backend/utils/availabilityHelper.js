import PersonalTrainingBooking from '../models/PersonalTrainingBooking.js';
import TrainerAvailability from '../models/TrainerAvailability.js';

export const DAY_NAMES = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
];

export const DAY_ABBR = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

// Ordered standard week starting from Monday to Sunday
export const ORDERED_WEEK_DAYS = [1, 2, 3, 4, 5, 6, 0];

/**
 * Format a Date to YYYY-MM-DD cleanly without timezone shift
 */
export const formatDateOnly = (d) => {
  if (!d) return '';
  if (typeof d === 'string') {
    if (/^\d{4}-\d{2}-\d{2}/.test(d)) {
      return d.split('T')[0];
    }
  }
  const date = new Date(d);
  if (isNaN(date.getTime())) return '';

  // If UTC midnight (standard MongoDB stored Date), use UTC getters
  if (date.getUTCHours() === 0 && date.getUTCMinutes() === 0 && date.getUTCSeconds() === 0) {
    const year = date.getUTCFullYear();
    const month = String(date.getUTCMonth() + 1).padStart(2, '0');
    const day = String(date.getUTCDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

/**
 * Safely parse a date string (YYYY-MM-DD) or Date object into a local Date at 00:00:00 without UTC shift
 */
export const parseLocalDate = (dateInput) => {
  if (!dateInput) return new Date();
  if (dateInput instanceof Date) return new Date(dateInput);
  if (typeof dateInput === 'string' && /^\d{4}-\d{2}-\d{2}/.test(dateInput)) {
    const [y, m, d] = dateInput.split('T')[0].split('-').map((n) => parseInt(n, 10));
    return new Date(y, m - 1, d, 0, 0, 0, 0);
  }
  return new Date(dateInput);
};

/**
 * Parse standard or 12h time string to "HH:mm" (24h)
 * e.g. "02:00 PM" -> "14:00", "14:00" -> "14:00", "9:00 AM" -> "09:00"
 */
export const normalizeTime24 = (timeStr) => {
  if (!timeStr) return null;
  const trimmed = String(timeStr).trim();

  // If already "HH:mm" (24-hour)
  if (/^([01]?\d|2[0-3]):[0-5]\d$/.test(trimmed)) {
    const [h, m] = trimmed.split(':').map((n) => parseInt(n, 10));
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
  }

  // Handle 12-hour AM/PM format
  const match = trimmed.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (!match) return null;

  let hh = parseInt(match[1], 10);
  const mm = parseInt(match[2], 10);
  const meridiem = match[3].toUpperCase();

  if (meridiem === 'PM' && hh !== 12) hh += 12;
  if (meridiem === 'AM' && hh === 12) hh = 0;

  return `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
};

/**
 * Convert 24-hour "HH:mm" to user-friendly "h:mm A" (e.g. "14:00" -> "2:00 PM")
 */
export const format12Hour = (time24) => {
  if (!time24) return '';
  const normalized = normalizeTime24(time24) || time24;
  const [hStr, mStr] = normalized.split(':');
  let hh = parseInt(hStr, 10);
  const mm = mStr || '00';
  const meridiem = hh >= 12 ? 'PM' : 'AM';
  hh = hh % 12 || 12;
  return `${hh}:${mm} ${meridiem}`;
};

/**
 * Convert "HH:mm" to total minutes from midnight
 */
export const timeToMinutes = (timeStr) => {
  const normalized = normalizeTime24(timeStr);
  if (!normalized) return 0;
  const [hh, mm] = normalized.split(':').map((n) => parseInt(n, 10));
  return hh * 60 + mm;
};

/**
 * Convert total minutes from midnight back to "HH:mm"
 */
export const minutesToTime = (totalMinutes) => {
  const hh = Math.floor(totalMinutes / 60) % 24;
  const mm = totalMinutes % 60;
  return `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
};

/**
 * Calculates Monday 00:00:00 to Sunday 23:59:59 week range for a target date
 * Returns { weekStart, weekEnd, days: [ { date, dayOfWeek, dayName, dayAbbr, formattedDate } ] }
 */
export const getWeekRange = (dateInput) => {
  let target;
  if (!dateInput) {
    target = new Date();
  } else if (typeof dateInput === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dateInput)) {
    const [y, m, d] = dateInput.split('-').map((n) => parseInt(n, 10));
    target = new Date(y, m - 1, d, 12, 0, 0, 0);
  } else {
    target = new Date(dateInput);
  }

  // Target local components
  const targetYear = target.getFullYear();
  const targetMonth = target.getMonth();
  const targetDateNum = target.getDate();
  const dayOfWeek = target.getDay(); // 0=Sunday, 1=Monday...

  // Monday offset calculation (Monday=1, Sunday=7)
  const isoDay = dayOfWeek === 0 ? 7 : dayOfWeek;
  const mondayOffset = 1 - isoDay;

  const mondayDate = new Date(targetYear, targetMonth, targetDateNum + mondayOffset, 0, 0, 0, 0);
  const sundayDate = new Date(targetYear, targetMonth, targetDateNum + mondayOffset + 6, 23, 59, 59, 999);

  const days = [];
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  for (let i = 0; i < 7; i++) {
    const currentDayDate = new Date(targetYear, targetMonth, targetDateNum + mondayOffset + i, 0, 0, 0, 0);
    const dayJsIndex = currentDayDate.getDay();
    const dateStr = formatDateOnly(currentDayDate);
    const monthName = monthNames[currentDayDate.getMonth()];
    const dayNumber = currentDayDate.getDate();

    days.push({
      date: dateStr,
      dateObj: currentDayDate,
      dayOfWeek: dayJsIndex,
      dayName: DAY_NAMES[dayJsIndex],
      dayAbbr: DAY_ABBR[dayJsIndex],
      formattedDate: `${monthName} ${dayNumber}`,
      fullFormattedDate: `${DAY_NAMES[dayJsIndex]}, ${monthName} ${dayNumber}`,
    });
  }

  return {
    weekStart: mondayDate,
    weekEnd: sundayDate,
    weekStartStr: formatDateOnly(mondayDate),
    weekEndStr: formatDateOnly(sundayDate),
    days,
  };
};

/**
 * Generate 1-hour slots from startTime to endTime
 * e.g. "14:00" to "22:00" -> 8 slots
 */
export const generateHourlySlots = (startTime, endTime) => {
  const startMin = timeToMinutes(startTime);
  const endMin = timeToMinutes(endTime);

  if (startMin >= endMin) {
    return [];
  }

  const slots = [];
  let current = startMin;

  while (current + 60 <= endMin) {
    const slotStart = minutesToTime(current);
    const slotEnd = minutesToTime(current + 60);

    slots.push({
      startTime: slotStart,
      endTime: slotEnd,
      timeSlot: `${slotStart} - ${slotEnd}`,
      label: `${format12Hour(slotStart)} - ${format12Hour(slotEnd)}`,
    });

    current += 60;
  }

  return slots;
};

/**
 * Count member's active confirmed bookings that count toward the 4-per-week
 * cap for a given calendar week.
 *
 * A recurring weekly pick is a standing commitment from the moment it's
 * booked — it occupies one of the member's 4 weekly slots every week going
 * forward, not just in weeks where a dated document happens to already
 * exist for it (the first occurrence of a freshly-picked recurring slot can
 * land in a future week relative to "today"). So recurring slots are
 * counted once per distinct recurringSlotId, independent of weekStart/
 * weekEnd. One-off (non-recurring) bookings still only count for the
 * specific week their literal date falls in.
 */
export const getMemberWeeklyBookingCount = async (memberId, weekStart, weekEnd) => {
  if (!memberId) return 0;

  const recurringSlotIds = await PersonalTrainingBooking.distinct('recurringSlotId', {
    memberId,
    status: 'CONFIRMED',
    isRecurring: true,
    recurringSlotId: { $ne: null },
  });

  const oneOffCount = await PersonalTrainingBooking.countDocuments({
    memberId,
    status: 'CONFIRMED',
    sessionDate: { $gte: weekStart, $lte: weekEnd },
    $or: [{ isRecurring: { $ne: true } }, { isRecurring: { $exists: false } }],
  });

  return recurringSlotIds.length + oneOffCount;
};

/**
 * Get coach weekly schedule for a specific date/week, with live slot states
 */
export const getCoachWeeklySchedule = async (trainerUserId, dateInput, currentUserId = null) => {
  const weekInfo = getWeekRange(dateInput);

  // 1. Fetch coach's configured weekly rules
  const rules = await TrainerAvailability.find({ trainerId: trainerUserId }).lean();
  const ruleMap = new Map();
  rules.forEach((r) => {
    ruleMap.set(r.dayOfWeek, r);
  });

  // 2. Fetch confirmed bookings whose literal date falls in this displayed
  //    week (covers one-off, non-recurring sessions).
  const bookingsInRange = await PersonalTrainingBooking.find({
    trainerId: trainerUserId,
    sessionDate: { $gte: weekInfo.weekStart, $lte: weekInfo.weekEnd },
    status: 'CONFIRMED',
  })
    .populate('memberId', 'firstName lastName name profileImage email')
    .lean();

  // Map bookings by "YYYY-MM-DD_startTime"
  const bookingMap = new Map();
  bookingsInRange.forEach((b) => {
    const dStr = formatDateOnly(b.sessionDate);
    const sTime = normalizeTime24(b.startTime) || b.startTime;
    bookingMap.set(`${dStr}_${sTime}`, b);
  });

  // 2b. Separately fetch ALL active recurring reservations for this coach,
  // regardless of which date their documents happen to fall on. A weekly
  // recurring pick is a standing "day-of-week + time" reservation — its
  // first occurrence can land in a future week (e.g. the member picked
  // Monday after Monday had already passed this week), so the displayed
  // week's grid must still show that slot as reserved even though no
  // booking document for THIS week's date exists yet.
  const recurringBookings = await PersonalTrainingBooking.find({
    trainerId: trainerUserId,
    status: 'CONFIRMED',
    isRecurring: true,
  })
    .populate('memberId', 'firstName lastName name profileImage email')
    .sort({ sessionDate: 1 })
    .lean();

  // Map by "dayOfWeek_startTime" -> earliest matching booking (any occurrence
  // works as a representative, since they all share the same recurringSlotId
  // and memberId).
  const recurringPatternMap = new Map();
  recurringBookings.forEach((b) => {
    const sTime = normalizeTime24(b.startTime) || b.startTime;
    const dow = b.dayOfWeek !== undefined && b.dayOfWeek !== null
      ? b.dayOfWeek
      : parseLocalDate(formatDateOnly(b.sessionDate)).getDay();
    const key = `${dow}_${sTime}`;
    if (!recurringPatternMap.has(key)) {
      recurringPatternMap.set(key, b);
    }
  });

  let totalAvailableSlotsInWeek = 0;
  let totalBookedSlotsInWeek = 0;
  let totalOpenSlotsInWeek = 0;
  let availableDaysCount = 0;

  // 3. Assemble schedule for all 7 days
  const scheduleDays = weekInfo.days.map((day) => {
    const rule = ruleMap.get(day.dayOfWeek);
    const isConfiguredAvailable = rule ? rule.isAvailable !== false : day.dayOfWeek !== 0;
    const startTime = rule?.startTime ? normalizeTime24(rule.startTime) : '09:00';
    const endTime = rule?.endTime ? normalizeTime24(rule.endTime) : '17:00';

    if (isConfiguredAvailable) {
      availableDaysCount++;
    }

    let slots = [];
    if (isConfiguredAvailable) {
      const generated = generateHourlySlots(startTime, endTime);

      slots = generated.map((slot) => {
        totalAvailableSlotsInWeek++;
        const bookingKey = `${day.date}_${slot.startTime}`;
        const recurringKey = `${day.dayOfWeek}_${slot.startTime}`;
        const existingBooking = recurringPatternMap.get(recurringKey) || bookingMap.get(bookingKey);

        let status = 'AVAILABLE';
        let isBooked = false;
        let isBookedByMe = false;
        let bookedMember = null;
        let bookingId = null;
        let recurringSlotId = null;

        if (existingBooking) {
          isBooked = true;
          totalBookedSlotsInWeek++;
          bookingId = existingBooking._id;
          recurringSlotId = existingBooking.recurringSlotId || null;

          const existingMemberIdStr = existingBooking.memberId?._id
            ? existingBooking.memberId._id.toString()
            : (existingBooking.memberId ? existingBooking.memberId.toString() : null);

          const currentUserIdStr = currentUserId ? currentUserId.toString() : null;

          if (currentUserIdStr && existingMemberIdStr && existingMemberIdStr === currentUserIdStr) {
            isBookedByMe = true;
            status = 'BOOKED_BY_ME';
          } else {
            isBookedByMe = false;
            status = 'BOOKED';
          }

          // If current user is the coach, expose member info
          if (currentUserId && currentUserId.toString() === trainerUserId.toString()) {
            bookedMember = {
              _id: existingBooking.memberId?._id,
              name: existingBooking.memberId?.name || [existingBooking.memberId?.firstName, existingBooking.memberId?.lastName].filter(Boolean).join(' ') || 'Member',
              email: existingBooking.memberId?.email,
              profileImage: existingBooking.memberId?.profileImage,
              focusArea: existingBooking.focusArea,
              notes: existingBooking.notes,
            };
          }
        } else {
          totalOpenSlotsInWeek++;
        }

        return {
          ...slot,
          status,
          isAvailable: !isBooked,
          isBooked,
          isBookedByMe,
          bookingId,
          recurringSlotId,
          bookedMember,
        };
      });
    }

    return {
      date: day.date,
      dateObj: day.dateObj,
      dayOfWeek: day.dayOfWeek,
      dayName: day.dayName,
      dayAbbr: day.dayAbbr,
      formattedDate: day.formattedDate,
      fullFormattedDate: day.fullFormattedDate,
      isAvailable: isConfiguredAvailable,
      startTime: format12Hour(startTime),
      endTime: format12Hour(endTime),
      rawStartTime: startTime,
      rawEndTime: endTime,
      slotsCount: slots.length,
      slots,
    };
  });

  return {
    weekStart: weekInfo.weekStartStr,
    weekEnd: weekInfo.weekEndStr,
    summary: {
      availableDays: availableDaysCount,
      totalWeeklySlots: totalAvailableSlotsInWeek,
      bookedThisWeek: totalBookedSlotsInWeek,
      openSlotsThisWeek: totalOpenSlotsInWeek,
    },
    days: scheduleDays,
  };
};

/**
 * Check if updated weekly rules conflict with any future confirmed bookings
 */
export const checkAvailabilityConflicts = async (trainerUserId, updatedRules) => {
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const futureBookings = await PersonalTrainingBooking.find({
    trainerId: trainerUserId,
    sessionDate: { $gte: todayStart },
    status: 'CONFIRMED',
  })
    .populate('memberId', 'firstName lastName name email')
    .lean();

  if (!futureBookings || futureBookings.length === 0) {
    return [];
  }

  const ruleMap = new Map();
  updatedRules.forEach((r) => {
    ruleMap.set(parseInt(r.dayOfWeek, 10), {
      isAvailable: Boolean(r.isAvailable),
      startTime: normalizeTime24(r.startTime),
      endTime: normalizeTime24(r.endTime),
    });
  });

  const conflicts = [];

  for (const b of futureBookings) {
    const bookingDate = new Date(b.sessionDate);
    const dayOfWeek = bookingDate.getDay();
    const rule = ruleMap.get(dayOfWeek);

    const bookingStartMin = timeToMinutes(b.startTime);
    const bookingEndMin = timeToMinutes(b.endTime || minutesToTime(bookingStartMin + 60));

    let hasConflict = false;
    let reason = '';

    if (!rule || !rule.isAvailable) {
      hasConflict = true;
      reason = `Day ${DAY_NAMES[dayOfWeek]} is marked as unavailable.`;
    } else {
      const ruleStartMin = timeToMinutes(rule.startTime);
      const ruleEndMin = timeToMinutes(rule.endTime);

      if (bookingStartMin < ruleStartMin || bookingEndMin > ruleEndMin) {
        hasConflict = true;
        reason = `Session time (${b.startTime} - ${b.endTime}) falls outside new availability (${rule.startTime} - ${rule.endTime}).`;
      }
    }

    if (hasConflict) {
      conflicts.push({
        bookingId: b._id,
        sessionDate: formatDateOnly(b.sessionDate),
        startTime: b.startTime,
        endTime: b.endTime,
        memberName: b.memberId?.name || [b.memberId?.firstName, b.memberId?.lastName].filter(Boolean).join(' ') || 'Member',
        memberEmail: b.memberId?.email,
        reason,
      });
    }
  }

  return conflicts;
};
