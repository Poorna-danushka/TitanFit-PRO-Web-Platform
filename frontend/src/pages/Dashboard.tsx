import { useState, useEffect } from 'react';
import { purchaseAPI, workoutAPI, trainerAPI } from '../api/apiService';
import { useAuth } from '../context/AuthContext';
import { motion } from 'framer-motion';
import {
  Activity, Flame, TrendingUp, Trophy, Dumbbell, ArrowRight, Zap,
  PackageCheck, Pin, X, Info, CheckCircle, AlertTriangle, Quote,
  Award, Calendar, Sparkles, CheckCircle2, Clock, Building2
} from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Link } from 'react-router-dom';
import { useAnnouncements, AnnouncementType } from '../hooks/useNotifications';

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const MOTIVATIONAL_QUOTES = [
  { quote: "The only bad workout is the one that didn't happen.", author: "Unknown" },
  { quote: "Push yourself because no one else is going to do it for you.", author: "Unknown" },
  { quote: "Success starts with self-discipline.", author: "Unknown" },
  { quote: "Your body can stand almost anything. It's your mind you have to convince.", author: "Unknown" },
  { quote: "Don't wish for it. Work for it.", author: "Unknown" },
];

const todayQuote = MOTIVATIONAL_QUOTES[new Date().getDay() % MOTIVATIONAL_QUOTES.length];

const TYPE_ICONS: Record<AnnouncementType, React.ReactNode> = {
  info:    <Info          className="w-4 h-4" />,
  success: <CheckCircle   className="w-4 h-4" />,
  warning: <AlertTriangle className="w-4 h-4" />,
  urgent:  <Zap           className="w-4 h-4" />,
};

const TYPE_COLORS: Record<AnnouncementType, { bg: string; border: string; text: string; icon: string }> = {
  info:    { bg: 'rgba(59,130,246,0.08)',  border: '#3b82f6', text: '#93c5fd', icon: '#3b82f6' },
  success: { bg: 'rgba(34,197,94,0.08)',   border: '#22c55e', text: '#86efac', icon: '#22c55e' },
  warning: { bg: 'rgba(234,179,8,0.08)',   border: '#eab308', text: '#fde047', icon: '#eab308' },
  urgent:  { bg: 'rgba(239,68,68,0.08)',   border: '#ef4444', text: '#fca5a5', icon: '#ef4444' },
};

function buildWeekData(workouts: any[]) {
  const today = new Date();
  const week = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(today);
    d.setDate(today.getDate() - (6 - i));
    return { day: DAYS[d.getDay()], date: d.toDateString(), count: 0, calories: 0 };
  });
  workouts.forEach((w: any) => {
    const wDate = new Date(w.date || w.createdAt).toDateString();
    const slot = week.find(s => s.date === wDate);
    if (slot) { slot.count += 1; slot.calories += computeKcal(w); }
  });
  return week.map(w => ({ day: w.day, workouts: w.count, calories: w.calories }));
}

const DIFFICULTY_MULTIPLIER: Record<string, number> = {
  beginner: 0.75, intermediate: 1.00, advanced: 1.30,
};
function computeKcal(w: any): number {
  if (w.caloriesBurned > 0) return w.caloriesBurned;
  const base       = w.exerciseId?.caloriesPer10Min || 50;
  const multiplier = DIFFICULTY_MULTIPLIER[w.difficulty ?? 'intermediate'] ?? 1.0;
  return Math.round((base * multiplier * (w.duration || 0)) / 10);
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload?.length) {
    return (
      <div className="bg-[#111113] border border-white/[0.09] rounded-xl px-4 py-3 text-sm shadow-2xl">
        <p className="text-gray-400 font-medium mb-1">{label}</p>
        <p className="text-green-400 font-bold">{payload[0]?.value} kcal</p>
      </div>
    );
  }
  return null;
};

export default function Dashboard() {
  const { user } = useAuth();
  const [activePackage, setActivePackage] = useState<any>(null);
  const [pendingPurchase, setPendingPurchase] = useState<any>(null);
  const [exercises, setExercises] = useState<any[]>([]);
  const [workouts, setWorkouts] = useState<any[]>([]);
  const [weekData, setWeekData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Personal Trainer & Eligibility State
  const [ptEligibility, setPtEligibility] = useState<{
    isEligible: boolean;
    hasTrainer: boolean;
    planName?: string;
  } | null>(null);
  const [myTrainer, setMyTrainer] = useState<any>(null);
  const [upcomingPTSessions, setUpcomingPTSessions] = useState<any[]>([]);

  const { markRead, pinnedUnread } = useAnnouncements();
  const visiblePinned = pinnedUnread.slice(0, 3);
  const [dismissedPinned, setDismissedPinned] = useState<string[]>([]);
  const actualVisible = visiblePinned.filter(a => !dismissedPinned.includes(a.id));

  useEffect(() => {
    const fetchAll = async () => {
      try {
        const [purchaseRes, workoutRes, eligRes] = await Promise.all([
          purchaseAPI.getMy().catch(() => ({ data: { purchases: [] } })),
          workoutAPI.getMy().catch(() => ({ data: { workouts: [] } })),
          trainerAPI.getEligibility().catch(() => ({ data: { isEligible: false } })),
        ]);

        const purchases = purchaseRes.data?.purchases || [];
        const activePurchases = purchaseRes.data?.activePurchases || purchases.filter((p: any) => p.status === 'paid');
        const pendingPurchases = purchaseRes.data?.pendingPurchases || purchases.filter((p: any) => ['pending_approval', 'pending_verification', 'pending'].includes(p.status) && p.paymentMethod === 'bank_transfer');

        if (activePurchases.length > 0) {
          setActivePackage(activePurchases[0].packageId);
          setExercises(activePurchases[0].packageId?.exercises || []);
        } else {
          setActivePackage(null);
          setExercises([]);
        }

        if (pendingPurchases.length > 0) {
          setPendingPurchase(pendingPurchases[0]);
        } else {
          setPendingPurchase(null);
        }

        const workoutList = workoutRes.data?.workouts || [];
        setWorkouts(workoutList);
        setWeekData(buildWeekData(workoutList));

        // PT Eligibility check
        if (eligRes.data?.isEligible) {
          setPtEligibility(eligRes.data);
          if (eligRes.data?.hasTrainer) {
            const trnRes = await trainerAPI.getMyTrainer().catch(() => ({ data: null }));
            if (trnRes.data?.hasTrainer) {
              setMyTrainer(trnRes.data.trainer);
              setUpcomingPTSessions(trnRes.data.upcomingBookings || []);
            }
          }
        }
      } catch (error) {
        setWeekData(buildWeekData([]));
      } finally {
        setLoading(false);
      }
    };
    fetchAll();
  }, []);

  const totalCalories = workouts.reduce((sum, w) => sum + computeKcal(w), 0);
  const totalWorkouts = workouts.length;
  const streak = (() => {
    if (workouts.length === 0) return 0;
    const days = new Set(workouts.map((w: any) => new Date(w.date || w.createdAt).toDateString()));
    let count = 0;
    const today = new Date();
    for (let i = 0; i < 365; i++) {
      const d = new Date(today); d.setDate(today.getDate() - i);
      if (days.has(d.toDateString())) count++;
      else if (i > 0) break;
    }
    return count;
  })();

  const todayStr = new Date().toDateString();
  const todayWorkouts = workouts.filter(w => new Date(w.date || w.createdAt).toDateString() === todayStr);
  const todayCompletedExerciseIds = new Set(todayWorkouts.map(w => w.exerciseId?._id || w.exerciseId));
  const remainingExercises = exercises.filter(ex => !todayCompletedExerciseIds.has(ex._id));
  const todayProgress = exercises.length > 0
    ? Math.round(((exercises.length - remainingExercises.length) / exercises.length) * 100)
    : 0;

  const stats = [
    {
      title: 'Active Plan',
      value: loading ? null : activePackage ? activePackage.name : 'None',
      sub: activePackage ? `${exercises.length} exercises included` : 'Browse packages to start',
      icon: Trophy, iconColor: 'text-yellow-400', iconBg: 'bg-yellow-500/10',
      gradient: 'from-yellow-500/8',
    },
    {
      title: 'Total Workouts',
      value: loading ? null : totalWorkouts,
      sub: totalWorkouts === 0 ? 'No workouts yet' : 'Exercises completed',
      icon: Activity, iconColor: 'text-green-400', iconBg: 'bg-green-500/10',
      gradient: 'from-green-500/8',
    },
    {
      title: 'Calories Burned',
      value: loading ? null : totalCalories > 0 ? totalCalories.toLocaleString() : '0',
      sub: totalWorkouts > 0 ? `Across ${totalWorkouts} session${totalWorkouts !== 1 ? 's' : ''}` : 'Log a workout to track',
      icon: Flame, iconColor: 'text-orange-400', iconBg: 'bg-orange-500/10',
      gradient: 'from-orange-500/8',
    },
    {
      title: 'Current Streak',
      value: loading ? null : streak > 0 ? `${streak} Day${streak > 1 ? 's' : ''}` : '0 Days',
      sub: streak === 0 ? 'Start working out today!' : '🔥 Keep going!',
      icon: TrendingUp, iconColor: 'text-blue-400', iconBg: 'bg-blue-500/10',
      gradient: 'from-blue-500/8',
    },
  ];

  return (
    <div>
      {/* ── Main content ─────────────────────────────── */}
      <div className="space-y-6 pb-12">

      {/* Pinned Announcements Banner */}
      {actualVisible.length > 0 && (
        <div className="space-y-2">
          {actualVisible.map((ann) => {
            const cfg = TYPE_COLORS[ann.type];
            return (
              <motion.div
                key={ann.id}
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                className="rounded-2xl p-4 flex items-start gap-3 relative"
                style={{ background: cfg.bg, borderLeft: `3px solid ${cfg.border}`, border: `1px solid rgba(255,255,255,0.07)`, borderLeftColor: cfg.border, borderLeftWidth: '3px' }}
              >
                <Pin className="w-3.5 h-3.5 mt-0.5 shrink-0" style={{ color: cfg.icon }} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span style={{ color: cfg.icon }}>{TYPE_ICONS[ann.type]}</span>
                    <p className="font-semibold text-sm" style={{ color: cfg.text }}>{ann.title}</p>
                    <span className="text-[9px] font-bold uppercase tracking-wider text-yellow-400 bg-yellow-400/10 px-1.5 py-0.5 rounded">Pinned</span>
                  </div>
                  <p className="text-xs text-gray-400 leading-relaxed">{ann.message}</p>
                </div>
                <button
                  onClick={() => { markRead(ann.id); setDismissedPinned(p => [...p, ann.id]); }}
                  className="shrink-0 text-gray-600 hover:text-white transition-colors p-1 rounded-lg hover:bg-white/[0.06]"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Greeting */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-start justify-between flex-wrap gap-3">
          <div>
            <h1 className="font-display text-3xl md:text-4xl font-bold text-white mb-1">
              Welcome back, {user?.name?.split(' ')[0]}! 👋
            </h1>
            <p className="text-gray-500 text-sm">Here's your fitness overview for this week.</p>
          </div>
          {/* Motivational quote */}
          <div className="hidden lg:flex items-start gap-2 max-w-xs p-3 rounded-2xl bg-white/[0.025] border border-white/[0.06]">
            <Quote className="w-3.5 h-3.5 text-green-500 shrink-0 mt-0.5" />
            <div>
              <p className="text-xs text-gray-400 italic leading-relaxed">"{todayQuote.quote}"</p>
              <p className="text-[10px] text-gray-700 mt-1">— {todayQuote.author}</p>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Pending Bank Transfer Verification Banner */}
      {!activePackage && pendingPurchase && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl p-5 bg-gradient-to-r from-amber-500/10 via-[#1a150d] to-[#121110] border border-amber-500/30 text-white relative overflow-hidden shadow-xl"
        >
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0 border border-amber-500/30">
              <Clock className="w-5 h-5" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1 flex-wrap">
                <span className="px-2.5 py-0.5 bg-amber-500/20 text-amber-400 text-[10px] font-extrabold uppercase rounded-full border border-amber-500/30 flex items-center gap-1">
                  <Building2 className="w-3 h-3" /> Payment Pending Verification
                </span>
                {pendingPurchase.bankTransferReference && (
                  <span className="text-xs text-gray-400 font-mono">
                    Ref: {pendingPurchase.bankTransferReference}
                  </span>
                )}
              </div>
              <h3 className="text-base font-bold text-amber-200">
                Your bank transfer is awaiting administrator verification.
              </h3>
              <p className="text-xs text-gray-300 mt-1 leading-relaxed">
                Package: <strong className="text-white">{pendingPurchase.packageId?.name || 'Gym Package'}</strong> • Amount: <strong className="text-amber-400">LKR {(pendingPurchase.price || 0).toLocaleString()}</strong>
                {pendingPurchase.createdAt && ` • Submitted: ${new Date(pendingPurchase.createdAt).toLocaleDateString()}`}.
                <br />
                Your package features, workout routines, and attendance pass will become available after an administrator verifies your payment.
              </p>
              <div className="mt-3 flex items-center gap-3">
                <Link
                  to="/my-package"
                  className="px-4 py-1.5 bg-amber-500 hover:bg-amber-400 text-black text-xs font-bold rounded-lg transition-all inline-flex items-center gap-1.5 shadow-md shadow-amber-500/20"
                >
                  View Transfer Status <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, i) => {
          const Icon = stat.icon;
          return (
            <motion.div
              key={stat.title}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.07 }}
              className={`stat-card bg-gradient-to-br ${stat.gradient} to-transparent`}
            >
              <div className={`w-10 h-10 rounded-xl ${stat.iconBg} flex items-center justify-center mb-4`}>
                <Icon className={`w-5 h-5 ${stat.iconColor}`} />
              </div>
              <p className="text-gray-500 text-xs font-medium mb-1.5">{stat.title}</p>
              {loading ? (
                <div className="skeleton h-7 w-24 mb-1" />
              ) : (
                <p className="font-display text-2xl font-bold text-white leading-none mb-1">{stat.value}</p>
              )}
              <p className="text-gray-600 text-xs leading-snug">{stat.sub}</p>
            </motion.div>
          );
        })}
      </div>

      {/* Today's Progress bar (if active package) */}
      {activePackage && exercises.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.28 }}
          className="card-surface rounded-2xl p-5"
        >
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="font-semibold text-sm text-white">Today's Progress</p>
              <p className="text-xs text-gray-600 mt-0.5">{exercises.length - remainingExercises.length} of {exercises.length} exercises done</p>
            </div>
            <span className="font-display text-2xl font-bold text-green-400">{todayProgress}%</span>
          </div>
          <div className="h-2.5 rounded-full bg-white/[0.06] overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${todayProgress}%` }}
              transition={{ delay: 0.4, duration: 0.7, ease: 'easeOut' }}
              className="h-full rounded-full bg-gradient-to-r from-green-500 to-green-400"
              style={{ boxShadow: '0 0 8px rgba(34,197,94,0.4)' }}
            />
          </div>
        </motion.div>
      )}

      {/* ─── DEDICATED PERSONAL TRAINER SECTION (ONLY FOR ELIGIBLE PLANS) ──── */}
      {ptEligibility?.isEligible && (
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.29 }}
          className="bg-gradient-to-r from-purple-950/40 via-[#111115] to-[#111115] border border-purple-500/30 rounded-2xl p-5 md:p-6 shadow-xl relative overflow-hidden"
        >
          <div className="absolute top-0 right-0 w-80 h-80 bg-purple-500/10 rounded-full blur-[90px] pointer-events-none" />

          <div className="flex flex-col md:flex-row md:items-center justify-between gap-5 relative z-10">
            {myTrainer ? (
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-500/30 to-indigo-500/30 border border-purple-500/30 overflow-hidden shrink-0 flex items-center justify-center">
                  {myTrainer.profileImage ? (
                    <img src={myTrainer.profileImage} alt={myTrainer.name} className="w-full h-full object-cover" />
                  ) : (
                    <Award className="w-8 h-8 text-purple-400" />
                  )}
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="px-2.5 py-0.5 bg-green-500/20 text-green-400 text-[10px] font-extrabold uppercase rounded-full border border-green-500/30">
                      My Personal Trainer
                    </span>
                  </div>
                  <h3 className="text-xl font-bold text-white">Coach {myTrainer.name}</h3>
                  <p className="text-xs text-gray-400 mt-0.5 font-medium">
                    {myTrainer.specialization?.join(' • ') || 'Strength & Hypertrophy'}
                  </p>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-purple-500/20 border border-purple-500/30 flex items-center justify-center shrink-0 text-purple-400">
                  <Sparkles className="w-7 h-7" />
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="px-2.5 py-0.5 bg-purple-500/20 text-purple-300 text-[10px] font-bold uppercase rounded-full border border-purple-500/30">
                      PT Access Unlocked
                    </span>
                  </div>
                  <h3 className="text-lg font-bold text-white">Personal Trainer Included</h3>
                  <p className="text-xs text-gray-400 mt-0.5">
                    Your active membership includes dedicated 1-on-1 coaching. Choose your trainer to get started.
                  </p>
                </div>
              </div>
            )}

            <div className="flex items-center gap-3 self-start md:self-auto">
              <Link
                to="/trainers"
                className="px-5 py-2.5 bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs rounded-xl transition-all shadow-lg shadow-purple-600/30 flex items-center gap-2"
              >
                <Calendar className="w-4 h-4" />
                <span>{myTrainer ? 'Book Session / Switch Coach' : 'Select Personal Trainer'}</span>
              </Link>
            </div>
          </div>

          {/* Upcoming PT Sessions Snippet */}
          {myTrainer && upcomingPTSessions.length > 0 && (
            <div className="mt-4 pt-4 border-t border-white/5 flex flex-wrap items-center gap-4 text-xs text-gray-300">
              <span className="font-bold text-purple-400 flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4" /> Next Confirmed Session:
              </span>
              <span className="font-semibold text-white">
                {new Date(upcomingPTSessions[0].sessionDate).toLocaleDateString(undefined, {
                  weekday: 'short',
                  month: 'short',
                  day: 'numeric',
                })}{' '}
                @ <span className="font-mono text-purple-300">{upcomingPTSessions[0].startTime}</span>
              </span>
            </div>
          )}
        </motion.div>
      )}

      {/* Charts row */}
      <div className="grid lg:grid-cols-3 gap-5">
        {/* Area chart */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="lg:col-span-2 card-surface rounded-2xl p-5 md:p-6"
        >
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="font-semibold text-white text-base">Activity Overview</h3>
              <p className="text-xs text-gray-600 mt-0.5">Estimated calories burned this week</p>
            </div>
            <span className="text-xs font-medium px-3 py-1.5 rounded-full bg-green-500/10 text-green-400 border border-green-500/20">
              This Week
            </span>
          </div>
          <div className="h-56 md:h-64 w-full">
            <ResponsiveContainer width="100%" height={256} minHeight={180}>
              <AreaChart data={weekData} margin={{ top: 4, right: 0, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="calGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#22c55e" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
                <XAxis dataKey="day" stroke="#333" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#555' }} />
                <YAxis stroke="#333" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#555' }} />
                <Tooltip content={<CustomTooltip />} />
                <Area type="monotone" dataKey="calories" stroke="#22c55e" strokeWidth={2.5} fillOpacity={1} fill="url(#calGrad)" dot={false} activeDot={{ r: 5, fill: '#22c55e', stroke: '#000', strokeWidth: 2 }} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        {/* My Exercises */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="card-surface rounded-2xl p-5 md:p-6 flex flex-col"
        >
          <div className="flex items-center justify-between mb-5">
            <h3 className="font-semibold text-white text-base">My Exercises</h3>
          </div>

          {loading ? (
            <div className="space-y-3 flex-1">
              {[1,2,3].map(i => <div key={i} className="skeleton h-12 rounded-xl" />)}
            </div>
          ) : exercises.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center gap-3">
              <div className="w-12 h-12 rounded-full bg-white/[0.04] flex items-center justify-center">
                <PackageCheck className="w-6 h-6 text-gray-700" />
              </div>
              <p className="text-gray-600 text-sm">No active package yet.</p>
              <Link to="/packages" className="text-green-400 text-sm font-semibold hover:text-green-300 transition-colors">
                Browse Packages →
              </Link>
            </div>
          ) : remainingExercises.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center gap-3">
              <div className="w-12 h-12 rounded-full bg-green-500/10 flex items-center justify-center">
                <Trophy className="w-6 h-6 text-green-400" />
              </div>
              <p className="text-green-400 text-sm font-bold">All done for today! 🎉</p>
              <p className="text-gray-600 text-xs">You've completed all exercises in your plan.</p>
            </div>
          ) : (
            <div className="flex-1 space-y-2 overflow-y-auto custom-scrollbar">
              {remainingExercises.slice(0, 5).map((ex: any, i: number) => (
                <Link
                  key={ex._id || i}
                  to={`/exercises/${ex._id}`}
                  className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-white/[0.05] transition-colors group"
                >
                  <div className="w-9 h-9 rounded-xl bg-green-500/10 flex items-center justify-center shrink-0 group-hover:bg-green-500/20 transition-colors">
                    <Dumbbell className="w-4 h-4 text-green-400" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-white truncate">{ex.name}</p>
                    <p className="text-xs text-gray-600">{ex.muscleGroup}</p>
                  </div>
                  <ArrowRight className="w-3.5 h-3.5 text-gray-700 group-hover:text-green-400 ml-auto shrink-0 transition-colors" />
                </Link>
              ))}
            </div>
          )}

          <Link
            to="/my-package"
            className="flex items-center justify-center gap-2 w-full mt-5 py-2.5 rounded-xl bg-white/[0.03] border border-white/[0.06] text-sm text-gray-600 hover:text-white hover:bg-white/[0.06] transition-all font-medium"
          >
            View full plan <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </motion.div>
      </div>

      {/* Quick actions */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="grid sm:grid-cols-2 gap-4"
      >
        <Link
          to="/packages"
          className="card-surface rounded-2xl p-5 flex items-center gap-4 hover:border-green-500/30 hover:bg-green-500/[0.03] transition-all group"
        >
          <div className="w-12 h-12 rounded-xl bg-green-500/10 flex items-center justify-center shrink-0 group-hover:bg-green-500/20 transition-colors">
            <Zap className="w-5 h-5 text-green-400" />
          </div>
          <div>
            <p className="font-semibold text-white text-sm">Browse Packages</p>
            <p className="text-xs text-gray-600 mt-0.5">Upgrade your fitness plan</p>
          </div>
          <ArrowRight className="w-4 h-4 text-gray-700 group-hover:text-green-400 ml-auto transition-colors" />
        </Link>
        <Link
          to="/workouts"
          className="card-surface rounded-2xl p-5 flex items-center gap-4 hover:border-blue-500/30 hover:bg-blue-500/[0.03] transition-all group"
        >
          <div className="w-12 h-12 rounded-xl bg-blue-500/10 flex items-center justify-center shrink-0 group-hover:bg-blue-500/20 transition-colors">
            <Dumbbell className="w-5 h-5 text-blue-400" />
          </div>
          <div>
            <p className="font-semibold text-white text-sm">My Workouts</p>
            <p className="text-xs text-gray-600 mt-0.5">Log & track your sessions</p>
          </div>
          <ArrowRight className="w-4 h-4 text-gray-700 group-hover:text-blue-400 ml-auto transition-colors" />
        </Link>
      </motion.div>
      </div>


    </div>
  );
}