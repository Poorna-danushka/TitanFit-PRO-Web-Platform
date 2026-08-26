import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { trainerAPI } from '../api/apiService';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Calendar,
  Clock,
  Users,
  CheckCircle2,
  Award,
  Sparkles,
  Search,
  Save,
  AlertCircle,
  TrendingUp,
  RefreshCw,
  Phone,
  Mail,
} from 'lucide-react';
import { toast } from 'react-toastify';

interface SessionItem {
  id: string;
  clientName: string;
  clientEmail: string;
  clientPhone?: string;
  clientProfileImage?: string;
  date: string;
  sessionDate: string;
  timeSlot: string;
  startTime: string;
  endTime: string;
  focus: string;
  notes?: string;
  status: 'CONFIRMED' | 'COMPLETED' | 'CANCELLED' | 'NO_SHOW';
}

interface TraineeItem {
  id: string;
  name: string;
  email: string;
  phone: string;
  profileImage?: string;
  weight?: number;
  height?: number;
  assignedAt?: string;
  status: string;
  planName?: string;
  ptSessionsUsed?: number;
  maxPTSessions?: number;
}

interface DaySchedule {
  dayOfWeek: number;
  dayName: string;
  isAvailable: boolean;
  startTime: string;
  endTime: string;
  formattedStartTime: string;
  formattedEndTime: string;
  slotsCount: number;
  slots: Array<{
    startTime: string;
    endTime: string;
    timeSlot: string;
    label: string;
  }>;
}

interface AvailabilitySummary {
  availableDays: number;
  totalWeeklySlots: number;
  bookedThisWeek: number;
  openSlotsThisWeek: number;
}

interface SpaceStats {
  todaySessionsCount: number;
  todayRemainingCount: number;
  activeClientsCount: number;
  completedSessionsCount: number;
  availableDaysThisWeek: number;
  bookedSlotsThisWeek: number;
  openSlotsThisWeek: number;
  totalWeeklySlots: number;
}

const TIME_OPTIONS = [
  '06:00', '07:00', '08:00', '09:00', '10:00', '11:00',
  '12:00', '13:00', '14:00', '15:00', '16:00', '17:00',
  '18:00', '19:00', '20:00', '21:00', '22:00', '23:00'
];

function formatTimeDisplay(t24: string): string {
  if (!t24) return '';
  const [hStr, mStr] = t24.split(':');
  let hh = parseInt(hStr, 10);
  const mm = mStr || '00';
  const mer = hh >= 12 ? 'PM' : 'AM';
  hh = hh % 12 || 12;
  return `${hh}:${mm} ${mer}`;
}

export default function TrainerDashboard() {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const tabParam = searchParams.get('tab');
  const activeTab: 'training-space' | 'availability' | 'profile' =
    tabParam === 'availability' || tabParam === 'profile' || tabParam === 'training-space'
      ? tabParam
      : 'training-space';

  const [loading, setLoading] = useState(true);

  // Training Space Live Data
  const [todaySessions, setTodaySessions] = useState<SessionItem[]>([]);
  const [upcomingSessions, setUpcomingSessions] = useState<SessionItem[]>([]);
  const [trainees, setTrainees] = useState<TraineeItem[]>([]);
  const [stats, setStats] = useState<SpaceStats>({
    todaySessionsCount: 0,
    todayRemainingCount: 0,
    activeClientsCount: 0,
    completedSessionsCount: 0,
    availableDaysThisWeek: 0,
    bookedSlotsThisWeek: 0,
    openSlotsThisWeek: 0,
    totalWeeklySlots: 0,
  });

  // Availability State
  const [weeklySchedule, setWeeklySchedule] = useState<DaySchedule[]>([]);
  const [availabilitySummary, setAvailabilitySummary] = useState<AvailabilitySummary>({
    availableDays: 0,
    totalWeeklySlots: 0,
    bookedThisWeek: 0,
    openSlotsThisWeek: 0,
  });
  const [savingAvailability, setSavingAvailability] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [conflictErrors, setConflictErrors] = useState<any[]>([]);

  // Profile Form State
  const [profileBio, setProfileBio] = useState('');
  const [specializations, setSpecializations] = useState('');
  const [qualifications, setQualifications] = useState('');
  const [certifications, setCertifications] = useState('');
  const [experience, setExperience] = useState<number>(3);
  const [hourlyRate, setHourlyRate] = useState<number>(4500);
  const [savingProfile, setSavingProfile] = useState(false);

  // Trainee Filter Search
  const [traineeSearch, setTraineeSearch] = useState('');
  const [sessionFilter, setSessionFilter] = useState<'ALL' | 'CONFIRMED' | 'COMPLETED'>('ALL');

  const fetchTrainingSpaceData = useCallback(async () => {
    try {
      setLoading(true);
      const res = await trainerAPI.getCoachTrainingSpace();
      if (res.data?.success) {
        setTodaySessions(res.data.todaySessions || []);
        setUpcomingSessions(res.data.upcomingSessions || []);
        setTrainees(res.data.trainees || []);
        setStats(res.data.stats || {});
      }
    } catch (err: any) {
      console.error('Failed to load training space data', err);
      toast.error('Unable to load training space data.');
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchAvailabilityData = useCallback(async () => {
    try {
      const res = await trainerAPI.getCoachWeeklyAvailability();
      if (res.data?.success) {
        setWeeklySchedule(res.data.schedule || []);
        setAvailabilitySummary(res.data.summary || {});
      }
    } catch (err: any) {
      console.error('Failed to load availability', err);
    }
  }, []);

  const fetchProfileData = useCallback(async () => {
    try {
      const res = await trainerAPI.getProfile();
      if (res.data?.success && res.data.data) {
        const p = res.data.data;
        setProfileBio(p.bio || user?.bio || '');
        setSpecializations(Array.isArray(p.specialization) ? p.specialization.join(', ') : p.specialization || '');
        setQualifications(p.qualification || '');
        setCertifications(Array.isArray(p.certifications) ? p.certifications.join(', ') : p.certifications || '');
        setExperience(p.experience || 3);
        setHourlyRate(p.hourlyRate || 4500);
      }
    } catch (err: any) {
      console.error('Failed to load profile', err);
    }
  }, [user]);

  useEffect(() => {
    fetchTrainingSpaceData();
    fetchAvailabilityData();
    fetchProfileData();
  }, [fetchTrainingSpaceData, fetchAvailabilityData, fetchProfileData]);

  // Recalculate preview slots dynamically when time / availability changes locally
  const handleDayToggle = (dayOfWeek: number) => {
    setWeeklySchedule((prev) =>
      prev.map((d) => {
        if (d.dayOfWeek === dayOfWeek) {
          const nextIsAvail = !d.isAvailable;
          const slots = nextIsAvail ? generateSlots(d.startTime, d.endTime) : [];
          return {
            ...d,
            isAvailable: nextIsAvail,
            slotsCount: slots.length,
            slots,
          };
        }
        return d;
      })
    );
    setSaveStatus('idle');
  };

  const handleTimeChange = (dayOfWeek: number, field: 'startTime' | 'endTime', val: string) => {
    setWeeklySchedule((prev) =>
      prev.map((d) => {
        if (d.dayOfWeek === dayOfWeek) {
          const updated = { ...d, [field]: val };
          const slots = updated.isAvailable ? generateSlots(updated.startTime, updated.endTime) : [];
          return {
            ...updated,
            formattedStartTime: formatTimeDisplay(updated.startTime),
            formattedEndTime: formatTimeDisplay(updated.endTime),
            slotsCount: slots.length,
            slots,
          };
        }
        return d;
      })
    );
    setSaveStatus('idle');
  };

  const generateSlots = (start: string, end: string) => {
    const sMin = parseInt(start.split(':')[0], 10) * 60 + parseInt(start.split(':')[1] || '0', 10);
    const eMin = parseInt(end.split(':')[0], 10) * 60 + parseInt(end.split(':')[1] || '0', 10);
    if (sMin >= eMin) return [];
    const out = [];
    let cur = sMin;
    while (cur + 60 <= eMin) {
      const sH = Math.floor(cur / 60);
      const sM = cur % 60;
      const eH = Math.floor((cur + 60) / 60);
      const eM = (cur + 60) % 60;
      const sStr = `${String(sH).padStart(2, '0')}:${String(sM).padStart(2, '0')}`;
      const eStr = `${String(eH).padStart(2, '0')}:${String(eM).padStart(2, '0')}`;
      out.push({
        startTime: sStr,
        endTime: eStr,
        timeSlot: `${sStr} - ${eStr}`,
        label: `${formatTimeDisplay(sStr)} - ${formatTimeDisplay(eStr)}`,
      });
      cur += 60;
    }
    return out;
  };

  const handleSaveAvailability = async () => {
    try {
      setSavingAvailability(true);
      setSaveStatus('saving');
      setConflictErrors([]);

      // Validate all active days
      for (const d of weeklySchedule) {
        if (d.isAvailable) {
          const sMin = parseInt(d.startTime.split(':')[0], 10) * 60 + parseInt(d.startTime.split(':')[1] || '0', 10);
          const eMin = parseInt(d.endTime.split(':')[0], 10) * 60 + parseInt(d.endTime.split(':')[1] || '0', 10);
          if (sMin >= eMin) {
            toast.error(`${d.dayName}: Start time must be before end time.`);
            setSaveStatus('error');
            setSavingAvailability(false);
            return;
          }
          if (eMin - sMin < 60) {
            toast.error(`${d.dayName}: Availability window must be at least 1 hour.`);
            setSaveStatus('error');
            setSavingAvailability(false);
            return;
          }
        }
      }

      const res = await trainerAPI.updateCoachWeeklyAvailability(
        weeklySchedule.map((d) => ({
          dayOfWeek: d.dayOfWeek,
          isAvailable: d.isAvailable,
          startTime: d.startTime,
          endTime: d.endTime,
        }))
      );

      if (res.data?.success) {
        setSaveStatus('saved');
        toast.success('Weekly availability schedule saved successfully!');
        if (res.data.summary) {
          setAvailabilitySummary(res.data.summary);
        }
        await fetchAvailabilityData();
        await fetchTrainingSpaceData();
      }
    } catch (error: any) {
      setSaveStatus('error');
      if (error.response?.status === 409 && error.response?.data?.conflicts) {
        setConflictErrors(error.response.data.conflicts);
        toast.error(error.response.data.message || 'Availability conflict with booked sessions.');
      } else {
        toast.error(error.response?.data?.message || 'Failed to save availability schedule.');
      }
    } finally {
      setSavingAvailability(false);
    }
  };

  const handleMarkSessionStatus = async (sessionId: string, newStatus: string) => {
    try {
      await trainerAPI.updateBookingStatus(sessionId, newStatus);
      toast.success(`Session status marked as ${newStatus}!`);
      await fetchTrainingSpaceData();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to update session status.');
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSavingProfile(true);
      await trainerAPI.updateProfile({
        bio: profileBio,
        specialization: specializations.split(',').map((s) => s.trim()).filter(Boolean),
        qualification: qualifications,
        certifications: certifications.split(',').map((c) => c.trim()).filter(Boolean),
        experience: Number(experience),
        hourlyRate: Number(hourlyRate),
      });
      toast.success('Coach profile updated successfully!');
      await fetchProfileData();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to update profile.');
    } finally {
      setSavingProfile(false);
    }
  };

  const filteredTrainees = trainees.filter(
    (t) =>
      t.name.toLowerCase().includes(traineeSearch.toLowerCase()) ||
      t.email.toLowerCase().includes(traineeSearch.toLowerCase()) ||
      t.phone.toLowerCase().includes(traineeSearch.toLowerCase())
  );

  const filteredTodaySessions = todaySessions.filter((s) => {
    if (sessionFilter === 'CONFIRMED') return s.status === 'CONFIRMED';
    if (sessionFilter === 'COMPLETED') return s.status === 'COMPLETED';
    return true;
  });

  return (
    <div className="pb-16 text-white space-y-8 max-w-7xl mx-auto px-2 sm:px-4">
      {/* ─── HERO HEADER BANNER ─────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gradient-to-r from-purple-950/80 via-indigo-950/60 to-black p-8 rounded-3xl border border-purple-500/30 shadow-2xl relative overflow-hidden flex flex-col md:flex-row items-start md:items-center justify-between gap-6"
      >
        <div className="absolute top-0 right-0 w-96 h-96 bg-purple-500/10 rounded-full blur-[100px] pointer-events-none" />

        <div className="flex items-center gap-5 z-10">
          <div className="w-18 h-18 rounded-2xl bg-gradient-to-br from-purple-500 to-indigo-600 p-0.5 shadow-[0_0_25px_rgba(168,85,247,0.35)] shrink-0 overflow-hidden">
            <div className="w-full h-full bg-black/40 rounded-2xl flex items-center justify-center text-white">
              {user?.profileImage ? (
                <img
                  src={user.profileImage}
                  alt={user?.name || 'Trainer'}
                  className="w-full h-full object-cover rounded-2xl"
                />
              ) : (
                <Award className="w-9 h-9 text-purple-300" />
              )}
            </div>
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2 mb-1.5">
              <span className="px-3 py-0.5 bg-purple-500/20 text-purple-300 text-xs font-bold uppercase rounded-full border border-purple-500/30 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5" /> Certified Personal Trainer
              </span>
              <span className="px-3 py-0.5 bg-green-500/20 text-green-400 border border-green-500/30 text-xs font-bold rounded-full">
                🟢 Live Coaching Hub
              </span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-display font-extrabold tracking-tight text-white">
              Coach {user?.name || 'Trainer'}
            </h1>
            <p className="text-gray-400 text-sm mt-1">
              Personal Training Hub • Weekly Availability, Live Member Sessions & Roster
            </p>
          </div>
        </div>

        {/* Real Dynamic Stats in Header */}
        <div className="flex flex-wrap items-center gap-3 z-10">
          <div className="bg-white/[0.04] border border-purple-500/20 rounded-2xl px-5 py-3.5 text-center backdrop-blur-md">
            <p className="text-[10px] text-gray-400 uppercase font-bold tracking-wider">Active Trainees</p>
            <p className="text-2xl font-display font-black text-purple-400">
              {loading ? '...' : `${stats.activeClientsCount || trainees.length} Members`}
            </p>
          </div>
          <div className="bg-white/[0.04] border border-purple-500/20 rounded-2xl px-5 py-3.5 text-center backdrop-blur-md">
            <p className="text-[10px] text-gray-400 uppercase font-bold tracking-wider">Today's Sessions</p>
            <p className="text-2xl font-display font-black text-green-400">
              {loading ? '...' : `${stats.todayRemainingCount || 0} Active`}
            </p>
          </div>
        </div>
      </motion.div>

      {/* ─── TAB 1: TRAINING SPACE ──────────────────────────────────────── */}
      {activeTab === 'training-space' && (
        <div className="space-y-8">
          {/* Quick Metrics Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="bg-[#111115]/90 border border-white/10 rounded-2xl p-4 space-y-1">
              <p className="text-[11px] font-bold text-gray-400 uppercase">Today's Total</p>
              <p className="text-2xl font-bold text-white">{stats.todaySessionsCount}</p>
            </div>
            <div className="bg-[#111115]/90 border border-white/10 rounded-2xl p-4 space-y-1">
              <p className="text-[11px] font-bold text-gray-400 uppercase">Remaining Today</p>
              <p className="text-2xl font-bold text-green-400">{stats.todayRemainingCount}</p>
            </div>
            <div className="bg-[#111115]/90 border border-white/10 rounded-2xl p-4 space-y-1">
              <p className="text-[11px] font-bold text-gray-400 uppercase">Booked This Week</p>
              <p className="text-2xl font-bold text-purple-400">{stats.bookedSlotsThisWeek}</p>
            </div>
            <div className="bg-[#111115]/90 border border-white/10 rounded-2xl p-4 space-y-1">
              <p className="text-[11px] font-bold text-gray-400 uppercase">Completed All-Time</p>
              <p className="text-2xl font-bold text-indigo-400">{stats.completedSessionsCount}</p>
            </div>
          </div>

          {/* Today's Sessions Section */}
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h3 className="text-xl font-bold flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-purple-400" /> Today's Scheduled Sessions
                </h3>
                <p className="text-xs text-gray-400 mt-0.5">Real-time booked member sessions for today</p>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase text-gray-400">Filter:</span>
                {(['ALL', 'CONFIRMED', 'COMPLETED'] as const).map((f) => (
                  <button
                    key={f}
                    onClick={() => setSessionFilter(f)}
                    className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                      sessionFilter === f
                        ? 'bg-white/15 text-white border border-white/20'
                        : 'bg-white/[0.02] text-gray-500 hover:text-gray-300'
                    }`}
                  >
                    {f}
                  </button>
                ))}
                <button
                  onClick={fetchTrainingSpaceData}
                  className="p-2 bg-white/5 hover:bg-white/10 rounded-lg text-gray-300 transition-colors"
                  title="Refresh Sessions"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {loading ? (
              <div className="grid md:grid-cols-2 gap-4">
                {[1, 2].map((i) => (
                  <div key={i} className="h-44 bg-white/[0.03] rounded-3xl animate-pulse" />
                ))}
              </div>
            ) : filteredTodaySessions.length === 0 ? (
              <div className="bg-[#111115]/90 border border-white/10 rounded-3xl p-10 text-center space-y-2">
                <Clock className="w-10 h-10 text-gray-600 mx-auto mb-2" />
                <h4 className="text-base font-bold text-white">No sessions scheduled for today</h4>
                <p className="text-xs text-gray-400">
                  New member bookings will automatically appear here once scheduled.
                </p>
              </div>
            ) : (
              <div className="grid md:grid-cols-2 gap-4">
                <AnimatePresence>
                  {filteredTodaySessions.map((session) => (
                    <motion.div
                      key={session.id}
                      layout
                      initial={{ opacity: 0, scale: 0.98 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.98 }}
                      className={`p-6 rounded-3xl border transition-all space-y-4 ${
                        session.status === 'COMPLETED'
                          ? 'bg-white/[0.01] border-white/5 opacity-60'
                          : 'bg-[#111115]/90 border-purple-500/20 hover:border-purple-500/40 shadow-xl'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex items-center gap-3.5">
                          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-purple-500/20 to-indigo-500/20 border border-purple-500/30 flex items-center justify-center font-bold text-lg text-purple-300 overflow-hidden">
                            {session.clientProfileImage ? (
                              <img
                                src={session.clientProfileImage}
                                alt={session.clientName}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              session.clientName.charAt(0)
                            )}
                          </div>
                          <div>
                            <h4 className="font-bold text-white text-base">{session.clientName}</h4>
                            <span className="text-xs text-gray-400 font-mono">{session.clientEmail}</span>
                          </div>
                        </div>

                        <span
                          className={`px-3 py-1 text-[10px] font-extrabold uppercase rounded-full border ${
                            session.status === 'COMPLETED'
                              ? 'bg-green-500/10 text-green-400 border-green-500/30'
                              : 'bg-purple-500/10 text-purple-300 border-purple-500/30'
                          }`}
                        >
                          {session.status}
                        </span>
                      </div>

                      <div className="bg-black/40 border border-white/5 rounded-2xl p-3.5 space-y-2 text-xs">
                        <div className="flex items-center justify-between text-purple-300 font-semibold">
                          <span className="flex items-center gap-1.5">
                            <Calendar className="w-3.5 h-3.5" /> {session.date}
                          </span>
                          <span className="flex items-center gap-1.5 font-mono">
                            <Clock className="w-3.5 h-3.5" /> {session.timeSlot}
                          </span>
                        </div>
                        <p className="text-gray-300 font-medium leading-relaxed">
                          <span className="text-gray-500 font-bold uppercase text-[10px] block">
                            Focus Area / Routine:
                          </span>
                          {session.focus}
                        </p>
                        {session.notes && (
                          <p className="text-gray-400 text-[11px] italic border-t border-white/5 pt-1.5">
                            Member Note: {session.notes}
                          </p>
                        )}
                      </div>

                      {session.status === 'CONFIRMED' && (
                        <div className="flex items-center justify-end gap-2 pt-1">
                          <button
                            onClick={() => handleMarkSessionStatus(session.id, 'NO_SHOW')}
                            className="px-3 py-2 bg-white/5 hover:bg-white/10 text-gray-300 font-bold text-xs rounded-xl transition-all"
                          >
                            No Show
                          </button>
                          <button
                            onClick={() => handleMarkSessionStatus(session.id, 'COMPLETED')}
                            className="px-4 py-2 bg-green-500 hover:bg-green-400 text-black font-bold text-xs rounded-xl transition-all flex items-center gap-1.5 shadow-md shadow-green-500/20"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" /> Mark Completed
                          </button>
                        </div>
                      )}
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            )}
          </div>

          {/* Upcoming Sessions Section */}
          {upcomingSessions.length > 0 && (
            <div className="space-y-4 pt-4 border-t border-white/10">
              <h3 className="text-lg font-bold flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-indigo-400" /> Upcoming Confirmed Sessions ({upcomingSessions.length})
              </h3>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {upcomingSessions.map((session) => (
                  <div
                    key={session.id}
                    className="p-4 bg-[#111115]/90 border border-white/10 rounded-2xl space-y-2 text-xs"
                  >
                    <div className="flex items-center justify-between">
                      <p className="font-bold text-white text-sm">{session.clientName}</p>
                      <span className="px-2 py-0.5 bg-purple-500/10 text-purple-300 border border-purple-500/20 text-[9px] font-bold uppercase rounded-md">
                        {session.status}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-gray-400 text-[11px] font-mono">
                      <span>{session.sessionDate}</span>
                      <span>{session.timeSlot}</span>
                    </div>
                    <p className="text-gray-400 text-[11px] line-clamp-1">{session.focus}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Active Trainees Roster (integrated in Training Space) */}
          <div className="pt-4 border-t border-white/10 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <h3 className="text-lg font-bold flex items-center gap-2">
                <Users className="w-5 h-5 text-purple-400" />
                Active Trainees
                {!loading && (
                  <span className="px-2 py-0.5 bg-purple-500/15 text-purple-300 text-xs font-bold rounded-full border border-purple-500/20">
                    {trainees.length}
                  </span>
                )}
              </h3>
              {trainees.length > 0 && (
                <div className="relative max-w-xs w-full">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                  <input
                    type="text"
                    value={traineeSearch}
                    onChange={(e) => setTraineeSearch(e.target.value)}
                    placeholder="Search trainees..."
                    className="w-full pl-9 pr-4 py-2 bg-black/40 border border-white/10 rounded-xl text-xs text-white focus:outline-none focus:border-purple-500"
                  />
                </div>
              )}
            </div>

            {loading ? (
              <div className="grid sm:grid-cols-2 gap-3">
                {[1, 2].map((i) => (
                  <div key={i} className="h-24 bg-white/[0.02] rounded-2xl animate-pulse" />
                ))}
              </div>
            ) : filteredTrainees.length === 0 ? (
              <div className="bg-[#111115]/90 border border-white/10 rounded-3xl p-10 text-center space-y-2">
                <Users className="w-10 h-10 text-gray-600 mx-auto mb-2" />
                <h4 className="text-base font-bold text-white">No eligible trainees yet</h4>
                <p className="text-xs text-gray-400 max-w-md mx-auto">
                  Only members with an active Personal Trainer plan who have selected you as their coach will appear here.
                </p>
              </div>
            ) : (
              <div className="bg-[#111115]/90 border border-white/10 rounded-3xl overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-white/[0.02] border-b border-white/10 text-gray-400 text-[11px] uppercase tracking-widest font-bold">
                        <th className="p-4 pl-6">Trainee</th>
                        <th className="p-4">PT Plan</th>
                        <th className="p-4">Contact</th>
                        <th className="p-4 text-right pr-6">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/[0.04] text-xs">
                      {filteredTrainees.map((client) => (
                        <tr key={client.id} className="hover:bg-white/[0.02] transition-colors">
                          <td className="p-4 pl-6">
                            <div className="flex items-center gap-3">
                              <div className="w-9 h-9 rounded-xl bg-purple-500/10 text-purple-400 font-bold flex items-center justify-center text-sm border border-purple-500/20 overflow-hidden">
                                {client.profileImage ? (
                                  <img src={client.profileImage} alt={client.name} className="w-full h-full object-cover" />
                                ) : (
                                  client.name.charAt(0)
                                )}
                              </div>
                              <div>
                                <p className="font-bold text-white">{client.name}</p>
                                <p className="text-[10px] text-gray-500 font-mono">{client.email}</p>
                              </div>
                            </div>
                          </td>
                          <td className="p-4">
                            <span className="inline-block px-2 py-0.5 bg-purple-500/15 text-purple-300 border border-purple-500/30 text-[10px] font-bold rounded-md">
                              {client.planName || 'PT Plan'}
                            </span>
                            {client.ptSessionsUsed !== undefined && (
                              <p className="text-gray-500 text-[10px] mt-0.5 font-mono">
                                {client.ptSessionsUsed}/{client.maxPTSessions ?? 8} sessions used
                              </p>
                            )}
                          </td>
                          <td className="p-4">
                            <p className="text-gray-300 flex items-center gap-1 font-mono text-[11px]">
                              <Mail className="w-3 h-3 text-gray-600" /> {client.email}
                            </p>
                            <p className="text-gray-500 flex items-center gap-1 font-mono text-[11px] mt-0.5">
                              <Phone className="w-3 h-3 text-gray-600" /> {client.phone || 'N/A'}
                            </p>
                          </td>
                          <td className="p-4 pr-6 text-right">
                            <span className="px-2 py-1 bg-green-500/10 text-green-400 border border-green-500/20 text-[10px] font-bold rounded-lg uppercase">
                              Active
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ─── TAB 2: AVAILABILITY SCHEDULE ───────────────────────────────── */}
      {activeTab === 'availability' && (
        <div className="space-y-8">
          {/* Header & Controls */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-2xl font-bold flex items-center gap-2 text-white">
                <Clock className="w-6 h-6 text-purple-400" /> Training Availability
              </h3>
              <p className="text-gray-400 text-xs mt-1">
                Configure your weekly working schedule. Members can book generated 1-hour slots strictly within these boundaries.
              </p>
            </div>

            <button
              onClick={handleSaveAvailability}
              disabled={savingAvailability}
              className="px-6 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 disabled:opacity-50 text-white font-bold text-xs rounded-xl transition-all flex items-center gap-2 shadow-lg shadow-purple-600/30 self-start sm:self-auto"
            >
              <Save className="w-4 h-4" />
              <span>
                {saveStatus === 'saving'
                  ? 'Saving Changes...'
                  : saveStatus === 'saved'
                  ? '✓ Schedule Saved'
                  : 'Save Schedule Changes'}
              </span>
            </button>
          </div>

          {/* Conflict Alert Box if present */}
          {conflictErrors.length > 0 && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-2xl p-4 text-xs space-y-2">
              <div className="flex items-center gap-2 text-red-400 font-bold">
                <AlertCircle className="w-4 h-4" /> Conflicting Future Bookings Detected
              </div>
              <p className="text-gray-300">
                You cannot reduce your availability because the following confirmed sessions would be cut off:
              </p>
              <ul className="list-disc list-inside text-gray-400 space-y-1 font-mono">
                {conflictErrors.map((c, i) => (
                  <li key={i}>
                    {c.sessionDate} • {c.startTime} - {c.endTime} ({c.memberName}) — {c.reason}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Summary Dashboard Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="bg-[#111115]/90 border border-purple-500/20 rounded-2xl p-5 text-center space-y-1">
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Available Days</p>
              <p className="text-3xl font-display font-black text-purple-400">
                {availabilitySummary.availableDays}
              </p>
              <p className="text-[10px] text-gray-500">Days per week</p>
            </div>
            <div className="bg-[#111115]/90 border border-purple-500/20 rounded-2xl p-5 text-center space-y-1">
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Available Sessions</p>
              <p className="text-3xl font-display font-black text-indigo-400">
                {availabilitySummary.totalWeeklySlots}
              </p>
              <p className="text-[10px] text-gray-500">1-hr slots / week</p>
            </div>
            <div className="bg-[#111115]/90 border border-purple-500/20 rounded-2xl p-5 text-center space-y-1">
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Booked This Week</p>
              <p className="text-3xl font-display font-black text-green-400">
                {availabilitySummary.bookedThisWeek}
              </p>
              <p className="text-[10px] text-gray-500">Confirmed sessions</p>
            </div>
            <div className="bg-[#111115]/90 border border-purple-500/20 rounded-2xl p-5 text-center space-y-1">
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Open Slots</p>
              <p className="text-3xl font-display font-black text-amber-400">
                {availabilitySummary.openSlotsThisWeek}
              </p>
              <p className="text-[10px] text-gray-500">Bookable slots</p>
            </div>
          </div>

          {/* Weekly Days Configuration List */}
          <div className="space-y-4">
            {weeklySchedule.map((day) => (
              <div
                key={day.dayOfWeek}
                className={`p-6 rounded-3xl border transition-all space-y-4 ${
                  day.isAvailable
                    ? 'bg-[#111115]/90 border-white/10 hover:border-purple-500/30'
                    : 'bg-white/[0.01] border-white/5 opacity-60'
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <button
                      type="button"
                      onClick={() => handleDayToggle(day.dayOfWeek)}
                      className={`w-12 h-6 rounded-full transition-colors relative p-0.5 ${
                        day.isAvailable ? 'bg-purple-600' : 'bg-gray-800'
                      }`}
                    >
                      <div
                        className={`w-5 h-5 rounded-full bg-white transition-transform ${
                          day.isAvailable ? 'translate-x-6' : 'translate-x-0'
                        }`}
                      />
                    </button>
                    <div>
                      <h4 className="text-base font-bold text-white">{day.dayName}</h4>
                      <p className="text-[11px] text-gray-400">
                        {day.isAvailable ? (
                          <span className="text-green-400 font-semibold">Available for Member Bookings</span>
                        ) : (
                          <span className="text-gray-500">Unavailable / Off Day</span>
                        )}
                      </p>
                    </div>
                  </div>

                  {/* Time selectors if available */}
                  {day.isAvailable && (
                    <div className="flex items-center gap-3 text-xs">
                      <div className="flex items-center gap-2">
                        <span className="text-gray-400 font-bold uppercase text-[10px]">Start:</span>
                        <select
                          value={day.startTime}
                          onChange={(e) => handleTimeChange(day.dayOfWeek, 'startTime', e.target.value)}
                          className="bg-black/50 border border-white/10 rounded-xl px-3 py-2 text-white font-mono text-xs focus:outline-none focus:border-purple-500"
                        >
                          {TIME_OPTIONS.map((t) => (
                            <option key={t} value={t}>
                              {formatTimeDisplay(t)}
                            </option>
                          ))}
                        </select>
                      </div>

                      <span className="text-gray-600">→</span>

                      <div className="flex items-center gap-2">
                        <span className="text-gray-400 font-bold uppercase text-[10px]">End:</span>
                        <select
                          value={day.endTime}
                          onChange={(e) => handleTimeChange(day.dayOfWeek, 'endTime', e.target.value)}
                          className="bg-black/50 border border-white/10 rounded-xl px-3 py-2 text-white font-mono text-xs focus:outline-none focus:border-purple-500"
                        >
                          {TIME_OPTIONS.map((t) => (
                            <option key={t} value={t}>
                              {formatTimeDisplay(t)}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  )}
                </div>

                {/* Generated Slot Preview Chips */}
                {day.isAvailable && (
                  <div className="pt-3 border-t border-white/5 space-y-2">
                    <div className="flex items-center justify-between text-xs text-gray-400">
                      <span className="text-[11px] uppercase font-bold tracking-wider">
                        Generated 1-Hour Sessions ({day.slots.length})
                      </span>
                      <span className="text-[10px] text-gray-500">Boundary: {formatTimeDisplay(day.endTime)}</span>
                    </div>

                    {day.slots.length === 0 ? (
                      <p className="text-xs text-red-400">
                        Invalid time range. Start time must precede end time by at least 1 hour.
                      </p>
                    ) : (
                      <div className="flex flex-wrap gap-2">
                        {day.slots.map((slot) => (
                          <span
                            key={slot.startTime}
                            className="px-2.5 py-1 bg-purple-500/10 border border-purple-500/20 text-purple-300 font-mono text-xs rounded-lg"
                          >
                            {slot.label}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ─── TAB 3: PROFILE & RATES ─────────────────────────────────────── */}
      {activeTab === 'profile' && (
        <form
          onSubmit={handleSaveProfile}
          className="bg-[#111115]/90 border border-white/10 rounded-3xl p-8 shadow-2xl space-y-6 max-w-3xl"
        >
          <div>
            <h3 className="text-xl font-bold">Coach Profile & Rates</h3>
            <p className="text-gray-400 text-xs mt-1">
              Real professional details displayed to members when booking 1-on-1 sessions.
            </p>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-gray-400 mb-2">
                Professional Bio
              </label>
              <textarea
                rows={3}
                value={profileBio}
                onChange={(e) => setProfileBio(e.target.value)}
                placeholder="Describe your coaching philosophy, background, and approach..."
                className="w-full px-4 py-3 bg-black/50 border border-white/10 rounded-xl text-xs text-white focus:outline-none focus:border-purple-500"
              />
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-400 mb-2">
                  Specializations (comma separated)
                </label>
                <input
                  type="text"
                  value={specializations}
                  onChange={(e) => setSpecializations(e.target.value)}
                  placeholder="e.g. Strength & Conditioning, Hypertrophy"
                  className="w-full px-4 py-3 bg-black/50 border border-white/10 rounded-xl text-xs text-white focus:outline-none focus:border-purple-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-400 mb-2">
                  Primary Qualification
                </label>
                <input
                  type="text"
                  value={qualifications}
                  onChange={(e) => setQualifications(e.target.value)}
                  placeholder="e.g. Certified Personal Trainer (NASM CPT)"
                  className="w-full px-4 py-3 bg-black/50 border border-white/10 rounded-xl text-xs text-white focus:outline-none focus:border-purple-500"
                />
              </div>
            </div>

            <div className="grid sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-400 mb-2">
                  Certifications
                </label>
                <input
                  type="text"
                  value={certifications}
                  onChange={(e) => setCertifications(e.target.value)}
                  placeholder="NASM CPT, CPR/AED"
                  className="w-full px-4 py-3 bg-black/50 border border-white/10 rounded-xl text-xs text-white focus:outline-none focus:border-purple-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-400 mb-2">
                  Experience (Years)
                </label>
                <input
                  type="number"
                  value={experience}
                  onChange={(e) => setExperience(parseInt(e.target.value, 10) || 0)}
                  className="w-full px-4 py-3 bg-black/50 border border-white/10 rounded-xl text-xs text-white focus:outline-none focus:border-purple-500 font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-400 mb-2">
                  Hourly Rate (LKR)
                </label>
                <input
                  type="number"
                  value={hourlyRate}
                  onChange={(e) => setHourlyRate(parseInt(e.target.value, 10) || 0)}
                  className="w-full px-4 py-3 bg-black/50 border border-white/10 rounded-xl text-xs text-white focus:outline-none focus:border-purple-500 font-mono"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={savingProfile}
              className="py-3 px-6 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white font-bold text-xs rounded-xl transition-all shadow-lg shadow-purple-600/30 flex items-center gap-2"
            >
              <Save className="w-4 h-4" />
              <span>{savingProfile ? 'Saving Profile...' : 'Save Profile Changes'}</span>
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
