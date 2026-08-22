import { useState, useEffect } from 'react';
import { adminAPI } from '../../api/apiService';
import { motion } from 'framer-motion';
import {
  Users, Package, CreditCard, Activity, TrendingUp, Bell, Dumbbell,
  Plus, ArrowRight, Clock
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

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const [usersRes, pkgsRes, purchasesRes] = await Promise.all([
          adminAPI.getAllUsers(),
          adminAPI.getAllPackages(),
          adminAPI.getAllPurchases(),
        ]);
        const allPurchases: any[] = purchasesRes.data.purchases || [];
        const totalRevenue = allPurchases.reduce((sum: number, p: any) => sum + (p.packageId?.price || 0), 0);
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
      }
    };
    fetchStats();
  }, []);

  const monthlyChart = (() => {
    const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    const counts: Record<string, { sales: number; revenue: number }> = {};
    months.forEach(m => (counts[m] = { sales: 0, revenue: 0 }));
    purchases.forEach((p: any) => {
      const month = months[new Date(p.createdAt).getMonth()];
      if (counts[month]) {
        counts[month].sales += 1;
        counts[month].revenue += p.packageId?.price || 0;
      }
    });
    const currentMonth = new Date().getMonth();
    return months.slice(0, currentMonth + 1).map(m => ({ name: m, ...counts[m] }));
  })();

  const statCards = [
    {
      title: 'Total Revenue', value: `$${stats.revenue.toLocaleString()}`,
      sub: `From ${stats.purchases} sales`, icon: CreditCard,
      iconColor: 'text-green-400', iconBg: 'bg-green-500/10',
      trend: stats.purchases > 0 ? `+${stats.purchases} orders` : 'No sales yet',
      trendUp: stats.purchases > 0,
    },
    {
      title: 'Total Users', value: stats.users,
      sub: 'Registered accounts', icon: Users,
      iconColor: 'text-blue-400', iconBg: 'bg-blue-500/10',
      trend: stats.users > 0 ? `${stats.users} total` : 'None yet',
      trendUp: stats.users > 0,
    },
    {
      title: 'Packages', value: stats.packages,
      sub: 'Active fitness plans', icon: Package,
      iconColor: 'text-purple-400', iconBg: 'bg-purple-500/10',
      trend: `${stats.packages} plans available`,
      trendUp: stats.packages > 0,
    },
    {
      title: 'Announcements', value: announcements.length,
      sub: `${announcements.filter(a => a.pinned).length} pinned`, icon: Bell,
      iconColor: 'text-orange-400', iconBg: 'bg-orange-500/10',
      trend: 'Manage notifications',
      trendUp: false,
      link: '/admin/notifications',
    },
  ];

  const quickActions = [
    { label: 'New Announcement', icon: Bell,    color: 'text-purple-400', bg: 'bg-purple-500/10', border: 'hover:border-purple-500/30', path: '/admin/notifications' },
    { label: 'Add Package',      icon: Plus,    color: 'text-green-400',  bg: 'bg-green-500/10',  border: 'hover:border-green-500/30',  path: '/admin/packages' },
    { label: 'Add Exercise',     icon: Dumbbell,color: 'text-blue-400',   bg: 'bg-blue-500/10',   border: 'hover:border-blue-500/30',   path: '/admin/exercises' },
    { label: 'Manage Users',     icon: Users,   color: 'text-yellow-400', bg: 'bg-yellow-500/10', border: 'hover:border-yellow-500/30', path: '/admin/users' },
  ];

  return (
    <div className="space-y-6 text-white pb-12">

      {/* Header */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="font-display text-3xl md:text-4xl font-bold mb-1">Admin Dashboard</h1>
        <p className="text-gray-500 text-sm">Welcome back, <span className="text-white font-medium">{user?.name}</span>. Here's your platform overview.</p>
      </motion.div>

      {/* Quick Actions bar */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.08 }}
        className="grid grid-cols-2 sm:grid-cols-4 gap-3"
      >
        {quickActions.map((qa) => {
          const Icon = qa.icon;
          return (
            <Link
              key={qa.label}
              to={qa.path}
              className={`card-surface rounded-2xl p-4 flex flex-col items-center gap-2.5 text-center transition-all ${qa.border} hover:bg-white/[0.03] group`}
            >
              <div className={`w-10 h-10 rounded-xl ${qa.bg} flex items-center justify-center group-hover:scale-110 transition-transform`}>
                <Icon className={`w-5 h-5 ${qa.color}`} />
              </div>
              <p className="text-xs font-semibold text-gray-400 group-hover:text-white transition-colors leading-tight">{qa.label}</p>
            </Link>
          );
        })}
      </motion.div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((stat, i) => {
          const Icon = stat.icon;
          const card = (
            <motion.div
              key={stat.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.08 + 0.1 }}
              className="stat-card cursor-pointer"
            >
              <div className={`w-10 h-10 rounded-xl ${stat.iconBg} flex items-center justify-center mb-4`}>
                <Icon className={`w-5 h-5 ${stat.iconColor}`} />
              </div>
              <p className="text-gray-500 text-xs font-medium mb-1.5">{stat.title}</p>
              {loading ? (
                <div className="skeleton h-7 w-20 mb-1" />
              ) : (
                <p className="font-display text-2xl font-bold text-white mb-1">{stat.value}</p>
              )}
              <p className="text-gray-600 text-xs">{stat.sub}</p>
              {stat.trend && (
                <div className={`flex items-center gap-1 mt-2 text-[10px] font-semibold ${stat.trendUp ? 'text-green-400' : 'text-gray-600'}`}>
                  {stat.trendUp && <TrendingUp className="w-3 h-3" />}
                  {stat.trend}
                </div>
              )}
            </motion.div>
          );
          return stat.link ? (
            <Link key={stat.title} to={stat.link}>{card}</Link>
          ) : (
            <div key={stat.title}>{card}</div>
          );
        })}
      </div>

      {/* Charts + Activity */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Charts column */}
        <div className="lg:col-span-2 space-y-6">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="card-surface rounded-2xl p-6"
          >
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="font-semibold text-white">Revenue by Month</h3>
                <p className="text-xs text-gray-600 mt-0.5">From real purchase data</p>
              </div>
              <div className="flex items-center gap-2 text-green-400 text-sm font-bold">
                <TrendingUp className="w-4 h-4" />
                ${stats.revenue.toLocaleString()}
              </div>
            </div>
            <div className="h-52 w-full">
              {monthlyChart.length === 0 ? (
                <div className="h-full flex items-center justify-center text-gray-700 text-sm">No sales data yet</div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={monthlyChart} margin={{ top: 4, right: 0, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
                    <XAxis dataKey="name" stroke="#333" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#555' }} />
                    <YAxis stroke="#333" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#555' }} />
                    <Tooltip contentStyle={{ backgroundColor: '#111113', borderColor: 'rgba(255,255,255,0.08)', borderRadius: '12px' }} formatter={(val: any) => [`$${val}`, 'Revenue']} />
                    <Bar dataKey="revenue" radius={[6, 6, 0, 0]}>
                      {monthlyChart.map((_, i) => (
                        <Cell key={i} fill={i === monthlyChart.length - 1 ? '#22c55e' : '#22c55e40'} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </motion.div>

          {/* Sales chart */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="card-surface rounded-2xl p-6"
          >
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="font-semibold text-white">Sales by Month</h3>
                <p className="text-xs text-gray-600 mt-0.5">Number of packages sold</p>
              </div>
              <div className="flex items-center gap-2 text-blue-400 text-sm font-bold">
                <Activity className="w-4 h-4" />
                {stats.purchases} total
              </div>
            </div>
            <div className="h-52 w-full">
              {monthlyChart.length === 0 ? (
                <div className="h-full flex items-center justify-center text-gray-700 text-sm">No sales data yet</div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={monthlyChart} margin={{ top: 4, right: 0, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
                    <XAxis dataKey="name" stroke="#333" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#555' }} />
                    <YAxis stroke="#333" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#555' }} allowDecimals={false} />
                    <Tooltip contentStyle={{ backgroundColor: '#111113', borderColor: 'rgba(255,255,255,0.08)', borderRadius: '12px' }} formatter={(val: any) => [val, 'Sales']} />
                    <Bar dataKey="sales" radius={[6, 6, 0, 0]}>
                      {monthlyChart.map((_, i) => (
                        <Cell key={i} fill={i === monthlyChart.length - 1 ? '#3b82f6' : '#3b82f640'} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </motion.div>
        </div>

        {/* Activity Feed + Announcements */}
        <div className="space-y-5">
          {/* Recent announcements */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.45 }}
            className="card-surface rounded-2xl overflow-hidden"
          >
            <div className="flex items-center justify-between p-5 border-b border-white/[0.06]">
              <h3 className="font-semibold text-sm text-white">Announcements</h3>
              <Link to="/admin/notifications" className="text-xs text-purple-400 hover:text-purple-300 transition-colors flex items-center gap-1">
                Manage <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
            <div className="divide-y divide-white/[0.04]">
              {announcements.length === 0 ? (
                <div className="py-8 flex flex-col items-center gap-3 text-center px-4">
                  <Bell className="w-7 h-7 text-gray-700" />
                  <p className="text-gray-600 text-xs">No announcements yet</p>
                  <Link to="/admin/notifications" className="btn-primary text-xs py-1.5 px-3">
                    <Plus className="w-3.5 h-3.5" /> Create one
                  </Link>
                </div>
              ) : (
                announcements.slice(0, 5).map((ann, i) => (
                  <motion.div
                    key={ann.id}
                    initial={{ opacity: 0, x: 12 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.5 + i * 0.04 }}
                    className="px-4 py-3 flex items-start gap-3"
                  >
                    <span className={`mt-1 w-2 h-2 rounded-full shrink-0 ${
                      ann.type === 'urgent' ? 'bg-red-400' :
                      ann.type === 'warning' ? 'bg-yellow-400' :
                      ann.type === 'success' ? 'bg-green-400' : 'bg-blue-400'
                    }`} />
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-semibold text-white truncate">{ann.title}</p>
                      <p className="text-[10px] text-gray-600 mt-0.5 flex items-center gap-1">
                        <Clock className="w-2.5 h-2.5" /> {timeAgo(ann.createdAt)}
                      </p>
                    </div>
                  </motion.div>
                ))
              )}
            </div>
          </motion.div>

          {/* Recent Purchases */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.55 }}
            className="card-surface rounded-2xl overflow-hidden"
          >
            <div className="flex items-center justify-between p-5 border-b border-white/[0.06]">
              <h3 className="font-semibold text-sm text-white">Recent Purchases</h3>
              <Link to="/admin/purchases" className="text-xs text-green-400 hover:text-green-300 transition-colors flex items-center gap-1">
                View all <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
            <div className="divide-y divide-white/[0.04]">
              {purchases.length === 0 ? (
                <p className="text-center text-gray-700 text-xs py-8">No purchases yet.</p>
              ) : (
                purchases.slice(0, 5).map((p: any, i: number) => (
                  <motion.div
                    key={p._id}
                    initial={{ opacity: 0, x: 12 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.6 + i * 0.04 }}
                    className="px-4 py-3 flex items-center gap-3"
                  >
                    <div className="w-7 h-7 rounded-full bg-purple-500/20 text-purple-400 font-bold text-xs flex items-center justify-center shrink-0 overflow-hidden">
                      {p.userId?.profileImage ? (
                        <img src={p.userId.profileImage} alt={p.userId?.name || 'U'} className="w-full h-full object-cover" />
                      ) : (
                        (p.userId?.name || 'U').charAt(0).toUpperCase()
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-medium text-gray-300 truncate">{p.userId?.name || '—'}</p>
                      <p className="text-[10px] text-gray-600 truncate">{p.packageId?.name || '—'}</p>
                    </div>
                    <span className="text-xs font-bold text-green-400 shrink-0">${p.packageId?.price || 0}</span>
                  </motion.div>
                ))
              )}
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
