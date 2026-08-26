import { useState, useEffect } from 'react';
import { adminAPI } from '../../api/apiService';
import { motion } from 'framer-motion';
import {
  Users, Package, CreditCard, Activity, TrendingUp, Bell,
  Plus, ArrowRight, Clock, ShieldCheck, Sparkles, DollarSign, RefreshCw
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { useAuth } from '../../context/AuthContext';
import { useAdminAnnouncements } from '../../hooks/useNotifications';
import { Link } from 'react-router-dom';

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

export default function AdminDashboard() {
  const { user } = useAuth();
  const { announcements } = useAdminAnnouncements();
  const [stats, setStats] = useState({ users: 0, packages: 0, purchases: 0, revenue: 0 });
  const [purchases, setPurchases] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const uRole = (user?.role || '').toUpperCase();
  const isSysAdmin = user?.isSystemAdmin || uRole === 'SYSTEM_ADMIN';

  const fetchStats = async () => {
    try {
      setRefreshing(true);
      const [usersRes, pkgsRes, purchasesRes] = await Promise.all([
        adminAPI.getAllUsers(),
        adminAPI.getAllPackages(),
        adminAPI.getAllPurchases(),
      ]);
      const allPurchases: any[] = purchasesRes.data.purchases || [];
      const totalRevenue = allPurchases.reduce((sum: number, p: any) => sum + (p.packageId?.price || p.price || 0), 0);
      setPurchases(allPurchases);
      setStats({
        users: usersRes.data.users?.length ?? 0,
        packages: pkgsRes.data.packages?.length ?? 0,
        purchases: allPurchases.length,
        revenue: totalRevenue,
      });
    } catch (error) {
      console.error('Error fetching admin stats', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  const monthlyChart = (() => {
    const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    const counts: Record<string, { sales: number; revenue: number }> = {};
    months.forEach(m => (counts[m] = { sales: 0, revenue: 0 }));
    purchases.forEach((p: any) => {
      if (p.createdAt) {
        const month = months[new Date(p.createdAt).getMonth()];
        if (counts[month]) {
          counts[month].sales += 1;
          counts[month].revenue += (p.packageId?.price || p.price || 0);
        }
      }
    });
    const currentMonth = new Date().getMonth();
    return months.slice(0, currentMonth + 1).map(m => ({ name: m, ...counts[m] }));
  })();

  const statCards = [
    {
      title: 'Total Revenue',
      value: `LKR ${stats.revenue.toLocaleString()}`,
      sub: `From ${stats.purchases} completed sales`,
      icon: DollarSign,
      iconColor: 'text-emerald-400',
      iconBg: 'bg-emerald-500/10 border-emerald-500/20',
      glow: 'shadow-[0_0_25px_rgba(16,185,129,0.12)]',
      trend: stats.purchases > 0 ? `+${stats.purchases} active purchases` : 'No sales yet',
      trendUp: stats.purchases > 0,
    },
    {
      title: 'Total Registered Users',
      value: stats.users.toLocaleString(),
      sub: 'Members, trainers & staff',
      icon: Users,
      iconColor: 'text-blue-400',
      iconBg: 'bg-blue-500/10 border-blue-500/20',
      glow: 'shadow-[0_0_25px_rgba(59,130,246,0.12)]',
      trend: stats.users > 0 ? `${stats.users} active accounts` : 'No accounts yet',
      trendUp: stats.users > 0,
    },
    {
      title: 'Gym Packages',
      value: stats.packages,
      sub: 'Published membership tiers',
      icon: Package,
      iconColor: 'text-purple-400',
      iconBg: 'bg-purple-500/10 border-purple-500/20',
      glow: 'shadow-[0_0_25px_rgba(168,85,247,0.12)]',
      trend: `${stats.packages} packages active`,
      trendUp: stats.packages > 0,
      link: '/admin/packages',
    },
    {
      title: 'Broadcasts & Alerts',
      value: announcements.length,
      sub: `${announcements.filter(a => a.pinned).length} pinned announcements`,
      icon: Bell,
      iconColor: 'text-amber-400',
      iconBg: 'bg-amber-500/10 border-amber-500/20',
      glow: 'shadow-[0_0_25px_rgba(245,158,11,0.12)]',
      trend: 'Manage system announcements',
      trendUp: false,
      link: '/admin/notifications',
    },
  ];

  const quickActions = [
    { label: 'Manage Users',      desc: 'Roles & Status', icon: Users,      color: 'text-blue-400',   bg: 'bg-blue-500/10 border-blue-500/20',   hover: 'hover:border-blue-500/40 hover:bg-blue-500/[0.04]',   path: '/admin/users' },
    { label: 'Manage Packages',   desc: 'Pricing & Plans',icon: Package,    color: 'text-emerald-400',bg: 'bg-emerald-500/10 border-emerald-500/20',hover: 'hover:border-emerald-500/40 hover:bg-emerald-500/[0.04]',path: '/admin/packages' },
    { label: 'Review Purchases',  desc: 'Bank Slips & Receipts', icon: CreditCard, color: 'text-amber-400',  bg: 'bg-amber-500/10 border-amber-500/20',  hover: 'hover:border-amber-500/40 hover:bg-amber-500/[0.04]',  path: '/admin/purchases' },
    { label: 'New Announcement',  desc: 'Broadcast Alert',icon: Bell,       color: 'text-purple-400', bg: 'bg-purple-500/10 border-purple-500/20', hover: 'hover:border-purple-500/40 hover:bg-purple-500/[0.04]', path: '/admin/notifications' },
  ];

  const todayStr = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric', year: 'numeric' });

  return (
    <div className="space-y-8 text-white pb-16 relative min-h-[85vh]">
      {/* Background glow graphics */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-purple-600/10 blur-[130px] rounded-full pointer-events-none -z-10" />
      <div className="absolute top-48 right-10 w-96 h-96 bg-blue-600/10 blur-[130px] rounded-full pointer-events-none -z-10" />

      {/* Hero Welcome Header */}
      <motion.div
        initial={{ opacity: 0, y: -16 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-[#121118] via-[#0f0e15] to-[#14121c] border border-white/10 p-7 md:p-8 shadow-2xl"
      >
        <div className="absolute top-0 right-0 w-96 h-full bg-gradient-to-l from-purple-500/10 via-blue-500/5 to-transparent pointer-events-none" />

        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2.5">
              <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider border ${
                isSysAdmin
                  ? 'bg-amber-500/10 text-amber-400 border-amber-500/30 shadow-[0_0_12px_rgba(245,158,11,0.2)]'
                  : 'bg-purple-500/10 text-purple-400 border-purple-500/30 shadow-[0_0_12px_rgba(168,85,247,0.2)]'
              }`}>
                <ShieldCheck className="w-3.5 h-3.5" />
                {isSysAdmin ? 'System Administrator' : 'Admin Operations'}
              </span>

              <span className="text-xs text-gray-400 font-medium px-3 py-1 rounded-full bg-white/[0.04] border border-white/[0.08] flex items-center gap-1.5">
                <Clock className="w-3 h-3 text-gray-400" />
                {todayStr}
              </span>
            </div>

            <h1 className="text-3xl md:text-4xl font-display font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-white via-gray-100 to-gray-400 tracking-tight">
              Welcome back, {user?.name || 'Admin'} 👋
            </h1>
            <p className="text-gray-400 text-sm max-w-2xl leading-relaxed">
              Here is your real-time performance summary, revenue metrics, member activity, and platform management tools.
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <button
              onClick={fetchStats}
              disabled={refreshing}
              className="px-4 py-2.5 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] border border-white/10 text-gray-300 hover:text-white text-xs font-semibold flex items-center gap-2 transition-all disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin text-purple-400' : ''}`} />
              Refresh Data
            </button>
          </div>
        </div>
      </motion.div>

      {/* Quick Action Navigation Cards */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-bold uppercase tracking-widest text-gray-400 flex items-center gap-2">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            Quick Operations
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {quickActions.map((action, idx) => {
            const Icon = action.icon;
            return (
              <motion.div
                key={action.label}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.05 * idx }}
              >
                <Link
                  to={action.path}
                  className={`group relative p-4 rounded-2xl bg-[#0f0e13]/80 backdrop-blur-md border border-white/[0.08] transition-all duration-300 flex items-center gap-4 ${action.hover} shadow-lg`}
                >
                  <div className={`w-12 h-12 rounded-xl border ${action.bg} flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform duration-300`}>
                    <Icon className={`w-6 h-6 ${action.color}`} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-bold text-sm text-white group-hover:text-purple-300 transition-colors flex items-center gap-1">
                      {action.label}
                    </p>
                    <p className="text-xs text-gray-500 font-medium truncate mt-0.5">{action.desc}</p>
                  </div>
                  <ArrowRight className="w-4 h-4 text-gray-600 group-hover:text-white group-hover:translate-x-1 transition-all shrink-0" />
                </Link>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* Stat Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {statCards.map((stat, i) => {
          const Icon = stat.icon;
          const content = (
            <motion.div
              key={stat.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.08 + 0.1 }}
              className={`p-6 rounded-3xl bg-[#0f0e13]/90 backdrop-blur-md border border-white/10 relative overflow-hidden transition-all duration-300 hover:border-white/20 hover:-translate-y-1 ${stat.glow}`}
            >
              <div className="flex items-center justify-between mb-4">
                <div className={`w-12 h-12 rounded-2xl border ${stat.iconBg} flex items-center justify-center shadow-inner`}>
                  <Icon className={`w-6 h-6 ${stat.iconColor}`} />
                </div>
                <div className={`flex items-center gap-1 text-[10px] font-bold px-2.5 py-1 rounded-full border ${stat.trendUp ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-white/[0.04] text-gray-400 border-white/[0.08]'}`}>
                  {stat.trendUp && <TrendingUp className="w-3 h-3" />}
                  {stat.trend}
                </div>
              </div>

              <p className="text-gray-400 text-xs font-bold uppercase tracking-wider mb-1">{stat.title}</p>
              {loading ? (
                <div className="h-9 w-28 bg-white/5 animate-pulse rounded-lg mb-1" />
              ) : (
                <p className="font-display text-2xl md:text-3xl font-black text-white tracking-tight mb-1">{stat.value}</p>
              )}
              <p className="text-gray-500 text-xs font-medium">{stat.sub}</p>
            </motion.div>
          );

          return stat.link ? (
            <Link key={stat.title} to={stat.link}>{content}</Link>
          ) : (
            <div key={stat.title}>{content}</div>
          );
        })}
      </div>

      {/* Analytics Charts & Activity Column */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Charts Column (2 cols) */}
        <div className="lg:col-span-2 space-y-6">

          {/* Revenue Chart */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="p-6 rounded-3xl bg-[#0f0e13]/90 backdrop-blur-md border border-white/10 shadow-2xl relative overflow-hidden"
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
              <div>
                <h3 className="font-bold text-lg text-white flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-emerald-400" />
                  Monthly Revenue Overview
                </h3>
                <p className="text-xs text-gray-500 mt-0.5">Real-time revenue generated from package & membership sales</p>
              </div>
              <div className="px-4 py-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-sm font-bold flex items-center gap-2">
                <span>Total:</span>
                <span className="text-emerald-400 text-base">LKR {stats.revenue.toLocaleString()}</span>
              </div>
            </div>

            <div className="h-60 w-full pt-2">
              {monthlyChart.length === 0 ? (
                <div className="h-full flex items-center justify-center text-gray-500 text-sm">No revenue data available</div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={monthlyChart} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                    <XAxis dataKey="name" stroke="#666" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#888' }} />
                    <YAxis stroke="#666" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#888' }} />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#14131a', borderColor: 'rgba(255,255,255,0.12)', borderRadius: '16px', boxShadow: '0 10px 30px rgba(0,0,0,0.5)' }}
                      formatter={(val: any) => [`LKR ${Number(val).toLocaleString()}`, 'Revenue']}
                    />
                    <Bar dataKey="revenue" radius={[8, 8, 0, 0]}>
                      {monthlyChart.map((_, i) => (
                        <Cell key={i} fill={i === monthlyChart.length - 1 ? '#10b981' : '#10b98150'} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </motion.div>

          {/* Package Sales Count Chart */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="p-6 rounded-3xl bg-[#0f0e13]/90 backdrop-blur-md border border-white/10 shadow-2xl relative overflow-hidden"
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
              <div>
                <h3 className="font-bold text-lg text-white flex items-center gap-2">
                  <Activity className="w-5 h-5 text-blue-400" />
                  Monthly Package Sales Count
                </h3>
                <p className="text-xs text-gray-500 mt-0.5">Total plan activations per month</p>
              </div>
              <div className="px-4 py-2 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-300 text-sm font-bold flex items-center gap-2">
                <span>Orders:</span>
                <span className="text-blue-400 text-base">{stats.purchases} total</span>
              </div>
            </div>

            <div className="h-60 w-full pt-2">
              {monthlyChart.length === 0 ? (
                <div className="h-full flex items-center justify-center text-gray-500 text-sm">No sales data available</div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={monthlyChart} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                    <XAxis dataKey="name" stroke="#666" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#888' }} />
                    <YAxis stroke="#666" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#888' }} allowDecimals={false} />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#14131a', borderColor: 'rgba(255,255,255,0.12)', borderRadius: '16px', boxShadow: '0 10px 30px rgba(0,0,0,0.5)' }}
                      formatter={(val: any) => [val, 'Sales']}
                    />
                    <Bar dataKey="sales" radius={[8, 8, 0, 0]}>
                      {monthlyChart.map((_, i) => (
                        <Cell key={i} fill={i === monthlyChart.length - 1 ? '#3b82f6' : '#3b82f650'} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </motion.div>
        </div>

        {/* Side Column: Recent Activity Feeds */}
        <div className="space-y-6">

          {/* Recent Announcements Widget */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35 }}
            className="p-6 rounded-3xl bg-[#0f0e13]/90 backdrop-blur-md border border-white/10 shadow-2xl"
          >
            <div className="flex items-center justify-between pb-4 border-b border-white/[0.08]">
              <div className="flex items-center gap-2">
                <Bell className="w-4 h-4 text-purple-400" />
                <h3 className="font-bold text-sm text-white">Announcements</h3>
              </div>
              <Link to="/admin/notifications" className="text-xs text-purple-400 hover:text-purple-300 font-semibold flex items-center gap-1 transition-colors">
                Manage <ArrowRight className="w-3 h-3" />
              </Link>
            </div>

            <div className="divide-y divide-white/[0.04] mt-2">
              {announcements.length === 0 ? (
                <div className="py-8 flex flex-col items-center gap-3 text-center">
                  <Bell className="w-8 h-8 text-gray-700" />
                  <p className="text-gray-500 text-xs">No broadcast announcements created yet</p>
                  <Link to="/admin/notifications" className="px-3.5 py-1.5 bg-purple-600 text-white font-bold text-xs rounded-xl hover:bg-purple-500 transition-all flex items-center gap-1.5">
                    <Plus className="w-3.5 h-3.5" /> Create Announcement
                  </Link>
                </div>
              ) : (
                announcements.slice(0, 5).map((ann, i) => (
                  <div key={ann.id || i} className="py-3 flex items-start gap-3 group">
                    <span className={`mt-1.5 w-2 h-2 rounded-full shrink-0 ${
                      ann.type === 'urgent' ? 'bg-red-400 shadow-[0_0_8px_rgba(239,68,68,0.5)]' :
                      ann.type === 'warning' ? 'bg-amber-400 shadow-[0_0_8px_rgba(245,158,11,0.5)]' :
                      ann.type === 'success' ? 'bg-emerald-400 shadow-[0_0_8px_rgba(16,185,129,0.5)]' : 'bg-blue-400 shadow-[0_0_8px_rgba(59,130,246,0.5)]'
                    }`} />
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-bold text-gray-200 group-hover:text-white transition-colors truncate">{ann.title}</p>
                      <p className="text-[11px] text-gray-500 flex items-center gap-1 mt-0.5">
                        <Clock className="w-2.5 h-2.5 text-gray-600" /> {timeAgo(ann.createdAt)}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </motion.div>

          {/* Recent Purchases Feed Widget */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.45 }}
            className="p-6 rounded-3xl bg-[#0f0e13]/90 backdrop-blur-md border border-white/10 shadow-2xl"
          >
            <div className="flex items-center justify-between pb-4 border-b border-white/[0.08]">
              <div className="flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-emerald-400" />
                <h3 className="font-bold text-sm text-white">Recent Purchases</h3>
              </div>
              <Link to="/admin/purchases" className="text-xs text-emerald-400 hover:text-emerald-300 font-semibold flex items-center gap-1 transition-colors">
                View all <ArrowRight className="w-3 h-3" />
              </Link>
            </div>

            <div className="divide-y divide-white/[0.04] mt-2">
              {purchases.length === 0 ? (
                <div className="py-8 text-center text-gray-500 text-xs">No purchase transactions recorded yet</div>
              ) : (
                purchases.slice(0, 5).map((p: any) => (
                  <div key={p._id} className="py-3 flex items-center gap-3 group">
                    <div className="w-8 h-8 rounded-xl bg-purple-500/20 border border-purple-500/30 text-purple-300 font-bold text-xs flex items-center justify-center shrink-0 overflow-hidden">
                      {p.userId?.profileImage ? (
                        <img src={p.userId.profileImage} alt={p.userId?.name || 'Member'} className="w-full h-full object-cover" />
                      ) : (
                        (p.userId?.name || 'M').charAt(0).toUpperCase()
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-bold text-gray-200 group-hover:text-white transition-colors truncate">
                        {p.userId?.name || p.userId?.email?.split('@')[0] || 'Member'}
                      </p>
                      <p className="text-[11px] text-gray-500 truncate">{p.packageId?.name || 'Gym Package'}</p>
                    </div>
                    <span className="text-xs font-bold text-emerald-400 shrink-0">
                      LKR {(p.packageId?.price || p.price || 0).toLocaleString()}
                    </span>
                  </div>
                ))
              )}
            </div>
          </motion.div>

        </div>
      </div>
    </div>
  );
}
