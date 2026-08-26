import { useState, useEffect } from 'react';
import { purchaseAPI, trainerAPI } from '../api/apiService';
import { useAuth } from '../context/AuthContext';
import { motion } from 'framer-motion';
import {
  Trophy, ArrowRight, Zap, Pin, X, Info, CheckCircle, AlertTriangle, Quote,
  Award, Calendar, Sparkles, CheckCircle2, Clock, Building2, QrCode, ShieldCheck
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAnnouncements, AnnouncementType } from '../hooks/useNotifications';

const MOTIVATIONAL_QUOTES = [
  { quote: "Consistency is what transforms average into excellence.", author: "Unknown" },
  { quote: "Success starts with self-discipline.", author: "Unknown" },
  { quote: "Your only limit is you.", author: "Unknown" },
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

export default function Dashboard() {
  const { user } = useAuth();
  const [activePackage, setActivePackage] = useState<any>(null);
  const [pendingPurchase, setPendingPurchase] = useState<any>(null);
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
  const actualVisible = visiblePinned.filter((a) => !dismissedPinned.includes(a.id));

  useEffect(() => {
    const fetchAll = async () => {
      try {
        const [purchaseRes, eligRes] = await Promise.all([
          purchaseAPI.getMy().catch(() => ({ data: { purchases: [] } })),
          trainerAPI.getEligibility().catch(() => ({ data: { isEligible: false } })),
        ]);

        const purchases = purchaseRes.data?.purchases || [];
        const activePurchases =
          purchaseRes.data?.activePurchases || purchases.filter((p: any) => p.status === 'paid');
        const pendingPurchases =
          purchaseRes.data?.pendingPurchases ||
          purchases.filter(
            (p: any) =>
              ['pending_approval', 'pending_verification', 'pending'].includes(p.status) &&
              p.paymentMethod === 'bank_transfer'
          );

        if (activePurchases.length > 0) {
          setActivePackage(activePurchases[0].packageId);
        } else {
          setActivePackage(null);
        }

        if (pendingPurchases.length > 0) {
          setPendingPurchase(pendingPurchases[0]);
        } else {
          setPendingPurchase(null);
        }

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
        // silent error fallback
      } finally {
        setLoading(false);
      }
    };
    fetchAll();
  }, []);

  const stats = [
    {
      title: 'Active Membership',
      value: loading ? null : activePackage ? activePackage.name : 'No Active Plan',
      sub: activePackage ? activePackage.duration || 'Active Membership' : 'Browse packages to start',
      icon: Trophy,
      iconColor: 'text-yellow-400',
      iconBg: 'bg-yellow-500/10',
      gradient: 'from-yellow-500/8',
    },
    {
      title: 'Digital Entry Pass',
      value: 'QR Pass',
      sub: 'Scan at reception counter',
      icon: QrCode,
      iconColor: 'text-green-400',
      iconBg: 'bg-green-500/10',
      gradient: 'from-green-500/8',
    },
    {
      title: 'Personal Training',
      value: ptEligibility?.isEligible ? (myTrainer ? `Coach ${myTrainer.name}` : 'Available') : 'Not Included',
      sub: ptEligibility?.isEligible ? '1-on-1 scheduling unlocked' : 'Upgrade package for 1-on-1 PT',
      icon: Award,
      iconColor: 'text-purple-400',
      iconBg: 'bg-purple-500/10',
      gradient: 'from-purple-500/8',
    },
    {
      title: 'Member Account',
      value: user?.role || 'MEMBER',
      sub: user?.email || 'Verified account',
      icon: ShieldCheck,
      iconColor: 'text-blue-400',
      iconBg: 'bg-blue-500/10',
      gradient: 'from-blue-500/8',
    },
  ];

  return (
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
                style={{
                  background: cfg.bg,
                  borderLeft: `3px solid ${cfg.border}`,
                  border: `1px solid rgba(255,255,255,0.07)`,
                  borderLeftColor: cfg.border,
                  borderLeftWidth: '3px',
                }}
              >
                <Pin className="w-3.5 h-3.5 mt-0.5 shrink-0" style={{ color: cfg.icon }} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span style={{ color: cfg.icon }}>{TYPE_ICONS[ann.type]}</span>
                    <p className="font-semibold text-sm" style={{ color: cfg.text }}>
                      {ann.title}
                    </p>
                    <span className="text-[9px] font-bold uppercase tracking-wider text-yellow-400 bg-yellow-400/10 px-1.5 py-0.5 rounded">
                      Pinned
                    </span>
                  </div>
                  <p className="text-xs text-gray-400 leading-relaxed">{ann.message}</p>
                </div>
                <button
                  onClick={() => {
                    markRead(ann.id);
                    setDismissedPinned((p) => [...p, ann.id]);
                  }}
                  className="shrink-0 text-gray-600 hover:text-white transition-colors p-1 rounded-lg hover:bg-white/[0.06]"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Dynamic Greeting & Member Header Banner */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-start justify-between flex-wrap gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="px-2.5 py-0.5 rounded-full bg-green-500/10 text-green-400 border border-green-500/20 text-[10px] font-extrabold uppercase tracking-wider flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                Pro Member
              </span>
              {activePackage && (
                <span className="px-2.5 py-0.5 rounded-full bg-yellow-500/10 text-yellow-400 border border-yellow-500/20 text-[10px] font-extrabold uppercase tracking-wider">
                  {activePackage.name}
                </span>
              )}
            </div>
            <h1 className="font-display text-3xl md:text-4xl font-extrabold text-white tracking-tight flex items-center gap-2">
              {(() => {
                const hour = new Date().getHours();
                if (hour < 12) return 'Good Morning';
                if (hour < 18) return 'Good Afternoon';
                return 'Good Evening';
              })()}, {user?.name?.split(' ')[0]}! 👋
            </h1>
            <p className="text-gray-400 text-sm mt-1">Here's your gym membership, digital entry pass, & facility overview.</p>
          </div>

          <div className="flex items-center gap-3">
            <Link
              to="/attendance-qr"
              className="px-4 py-2.5 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-400 hover:to-emerald-500 text-black font-extrabold text-xs rounded-xl transition-all shadow-[0_0_20px_rgba(34,197,94,0.3)] flex items-center gap-2 shrink-0"
            >
              <QrCode className="w-4 h-4" />
              <span>Digital QR Pass</span>
            </Link>

            {/* Motivational quote snippet */}
            <div className="hidden xl:flex items-start gap-2.5 max-w-xs p-3 rounded-2xl bg-white/[0.025] border border-white/[0.07] backdrop-blur-md">
              <Quote className="w-4 h-4 text-green-400 shrink-0 mt-0.5" />
              <div>
                <p className="text-xs text-gray-300 italic leading-relaxed">"{todayQuote.quote}"</p>
                <p className="text-[10px] text-gray-500 mt-1 font-semibold">— {todayQuote.author}</p>
              </div>
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
                Your package features and digital attendance QR pass will become fully active after administrator approval.
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

      {/* Plan Expiration & Renewal Package Recommendation Banner */}
      {activePackage && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl p-5 bg-gradient-to-r from-purple-950/40 via-[#111115] to-[#121110] border border-purple-500/30 text-white relative overflow-hidden shadow-xl"
        >
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-xl bg-purple-500/20 text-purple-300 flex items-center justify-center shrink-0 border border-purple-500/30">
              <Sparkles className="w-5 h-5 text-purple-300" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1 flex-wrap">
                <span className="px-2.5 py-0.5 bg-purple-500/20 text-purple-300 text-[10px] font-extrabold uppercase rounded-full border border-purple-500/30 flex items-center gap-1">
                  Active Package: {activePackage.name}
                </span>
                <span className="text-xs text-green-400 font-semibold">
                  ✓ Valid & Active ({activePackage.duration || '1 Month'})
                </span>
              </div>
              <h3 className="text-base font-bold text-white">
                Explore Newly Available Plans & Upgrade Options
              </h3>
              <p className="text-xs text-gray-300 mt-1 leading-relaxed">
                Stay updated with our latest gym packages, 1-on-1 personal trainer inclusions, and family membership tiers. When your current plan completes, instant renewals are processed seamlessly.
              </p>
              <div className="mt-3 flex items-center gap-3">
                <Link
                  to="/packages"
                  className="px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-xs font-bold rounded-xl transition-all inline-flex items-center gap-1.5 shadow-md shadow-purple-600/30"
                >
                  View Available Plans <ArrowRight className="w-3.5 h-3.5" />
                </Link>
                <Link
                  to="/my-package"
                  className="px-3.5 py-2 bg-white/5 hover:bg-white/10 text-gray-300 text-xs font-bold rounded-xl transition-all border border-white/10"
                >
                  My Package Details
                </Link>
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, i) => {
          const Icon = stat.icon;
          return (
            <motion.div
              key={stat.title}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              whileHover={{ y: -4, scale: 1.02 }}
              transition={{ delay: i * 0.07, type: 'spring', stiffness: 200 }}
              className={`stat-card bg-gradient-to-br ${stat.gradient} to-transparent border border-white/[0.08] hover:border-white/20 backdrop-blur-xl shadow-lg transition-all`}
            >
              <div className="flex items-center justify-between mb-3">
                <div className={`w-10 h-10 rounded-xl ${stat.iconBg} flex items-center justify-center border border-white/5`}>
                  <Icon className={`w-5 h-5 ${stat.iconColor}`} />
                </div>
                <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest bg-white/[0.04] px-2 py-0.5 rounded-full border border-white/5">
                  Live
                </span>
              </div>
              <p className="text-gray-400 text-xs font-semibold mb-1">{stat.title}</p>
              {loading ? (
                <div className="skeleton h-7 w-24 mb-1" />
              ) : (
                <p className="font-display text-xl md:text-2xl font-black text-white leading-none mb-1.5 truncate">
                  {stat.value}
                </p>
              )}
              <p className="text-gray-500 text-[11px] leading-snug truncate">{stat.sub}</p>
            </motion.div>
          );
        })}
      </div>

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
                      My Dedicated Personal Trainer
                    </span>
                  </div>
                  <h3 className="text-xl font-bold text-white">Coach {myTrainer.name}</h3>
                  <p className="text-xs text-gray-400 mt-0.5 font-medium">
                    {myTrainer.specialization?.join(' • ') || 'Certified Gym Coach'}
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
                      PT Scheduling Unlocked
                    </span>
                  </div>
                  <h3 className="text-lg font-bold text-white">Personal Trainer Included</h3>
                  <p className="text-xs text-gray-400 mt-0.5">
                    Your active membership includes 1-on-1 coaching sessions. Choose your coach to reserve recurring weekly slots.
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
                <span>{myTrainer ? 'Book Sessions / Switch Coach' : 'Select Personal Trainer'}</span>
              </Link>
            </div>
          </div>

          {/* Upcoming PT Sessions Snippet */}
          {myTrainer && upcomingPTSessions.length > 0 && (
            <div className="mt-4 pt-4 border-t border-white/5 flex flex-wrap items-center gap-4 text-xs text-gray-300">
              <span className="font-bold text-purple-400 flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4" /> Next Confirmed Reservation:
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

      {/* Quick actions */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
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
            <p className="font-semibold text-white text-sm">Browse Gym Packages</p>
            <p className="text-xs text-gray-600 mt-0.5">Explore Individual & Family memberships</p>
          </div>
          <ArrowRight className="w-4 h-4 text-gray-700 group-hover:text-green-400 ml-auto transition-colors" />
        </Link>

        <Link
          to="/attendance-qr"
          className="card-surface rounded-2xl p-5 flex items-center gap-4 hover:border-blue-500/30 hover:bg-blue-500/[0.03] transition-all group"
        >
          <div className="w-12 h-12 rounded-xl bg-blue-500/10 flex items-center justify-center shrink-0 group-hover:bg-blue-500/20 transition-colors">
            <QrCode className="w-5 h-5 text-blue-400" />
          </div>
          <div>
            <p className="font-semibold text-white text-sm">Digital Entry Pass & QR</p>
            <p className="text-xs text-gray-600 mt-0.5">Show QR code at facility entrance</p>
          </div>
          <ArrowRight className="w-4 h-4 text-gray-700 group-hover:text-blue-400 ml-auto transition-colors" />
        </Link>
      </motion.div>
    </div>
  );
}