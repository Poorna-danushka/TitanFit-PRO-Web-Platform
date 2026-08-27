import { motion } from 'framer-motion';
import { Bell, CheckCheck, Check, Info, CheckCircle, AlertTriangle, Zap, Pin } from 'lucide-react';
import { useAnnouncements, AnnouncementType, Announcement } from '../hooks/useNotifications';
import { useState } from 'react';

const TYPE_CONFIG: Record<AnnouncementType, {
  label: string; icon: React.ReactNode;
  badgeClass: string; borderColor: string; bgColor: string;
}> = {
  info:    { label: 'Info',    icon: <Info          className="w-4 h-4" />, badgeClass: 'bg-blue-500/10 text-blue-400 border-blue-500/20',     borderColor: '#3b82f6', bgColor: 'rgba(59,130,246,0.08)'  },
  success: { label: 'Success', icon: <CheckCircle   className="w-4 h-4" />, badgeClass: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20', borderColor: '#10b981', bgColor: 'rgba(16,185,129,0.08)'  },
  warning: { label: 'Warning', icon: <AlertTriangle className="w-4 h-4" />, badgeClass: 'bg-amber-500/10 text-amber-400 border-amber-500/20',   borderColor: '#f59e0b', bgColor: 'rgba(245,158,11,0.08)'  },
  urgent:  { label: 'Urgent',  icon: <Zap           className="w-4 h-4" />, badgeClass: 'bg-red-500/10 text-red-400 border-red-500/20',         borderColor: '#ef4444', bgColor: 'rgba(239,68,68,0.08)'   },
};

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1)  return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 7)  return `${d}d ago`;
  return new Date(iso).toLocaleDateString();
}

type FilterType = 'all' | AnnouncementType;

export default function UserNotificationsPage() {
  const { announcements, readIds, markRead, markAllRead, unreadCount } = useAnnouncements();
  const [filter, setFilter] = useState<FilterType>('all');

  const unread = unreadCount;

  const sorted = [...announcements].sort((a, b) => {
    if (a.pinned && !b.pinned) return -1;
    if (!a.pinned && b.pinned) return 1;
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });

  const filtered = filter === 'all'
    ? sorted
    : sorted.filter((a: Announcement) => a.type === filter);

  const filters: { key: FilterType; label: string }[] = [
    { key: 'all',     label: 'All Alerts' },
    { key: 'urgent',  label: 'Urgent' },
    { key: 'warning', label: 'Warning' },
    { key: 'info',    label: 'Info' },
    { key: 'success', label: 'Success' },
  ];

  return (
    <div className="space-y-8 pb-16 max-w-4xl mx-auto text-white min-h-[85vh] relative">
      {/* Ambient Glow */}
      <div className="absolute top-0 left-10 w-80 h-80 bg-emerald-500/10 blur-[130px] rounded-full pointer-events-none -z-10" />

      {/* Header Banner */}
      <motion.div
        initial={{ opacity: 0, y: -16 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 bg-[#0f0e13]/90 backdrop-blur-md p-7 md:p-8 rounded-3xl border border-white/10 shadow-2xl relative overflow-hidden"
      >
        <div className="flex items-center gap-5 relative z-10">
          <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shadow-[0_0_30px_rgba(16,185,129,0.15)] shrink-0">
            <Bell className="w-8 h-8 text-emerald-400" />
          </div>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h1 className="text-3xl font-display font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-white via-gray-100 to-gray-400 tracking-tight">
                Gym Notifications
              </h1>
              {unread > 0 && (
                <span className="text-xs font-bold bg-red-500 text-white px-2.5 py-0.5 rounded-full shadow-[0_0_12px_rgba(239,68,68,0.4)]">
                  {unread} new
                </span>
              )}
            </div>
            <p className="text-gray-400 text-sm font-medium">
              Stay informed with official gym announcements, schedule updates, and alerts.
            </p>
          </div>
        </div>

        {unread > 0 && (
          <div className="relative z-10 shrink-0">
            <button
              onClick={markAllRead}
              className="px-4 py-2.5 bg-white/10 hover:bg-white/20 text-white font-bold text-xs rounded-xl border border-white/10 transition-all flex items-center gap-2"
            >
              <CheckCheck className="w-4 h-4 text-emerald-400" /> Mark all as read
            </button>
          </div>
        )}
      </motion.div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 custom-scrollbar">
        {filters.map((f) => {
          const count = f.key === 'all'
            ? announcements.length
            : announcements.filter((a) => a.type === f.key).length;
          const isActive = filter === f.key;
          return (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all border whitespace-nowrap ${
                isActive
                  ? 'bg-emerald-500 text-black border-emerald-400 shadow-md shadow-emerald-500/20'
                  : 'bg-white/[0.03] text-gray-400 border-white/[0.08] hover:text-white hover:bg-white/[0.06]'
              }`}
            >
              <span>{f.label}</span>
              {count > 0 && (
                <span className={`text-[10px] font-bold px-2 py-0.2 rounded-md ${isActive ? 'bg-black/20 text-black' : 'bg-white/10 text-gray-400'}`}>
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Announcements List */}
      {filtered.length === 0 ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="p-12 rounded-3xl bg-[#0f0e13]/90 border border-white/10 text-center space-y-3 shadow-xl"
        >
          <Bell className="w-10 h-10 text-gray-600 mx-auto" />
          <p className="font-bold text-sm text-white">No notifications found</p>
          <p className="text-xs text-gray-500">
            {filter === 'all'
              ? 'No broadcast announcements from your gym yet. Check back later!'
              : `No ${filter} notifications found.`}
          </p>
        </motion.div>
      ) : (
        <div className="space-y-3">
          {filtered.map((ann: Announcement, i: number) => {
            const isUnread = !readIds.includes(ann.id);
            const cfg = TYPE_CONFIG[ann.type];
            return (
              <motion.div
                key={ann.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04 }}
                onClick={() => markRead(ann.id)}
                className="group relative rounded-3xl overflow-hidden cursor-pointer transition-all border border-white/10 bg-[#0f0e13]/90 backdrop-blur-md hover:border-white/20 shadow-xl"
                style={{ borderLeft: `4px solid ${cfg.borderColor}` }}
              >
                <div className="p-5 flex items-start gap-4">
                  <div
                    className="shrink-0 mt-0.5 w-10 h-10 rounded-2xl flex items-center justify-center"
                    style={{ background: cfg.bgColor, color: cfg.borderColor }}
                  >
                    {cfg.icon}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <p className={`font-bold text-base ${isUnread ? 'text-white' : 'text-gray-300'}`}>
                        {ann.title}
                      </p>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${cfg.badgeClass}`}>
                        {cfg.label}
                      </span>
                      {ann.pinned && (
                        <span className="flex items-center gap-1 text-[9px] font-bold uppercase tracking-wider text-amber-400 bg-amber-400/10 px-2 py-0.5 rounded border border-amber-500/20">
                          <Pin className="w-2.5 h-2.5" /> Pinned
                        </span>
                      )}
                      {isUnread && (
                        <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse ml-auto shrink-0 shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
                      )}
                    </div>
                    <p className="text-xs text-gray-400 leading-relaxed mb-2">{ann.message}</p>
                    <div className="flex items-center gap-3 text-[11px] text-gray-500">
                      <span>From <strong className="text-gray-300">{ann.createdBy || 'Admin'}</strong></span>
                      <span>·</span>
                      <span>{timeAgo(ann.createdAt)}</span>
                    </div>
                  </div>

                  <div className="shrink-0">
                    {isUnread ? (
                      <div className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity" title="Mark as read">
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                      </div>
                    ) : (
                      <div className="w-8 h-8 rounded-xl flex items-center justify-center">
                        <CheckCheck className="w-3.5 h-3.5 text-gray-600" />
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}
