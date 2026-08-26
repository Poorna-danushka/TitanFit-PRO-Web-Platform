import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { trainerAPI } from '../api/apiService';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Calendar,
  Clock,
  CheckCircle2,
  Sparkles,
  X,
  Check,
  Trash2,
  UserCheck,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { useUIStore } from '../stores/uiStore';

interface Trainer {
  _id: string;
  userId: {
    _id: string;
    firstName?: string;
    lastName?: string;
    name?: string;
    email?: string;
    profileImage?: string;
    bio?: string;
  };
  name?: string;
  qualification?: string;
  specialization?: string[];
  certifications?: string[];
  experience?: number;
  bio?: string;
  hourlyRate?: number;
  rating?: number;
  reviewsCount?: number;
  isAvailable?: boolean;
}

interface Slot {
  startTime: string;
  endTime: string;
  timeSlot: string;
  label: string;
  status: 'AVAILABLE' | 'BOOKED' | 'BOOKED_BY_ME' | 'UNAVAILABLE';
  isAvailable: boolean;
  isBooked: boolean;
  isBookedByMe: boolean;
  bookingId?: string;
  recurringSlotId?: string;
}

interface ScheduleDay {
  date: string;
  dateObj: string;
  dayOfWeek: number;
  dayName: string;
  dayAbbr: string;
  formattedDate: string;
  fullFormattedDate: string;
  isAvailable: boolean;
  startTime: string;
  endTime: string;
  slotsCount: number;
  slots: Slot[];
}

interface SelectedSlotInfo {
  date: string;
  fullFormattedDate: string;
  dayOfWeek?: number;
  dayName?: string;
  startTime: string;
  endTime: string;
  timeSlot: string;
  label: string;
}

export default function Trainers() {
  const navigate = useNavigate();
  const addNotification = useUIStore((s) => s.addNotification);
  const [trainers, setTrainers] = useState<Trainer[]>([]);
  const [loading, setLoading] = useState(true);

  // Entitlement & Assigned Trainer State
  const [eligibility, setEligibility] = useState<{
    isEligible: boolean;
    hasTrainer: boolean;
    reason?: string;
    planName?: string;
    message?: string;
    trainer?: any;
    membership?: any;
  } | null>(null);

  const [myTrainerData, setMyTrainerData] = useState<{
    trainer: any;
    weeklyBookingsCount?: number;
    upcomingBookings: any[];
  } | null>(null);

  // Active Coach for Booking Calendar
  const [activeCoach, setActiveCoach] = useState<Trainer | null>(null);

  // Weekly Schedule State
  // weekOffset: 0 = current week, 1 = next week, 2 = week after, etc.
  // Recurring bookings for a weekday that already passed this week land on
  // NEXT week's occurrence, so users need to be able to page forward to see
  // (and confirm) that the reservation actually landed.
  const [weekOffset, setWeekOffset] = useState<number>(0);
  const targetDate = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() + weekOffset * 7);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }, [weekOffset]);
  const [weekDays, setWeekDays] = useState<ScheduleDay[]>([]);
  const [weekRangeLabel, setWeekRangeLabel] = useState<string>('');
  const [memberWeeklyBookings, setMemberWeeklyBookings] = useState<number>(0);
  const [maxWeeklyLimit, setMaxWeeklyLimit] = useState<number>(4);
  const [slotsLoading, setSlotsLoading] = useState<boolean>(false);

  // Multi-Session Selection State
  const [selectedSlots, setSelectedSlots] = useState<SelectedSlotInfo[]>([]);

  // Booking Modal & Actions
  const [confirmationModalOpen, setConfirmationModalOpen] = useState(false);
  const [focusArea, setFocusArea] = useState('1-on-1 Coaching & Form Technique');
  const [bookingNotes, setBookingNotes] = useState('');
  const [bookingLoading, setBookingLoading] = useState(false);
  const [bookingError, setBookingError] = useState<string | null>(null);
  const bookingErrorRef = useRef<HTMLDivElement | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [cancellingId, setCancellingId] = useState<string | null>(null);

  const fetchInitialData = useCallback(async () => {
    try {
      setLoading(true);
      const [trainersRes, eligRes] = await Promise.all([
        trainerAPI.getAll(),
        trainerAPI.getEligibility().catch(() => ({ data: { isEligible: false } })),
      ]);

      const hasPT = Boolean(eligRes.data?.hasPersonalTrainerAccess || eligRes.data?.isEligible);
      if (!hasPT) {
        navigate('/dashboard', { replace: true });
        return;
      }

      const trainerList = trainersRes.data.trainers || trainersRes.data.data || [];
      setTrainers(trainerList);
      setEligibility(eligRes.data);

      if (eligRes.data?.hasTrainer) {
        const myTrnRes = await trainerAPI.getMyTrainer().catch(() => ({ data: null }));
        if (myTrnRes.data?.hasTrainer) {
          setMyTrainerData({
            trainer: myTrnRes.data.trainer,
            weeklyBookingsCount: myTrnRes.data.weeklyBookingsCount || 0,
            upcomingBookings: myTrnRes.data.upcomingBookings || [],
          });

          // Set default active coach to assigned coach
          const assignedId = myTrnRes.data.trainer.userId || myTrnRes.data.trainer._id;
          const found = trainerList.find(
            (t: any) => (t.userId?._id || t._id) === assignedId
          );
          if (found) {
            setActiveCoach(found);
          } else {
            setActiveCoach({
              _id: myTrnRes.data.trainer._id,
              userId: { _id: assignedId, name: myTrnRes.data.trainer.name },
              name: myTrnRes.data.trainer.name,
              bio: myTrnRes.data.trainer.bio,
              qualification: myTrnRes.data.trainer.qualification,
              specialization: myTrnRes.data.trainer.specialization,
            } as any);
          }
        }
      } else if (trainerList.length > 0) {
        setActiveCoach(trainerList[0]);
      }
    } catch (error) {
      console.error('Failed to load trainers or eligibility', error);
      navigate('/dashboard', { replace: true });
    } finally {
      setLoading(false);
    }
  }, [navigate]);

  useEffect(() => {
    fetchInitialData();
  }, [fetchInitialData]);

  // Load weekly schedule whenever activeCoach or targetDate changes
  const loadCoachWeeklySlots = useCallback(
    async (coachId: string, dateStr: string) => {
      try {
        setSlotsLoading(true);
        const res = await trainerAPI.getWeeklySlots(coachId, dateStr);
        if (res.data?.success) {
          setWeekDays(res.data.days || []);
          setMemberWeeklyBookings(res.data.memberWeeklyBookings || 0);
          setMaxWeeklyLimit(res.data.maxWeeklyLimit || 4);
          if (res.data.weekStart && res.data.weekEnd) {
            setWeekRangeLabel(
              `${new Date(res.data.weekStart + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} – ${new Date(res.data.weekEnd + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`
            );
          }
        }
      } catch (err) {
        console.error('Error fetching coach weekly slots', err);
        addNotification('Unable to load coach weekly schedule.', 'error');
      } finally {
        setSlotsLoading(false);
      }
    },
    []
  );

  // Refresh only upcoming bookings + weekly count — does NOT reset activeCoach or weekDays
  const refreshMyTrainerData = useCallback(async () => {
    try {
      const myTrnRes = await trainerAPI.getMyTrainer().catch(() => ({ data: null }));
      if (myTrnRes.data?.hasTrainer) {
        setMyTrainerData({
          trainer: myTrnRes.data.trainer,
          weeklyBookingsCount: myTrnRes.data.weeklyBookingsCount || 0,
          upcomingBookings: myTrnRes.data.upcomingBookings || [],
        });
      }
    } catch (err) {
      console.error('Failed to refresh trainer data', err);
    }
  }, []);

  useEffect(() => {
    if (activeCoach) {
      const coachUserId = activeCoach.userId?._id || activeCoach._id;
      loadCoachWeeklySlots(coachUserId, targetDate);
      setSelectedSlots([]); // Clear slot selections when week/coach changes
    }
  }, [activeCoach, targetDate, loadCoachWeeklySlots]);

  const handleSelectTrainer = async (trainer: Trainer) => {
    const trainerTargetId = trainer.userId?._id || trainer._id;
    try {
      setActionLoading(trainerTargetId);
      const res = await trainerAPI.selectTrainer(trainerTargetId);
      addNotification(res.data.message || 'Personal Trainer assigned successfully!', 'success');
      setActiveCoach(trainer);
      await fetchInitialData();
    } catch (error: any) {
      addNotification(error?.response?.data?.message || 'Failed to assign coach.', 'error');
    } finally {
      setActionLoading(null);
    }
  };

  const handleToggleSlotSelection = (day: ScheduleDay, slot: Slot) => {
    if (!slot.isAvailable || slot.status === 'BOOKED' || slot.status === 'BOOKED_BY_ME') {
      return;
    }

    const slotKey = `${day.date}_${slot.startTime}`;
    const exists = selectedSlots.some((s) => `${s.date}_${s.startTime}` === slotKey);

    if (exists) {
      setSelectedSlots((prev) => prev.filter((s) => `${s.date}_${s.startTime}` !== slotKey));
    } else {
      // Check 4-session weekly limit
      const currentActiveCount = memberWeeklyBookings;
      const totalSelectedCount = selectedSlots.length;

      if (currentActiveCount + totalSelectedCount >= maxWeeklyLimit) {
        addNotification(
          `Weekly limit reached (${maxWeeklyLimit} / ${maxWeeklyLimit} sessions). You already have ${currentActiveCount} confirmed session(s) this week.`,
          'warning'
        );
        return;
      }

      setSelectedSlots((prev) => [
        ...prev,
        {
          date: day.date,
          fullFormattedDate: day.fullFormattedDate,
          dayOfWeek: day.dayOfWeek,
          dayName: day.dayName,
          startTime: slot.startTime,
          endTime: slot.endTime,
          timeSlot: slot.timeSlot,
          label: slot.label,
        },
      ]);
    }
  };

  const handleRemoveSelectedSlot = (index: number) => {
    setSelectedSlots((prev) => {
      const updated = prev.filter((_, i) => i !== index);
      if (updated.length === 0) {
        setConfirmationModalOpen(false);
      }
      return updated;
    });
  };

  const handleConfirmAllBookings = async () => {
    if (!activeCoach || selectedSlots.length === 0) {
      addNotification('Please select at least one available session.', 'error');
      return;
    }

    const coachUserId =
      typeof activeCoach.userId === 'object' && activeCoach.userId?._id
        ? activeCoach.userId._id
        : typeof activeCoach.userId === 'string'
        ? activeCoach.userId
        : activeCoach._id;

    try {
      setBookingLoading(true);
      setBookingError(null);
      const res = await trainerAPI.multiBookSessions({
        trainerId: coachUserId,
        sessions: selectedSlots.map((s) => ({
          sessionDate: s.date,
          date: s.date,
          dayOfWeek: s.dayOfWeek,
          recurring: true,
          startTime: s.startTime,
          endTime: s.endTime,
          timeSlot: s.timeSlot,
          focusArea,
          notes: bookingNotes,
        })),
      });

      const skipped = res.data.skippedSlots || [];
      if (skipped.length > 0 && (res.data.bookings?.length || 0) > 0) {
        // Partial success: some slots got grabbed by another member a moment
        // before we confirmed, but everything else still went through.
        addNotification(res.data.message, 'warning');
      } else {
        addNotification(res.data.message || '🎉 Personal training sessions successfully confirmed!', 'success');
      }
      setConfirmationModalOpen(false);
      // Clear selection FIRST so slots immediately stop showing as purple
      setSelectedSlots([]);

      // Reload weekly grid slots to show new BOOKED_BY_ME status (green)
      // and to reflect any slot another member just took (red/BOOKED).
      await loadCoachWeeklySlots(coachUserId, targetDate);
      // Refresh upcoming sessions list without disturbing activeCoach / weekDays
      await refreshMyTrainerData();
    } catch (error: any) {
      const msg = error?.response?.data?.message || 'Failed to complete booking. Please review your selections.';
      setBookingError(msg);
      addNotification(msg, 'error');
      if (activeCoach) {
        await loadCoachWeeklySlots(coachUserId, targetDate);
      }
    } finally {
      setBookingLoading(false);
    }
  };

  useEffect(() => {
    if (bookingError && bookingErrorRef.current) {
      bookingErrorRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [bookingError]);

  const handleCancelBooking = async (bookingId: string, recurringSlotId?: string) => {
    const confirmMsg = recurringSlotId
      ? 'Are you sure you want to release this recurring weekly slot? All future sessions for this slot will be cancelled.'
      : 'Are you sure you want to cancel this training session?';

    if (!window.confirm(confirmMsg)) {
      return;
    }

    try {
      setCancellingId(bookingId || recurringSlotId || 'cancel');
      let res;
      if (recurringSlotId) {
        res = await trainerAPI.cancelRecurringSlot(recurringSlotId);
      } else {
        res = await trainerAPI.cancelBooking(bookingId);
      }
      addNotification(res.data.message || 'Session cancelled successfully.', 'success');
      if (activeCoach) {
        const coachUserId = activeCoach.userId?._id || activeCoach._id;
        await loadCoachWeeklySlots(coachUserId, targetDate);
      }
      // Refresh upcoming sessions without resetting slot grid
      await refreshMyTrainerData();
    } catch (err: any) {
      addNotification(err?.response?.data?.message || 'Failed to cancel session.', 'error');
    } finally {
      setCancellingId(null);
    }
  };

  const totalSessionsThisWeek = memberWeeklyBookings + selectedSlots.length;
  const remainingSlotsAvailable = Math.max(0, maxWeeklyLimit - memberWeeklyBookings);

  return (
    <div className="space-y-8 pb-16 max-w-7xl mx-auto px-2 sm:px-4">
      {/* ─── HEADER BANNER ─────────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: -16 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gradient-to-r from-purple-950/80 via-indigo-950/50 to-black p-8 rounded-3xl border border-purple-500/20 shadow-2xl relative overflow-hidden"
      >
        <div className="absolute top-0 right-0 w-96 h-96 bg-purple-500/10 rounded-full blur-[100px] pointer-events-none" />
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="px-3 py-1 bg-purple-500/20 text-purple-300 text-xs font-bold uppercase rounded-full border border-purple-500/30 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5" /> 1-on-1 Personal Training
              </span>
              {eligibility?.isEligible && (
                <span className="px-3 py-1 bg-green-500/20 text-green-400 text-xs font-bold uppercase rounded-full border border-green-500/30 flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" /> PT Plan Active
                </span>
              )}
            </div>
            <h1 className="text-3xl md:text-4xl font-display font-black text-white">
              Member Training Space
            </h1>
            <p className="text-gray-400 text-sm mt-1 max-w-2xl">
              Book real 1-on-1 training sessions with your certified coach. Select up to 4 sessions per week.
            </p>
          </div>

          {/* Real-time weekly limit status badge */}
          <div className="bg-black/50 border border-purple-500/30 rounded-2xl p-4 text-center">
            <p className="text-[10px] text-gray-400 uppercase font-bold tracking-wider">Weekly Bookings</p>
            <p className="text-2xl font-display font-black text-purple-300">
              {memberWeeklyBookings} / {maxWeeklyLimit}
            </p>
            <p className="text-[10px] text-gray-400">
              {remainingSlotsAvailable === 0 ? 'Weekly limit reached' : `${remainingSlotsAvailable} slot(s) available`}
            </p>
          </div>
        </div>
      </motion.div>

      {/* ─── ACTIVE COACH PROFILE & TRAINING SPACE ───────────────────────── */}
      {!loading && activeCoach && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-[#111115]/90 border border-purple-500/30 rounded-3xl p-6 md:p-8 shadow-2xl space-y-6"
        >
          <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
            <div className="flex items-start gap-5">
              <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-purple-500/20 to-indigo-500/20 border border-purple-500/40 overflow-hidden shrink-0 flex items-center justify-center font-bold text-2xl text-purple-300">
                {activeCoach.userId?.profileImage || (activeCoach as any).profileImage ? (
                  <img
                    src={activeCoach.userId?.profileImage || (activeCoach as any).profileImage}
                    alt={activeCoach.name || 'Coach'}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  (activeCoach.name || 'C').charAt(0)
                )}
              </div>
              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="px-2.5 py-0.5 bg-purple-500/20 text-purple-300 text-[10px] font-extrabold uppercase rounded-full border border-purple-500/30">
                    Selected Coach
                  </span>
                  {myTrainerData?.trainer?.userId === (activeCoach.userId?._id || activeCoach._id) && (
                    <span className="px-2.5 py-0.5 bg-green-500/20 text-green-400 text-[10px] font-extrabold uppercase rounded-full border border-green-500/30">
                      ✓ Dedicated Trainer
                    </span>
                  )}
                </div>
                <h2 className="text-2xl font-bold text-white">
                  Coach {activeCoach.name || (activeCoach.userId?.firstName ? `${activeCoach.userId.firstName} ${activeCoach.userId.lastName || ''}` : 'Trainer')}
                </h2>
                <p className="text-xs text-purple-400 font-semibold">
                  {activeCoach.qualification || 'Certified Personal Trainer'}
                </p>
                {activeCoach.bio && (
                  <p className="text-xs text-gray-400 max-w-2xl leading-relaxed pt-1">
                    {activeCoach.bio}
                  </p>
                )}
                {activeCoach.specialization && activeCoach.specialization.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 pt-2">
                    {activeCoach.specialization.map((spec, sIdx) => (
                      <span
                        key={sIdx}
                        className="px-2.5 py-0.5 rounded-lg bg-white/5 text-gray-300 text-[10px] font-medium border border-white/10"
                      >
                        {spec}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Coach Switcher Dropdown & Selection */}
            {trainers.length > 1 && (
              <div className="flex flex-wrap items-center gap-2 self-start md:self-auto">
                <label className="text-xs text-gray-400 font-semibold">Coach:</label>
                <select
                  value={activeCoach.userId?._id || activeCoach._id}
                  onChange={(e) => {
                    const selected = trainers.find((t) => (t.userId?._id || t._id) === e.target.value);
                    if (selected) setActiveCoach(selected);
                  }}
                  className="bg-black/60 border border-white/10 text-white text-xs rounded-xl px-3 py-2 focus:outline-none focus:border-purple-500"
                >
                  {trainers.map((t) => (
                    <option key={t._id} value={t.userId?._id || t._id}>
                      {t.name || t.userId?.name || 'Coach'}
                    </option>
                  ))}
                </select>

                {myTrainerData?.trainer?.userId !== (activeCoach.userId?._id || activeCoach._id) && (
                  <button
                    onClick={() => handleSelectTrainer(activeCoach)}
                    disabled={actionLoading === (activeCoach.userId?._id || activeCoach._id)}
                    className="px-3 py-2 bg-white/10 hover:bg-white/20 text-white text-xs font-bold rounded-xl transition-all flex items-center gap-1.5"
                    title="Set as Dedicated Coach"
                  >
                    <UserCheck className="w-3.5 h-3.5" />
                    <span>{actionLoading === (activeCoach.userId?._id || activeCoach._id) ? 'Assigning...' : 'Set as Dedicated Coach'}</span>
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Upcoming Confirmed Sessions with this Coach */}
          {myTrainerData?.upcomingBookings && myTrainerData.upcomingBookings.length > 0 && (
            <div className="border-t border-white/10 pt-5 space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-gray-400 flex items-center gap-2">
                <Clock className="w-4 h-4 text-purple-400" /> Your Confirmed Upcoming Sessions ({myTrainerData.upcomingBookings.length})
              </h4>
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
                {myTrainerData.upcomingBookings.map((b: any) => (
                  <div
                    key={b._id}
                    className="p-4 bg-black/40 border border-white/5 rounded-2xl flex items-center justify-between text-xs"
                  >
                    <div>
                      <p className="font-bold text-white">
                        {new Date(b.sessionDate).toLocaleDateString(undefined, {
                          weekday: 'short',
                          month: 'short',
                          day: 'numeric',
                        })}{' '}
                        • <span className="text-purple-300 font-mono">{b.startTime}</span>
                      </p>
                      <p className="text-gray-400 text-[11px] mt-0.5">{b.focusArea || '1-on-1 Coaching'}</p>
                    </div>
                    <button
                      onClick={() => handleCancelBooking(b._id, b.recurringSlotId)}
                      disabled={cancellingId !== null && (cancellingId === b._id || cancellingId === b.recurringSlotId)}
                      className="p-2 hover:bg-white/5 text-gray-600 hover:text-gray-300 rounded-lg transition-colors disabled:opacity-40"
                      title="Cancel Session / Release Slot"
                    >
                      {cancellingId !== null && (cancellingId === b._id || cancellingId === b.recurringSlotId)
                        ? <svg className="w-4 h-4" style={{animation:'spin 0.8s linear infinite'}} viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeOpacity="0.25"/><path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round"/></svg>
                        : <Trash2 className="w-4 h-4" />}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </motion.div>
      )}

      {/* ─── WEEKLY CALENDAR & SLOT BOOKING SECTION ─────────────────────── */}
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-white flex items-center gap-2">
              <Calendar className="w-6 h-6 text-purple-400" /> Trainer Weekly Availability & Slot Reservation
            </h2>
            <p className="text-gray-400 text-xs mt-0.5">
              Select 1-hour recurring weekday slots matching Coach {activeCoach?.name || 'Trainer'}'s working schedule. Reserved slots remain filled every week for your active plan.
            </p>
          </div>

          <span className="px-3.5 py-1.5 bg-purple-500/20 text-purple-300 text-xs font-bold uppercase rounded-full border border-purple-500/30 flex items-center gap-1.5 self-start sm:self-auto">
            🔁 Recurring Weekdays
          </span>
        </div>

        {/* Multi-Session Selection Status Bar */}
        <div className="bg-[#111115]/90 border border-purple-500/20 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xl">
          <div className="flex items-center gap-3">
            <div className="relative w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center font-bold text-sm text-purple-300 font-mono shrink-0">
              {totalSessionsThisWeek}/{maxWeeklyLimit}
              {selectedSlots.length > 0 && (
                <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-emerald-400 border border-[#111115] animate-pulse" />
              )}
            </div>
            <div>
              <p className="text-xs font-bold text-white">
                {selectedSlots.length > 0
                  ? `${selectedSlots.length} new slot(s) pending confirmation`
                  : 'No new slots selected'}
                {memberWeeklyBookings > 0 && (
                  <span className="text-gray-400 font-normal"> · {memberWeeklyBookings} already confirmed</span>
                )}
              </p>
              <p className="text-[11px] text-gray-500 mt-0.5">
                🔁 Recurring — slots repeat every week across your active plan
              </p>
            </div>
          </div>

          {selectedSlots.length > 0 && (
            <button
              onClick={() => {
                setBookingError(null);
                setConfirmationModalOpen(true);
              }}
              className="px-5 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs rounded-xl transition-all shadow-lg shadow-emerald-700/30 flex items-center gap-2 shrink-0"
            >
              <Check className="w-4 h-4" /> Review & Confirm ({selectedSlots.length})
            </button>
          )}
        </div>

        {/* Week Navigation — a recurring pick on a weekday that already passed
            this week lands on NEXT week's date, so members need a way to page
            forward and actually see/confirm it landed. */}
        <div className="flex items-center justify-between bg-[#111115]/90 border border-white/10 rounded-2xl px-4 py-2.5">
          <button
            type="button"
            onClick={() => setWeekOffset((w) => Math.max(0, w - 1))}
            disabled={weekOffset === 0}
            className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-white/5 disabled:opacity-30 disabled:hover:bg-transparent disabled:cursor-not-allowed transition-all"
            aria-label="Previous week"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <div className="text-center">
            <p className="text-xs font-bold text-white">
              {weekOffset === 0 ? 'This Week' : weekOffset === 1 ? 'Next Week' : `${weekOffset} Weeks Ahead`}
            </p>
            {weekRangeLabel && <p className="text-[10px] text-gray-500 mt-0.5">{weekRangeLabel}</p>}
          </div>
          <button
            type="button"
            onClick={() => setWeekOffset((w) => w + 1)}
            className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-white/5 transition-all"
            aria-label="Next week"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {/* Weekly Grid (Monday to Sunday) */}
        {slotsLoading ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-7 gap-3">
            {[1, 2, 3, 4, 5, 6, 7].map((i) => (
              <div key={i} className="h-64 bg-white/[0.02] border border-white/5 rounded-3xl animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-7 gap-3">
            {weekDays.map((day) => (
              <div
                key={day.date}
                className={`p-4 rounded-3xl border flex flex-col justify-between transition-all space-y-3 ${
                  day.isAvailable
                    ? 'bg-[#111115]/90 border-white/10 hover:border-purple-500/30'
                    : 'bg-white/[0.01] border-white/5 opacity-50'
                }`}
              >
                {/* Day Header */}
                <div className="border-b border-white/5 pb-2 text-center">
                  <p className="text-sm font-extrabold uppercase tracking-wider text-purple-300">
                    {day.dayName}
                  </p>
                  <span className={`inline-block mt-1 text-[9px] font-bold uppercase px-2 py-0.5 rounded-full ${
                    day.isAvailable ? 'bg-green-500/10 text-green-400 border border-green-500/20' : 'bg-gray-800 text-gray-500'
                  }`}>
                    {day.isAvailable ? 'Available' : 'Unavailable'}
                  </span>
                </div>

                {/* Day Slots List */}
                <div className="space-y-2 flex-1">
                  {!day.isAvailable || day.slots.length === 0 ? (
                    <div className="py-6 text-center text-[10px] text-gray-500">
                      Coach Unavailable
                    </div>
                  ) : (
                    day.slots.map((slot) => {
                      const slotKey = `${day.date}_${slot.startTime}`;
                      const isSelected = selectedSlots.some(
                        (s) => `${s.date}_${s.startTime}` === slotKey
                      );
                      const isReleasingThis =
                        cancellingId !== null &&
                        (cancellingId === slot.bookingId || cancellingId === slot.recurringSlotId);

                      if (slot.status === 'BOOKED_BY_ME') {
                        return (
                          <div
                            key={slot.startTime}
                            className="rounded-xl overflow-hidden border border-green-500/40 shadow-sm shadow-green-500/10 transition-all"
                          >
                            {/* Green header strip */}
                            <div className="bg-green-500/15 px-2.5 pt-2.5 pb-1.5 text-center">
                              <p className="text-xs font-mono font-bold text-green-300 leading-tight">
                                {slot.label}
                              </p>
                              <span className="text-[9px] uppercase font-sans text-green-400/80 tracking-wide flex items-center justify-center gap-0.5 mt-0.5">
                                <span>✓</span>
                                <span>Reserved weekly</span>
                              </span>
                            </div>
                            {/* Release button */}
                            {slot.bookingId && (
                              <button
                                type="button"
                                onClick={() => handleCancelBooking(slot.bookingId!, slot.recurringSlotId)}
                                disabled={isReleasingThis}
                                className={`w-full py-1.5 px-2 flex items-center justify-center gap-1 text-[10px] font-sans font-semibold uppercase tracking-wide transition-all
                                  ${isReleasingThis
                                    ? 'bg-white/5 text-gray-500 cursor-not-allowed'
                                    : 'bg-white/[0.04] hover:bg-white/[0.08] text-gray-400 hover:text-white'
                                  }`}
                              >
                                {isReleasingThis ? (
                                  <>
                                    <svg className="w-3 h-3 shrink-0" style={{animation:'spin 0.8s linear infinite'}} viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeOpacity="0.25"/><path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round"/></svg>
                                    Releasing...
                                  </>
                                ) : (
                                  <>
                                    <Trash2 className="w-2.5 h-2.5" />
                                    Release slot
                                  </>
                                )}
                              </button>
                            )}
                          </div>
                        );
                      }

                      if (slot.status === 'BOOKED' || slot.status === 'UNAVAILABLE') {
                        return (
                          <div
                            key={slot.startTime}
                            className="p-2.5 rounded-xl bg-white/[0.02] border border-white/5 text-center"
                          >
                            <p className="text-xs font-mono text-gray-600 line-through leading-tight">
                              {slot.label}
                            </p>
                            <span className="text-[9px] uppercase font-sans text-gray-600 block mt-0.5">
                              Unavailable
                            </span>
                          </div>
                        );
                      }

                      // When the weekly limit is already full (confirmed + pending selection),
                      // remaining unselected slots should appear non-interactive
                      const weeklyLimitFull = memberWeeklyBookings + selectedSlots.length >= maxWeeklyLimit;
                      if (!isSelected && weeklyLimitFull) {
                        return (
                          <div
                            key={slot.startTime}
                            className="p-2.5 rounded-xl bg-white/[0.02] border border-white/5 text-center opacity-50 cursor-not-allowed"
                            title="Weekly booking limit reached"
                          >
                            <p className="text-xs font-mono text-gray-600 leading-tight">
                              {slot.label}
                            </p>
                            <span className="text-[9px] uppercase font-sans text-gray-600 block mt-0.5">
                              Unavailable
                            </span>
                          </div>
                        );
                      }

                      return (
                        <button
                          key={slot.startTime}
                          type="button"
                          onClick={() => handleToggleSlotSelection(day, slot)}
                          className={`w-full rounded-xl text-xs font-mono font-bold transition-all duration-200 border text-center overflow-hidden
                            ${isSelected
                              ? 'bg-gradient-to-b from-purple-600/90 to-purple-700/80 border-purple-500/70 text-white shadow-md shadow-purple-700/30 scale-[1.01]'
                              : 'bg-black/40 border-white/8 text-gray-400 hover:border-purple-500/40 hover:bg-purple-900/20 hover:text-gray-200'
                            }`}
                        >
                          <div className="px-2 pt-2.5 pb-1 leading-tight">{slot.label}</div>
                          <div className={`py-1 text-[9px] font-sans uppercase tracking-wide transition-colors
                            ${isSelected
                              ? 'bg-purple-500/30 text-purple-200'
                              : 'bg-white/[0.03] text-gray-500 group-hover:text-purple-400'
                            }`}
                          >
                            {isSelected ? '✓ Selected' : '+ Select Weekly'}
                          </div>
                        </button>
                      );
                    })
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ─── CONFIRMATION MODAL ─────────────────────────────────────────── */}
      <AnimatePresence>
        {confirmationModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setConfirmationModalOpen(false)}
              className="absolute inset-0 bg-black/85 backdrop-blur-md"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative bg-[#111115] border border-purple-500/30 rounded-3xl max-w-lg w-full max-h-[90vh] overflow-y-auto p-6 md:p-8 space-y-6 shadow-2xl"
            >
              <div className="flex items-center justify-between pb-3 border-b border-white/10">
                <div>
                  <h3 className="text-xl font-bold text-white flex items-center gap-2">
                    <Calendar className="w-5 h-5 text-purple-400" /> Confirm Training Sessions
                  </h3>
                  <p className="text-xs text-gray-400 mt-0.5">
                    Coach <strong className="text-white">{activeCoach?.name || 'Trainer'}</strong>
                  </p>
                </div>
                <button
                  onClick={() => setConfirmationModalOpen(false)}
                  className="text-gray-400 hover:text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Selected Sessions Breakdown */}
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-gray-400 block">
                  Selected Sessions ({selectedSlots.length})
                </label>
                <div className="max-h-48 overflow-y-auto space-y-2 pr-1">
                  {selectedSlots.map((s, idx) => (
                    <div
                      key={idx}
                      className="p-3 bg-black/50 border border-white/10 rounded-xl flex items-center justify-between text-xs"
                    >
                      <div className="font-bold text-white">
                        <p className="text-purple-300 text-xs font-bold uppercase tracking-wider">{s.dayName || s.fullFormattedDate}</p>
                        <p className="text-white font-mono text-xs font-bold mt-0.5">{s.label}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-bold text-green-400 bg-green-500/10 px-2 py-0.5 rounded-md">
                          1 Hour
                        </span>
                        <button
                          type="button"
                          onClick={() => handleRemoveSelectedSlot(idx)}
                          className="p-1 hover:bg-red-500/20 text-gray-400 hover:text-red-400 rounded-lg transition-colors"
                          title="Remove from selection"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Error Banner */}
              {bookingError && (
                <div
                  ref={bookingErrorRef}
                  className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-xs text-red-300 flex items-start gap-2"
                >
                  <span className="font-bold shrink-0">⚠</span>
                  <span>{bookingError}</span>
                </div>
              )}

              {/* Focus Area */}
              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-gray-400 block mb-1">
                  Session Focus Area
                </label>
                <input
                  type="text"
                  value={focusArea}
                  onChange={(e) => setFocusArea(e.target.value)}
                  placeholder="e.g. Strength Training, Bench Press Form, Fat Loss"
                  className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-purple-500"
                />
              </div>

              {/* Notes */}
              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-gray-400 block mb-1">
                  Coach Notes / Cues (Optional)
                </label>
                <textarea
                  rows={2}
                  value={bookingNotes}
                  onChange={(e) => setBookingNotes(e.target.value)}
                  placeholder="Any injuries, target PRs or notes for the coach..."
                  className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-2 text-xs text-white focus:outline-none focus:border-purple-500"
                />
              </div>

              {/* Action Buttons */}
              <div className="pt-2 flex gap-3">
                <button
                  type="button"
                  onClick={() => setConfirmationModalOpen(false)}
                  className="flex-1 py-3 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 text-xs font-bold transition-all"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirmAllBookings}
                  disabled={bookingLoading}
                  className="flex-1 py-3 rounded-xl bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white text-xs font-bold transition-all shadow-lg shadow-purple-600/30"
                >
                  {bookingLoading ? 'Confirming...' : `Confirm ${selectedSlots.length} Session(s)`}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Floating Bottom Multi-Session Bar when slots are selected */}
      <AnimatePresence>
        {selectedSlots.length > 0 && !confirmationModalOpen && (
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            className="fixed bottom-20 lg:bottom-6 left-1/2 -translate-x-1/2 z-40 w-[92%] max-w-xl bg-[#141419]/95 border border-purple-500/40 rounded-2xl p-4 shadow-[0_0_40px_rgba(147,51,234,0.3)] backdrop-blur-xl flex items-center justify-between gap-4"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-purple-500/20 text-purple-300 flex items-center justify-center font-bold text-sm border border-purple-500/30">
                {selectedSlots.length}
              </div>
              <div>
                <p className="text-xs font-bold text-white">
                  {selectedSlots.length} session{selectedSlots.length > 1 ? 's' : ''} selected
                </p>
                <p className="text-[10px] text-purple-300">
                  Ready for weekly recurring confirmation
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setSelectedSlots([])}
                className="px-3 py-2 text-xs font-semibold text-gray-400 hover:text-white transition-colors"
              >
                Clear
              </button>
              <button
                onClick={() => {
                  setBookingError(null);
                  setConfirmationModalOpen(true);
                }}
                className="px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold text-xs rounded-xl transition-all shadow-lg shadow-purple-600/30 flex items-center gap-1.5"
              >
                <Check className="w-4 h-4" /> Confirm ({selectedSlots.length})
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}