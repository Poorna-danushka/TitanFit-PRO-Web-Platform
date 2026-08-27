import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Bell, Plus, Trash2, Pin, Info, CheckCircle, AlertTriangle, Zap,
  Eye, X, MessageSquare, Clock
} from 'lucide-react';
import { useAdminAnnouncements, AnnouncementType, Announcement } from '../../hooks/useNotifications';
import { useAuth } from '../../context/AuthContext';
import Pagination from '../../components/Pagination';
import BackButton from '../../components/BackButton';

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
  return new Date(iso).toLocaleDateString();
}

function NotifPreview({ ann }: { ann: Partial<Announcement> }) {
  const cfg = TYPE_CONFIG[ann.type || 'info'];
  return (
    <div
      className="rounded-2xl p-4"
      style={{
        background: cfg.bgColor,
        borderLeft: `3px solid ${cfg.borderColor}`,
        border: `1px solid rgba(255,255,255,0.06)`,
        borderLeftColor: cfg.borderColor,
      }}
    >
      <div className="flex items-start gap-3">
        <div className="mt-0.5 shrink-0" style={{ color: cfg.borderColor }}>{cfg.icon}</div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 mb-1">
            <p className="font-semibold text-sm text-white">{ann.title || 'Announcement title'}</p>
            {ann.pinned && <span className="text-[9px] font-bold uppercase tracking-wider text-amber-400 bg-amber-400/10 px-1.5 py-0.5 rounded border border-amber-500/20">Pinned</span>}
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${cfg.badgeClass}`}>{cfg.label}</span>
          </div>
          <p className="text-xs text-gray-400 leading-relaxed">{ann.message || 'Your announcement message will appear here.'}</p>
        </div>
      </div>
    </div>
  );
}

export default function ManageNotifications() {
  const { user } = useAuth();
  const { announcements, createAnnouncement, deleteAnnouncement, updateAnnouncement } = useAdminAnnouncements();

  const [showForm, setShowForm] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;
  const [form, setForm] = useState({
    title: '',
    message: '',
    type: 'info' as AnnouncementType,
    pinned: false,
  });
  const [errors, setErrors] = useState<{ title?: string; message?: string }>({});

  const validate = () => {
    const e: typeof errors = {};
    if (!form.title.trim())   e.title   = 'Title is required.';
    if (!form.message.trim()) e.message = 'Message is required.';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleCreate = () => {
    if (!validate()) return;
    createAnnouncement({ ...form, createdBy: user?.name || 'Admin' });
    setForm({ title: '', message: '', type: 'info', pinned: false });
    setErrors({});
    setShowForm(false);
    setShowPreview(false);
  };

  const togglePin = (ann: Announcement) => {
    updateAnnouncement(ann.id, { pinned: !ann.pinned });
  };

  return (
    <div className="space-y-8 pb-16 max-w-4xl mx-auto text-white min-h-[85vh] relative">
      <div className="flex items-center justify-between">
        <BackButton fallbackPath="/admin/dashboard" />
      </div>

      {/* Background Glows */}
      <div className="absolute top-0 left-10 w-72 h-72 bg-purple-500/10 blur-[130px] rounded-full pointer-events-none -z-10" />

      {/* Header Banner */}
      <motion.div
        initial={{ opacity: 0, y: -16 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 bg-[#0f0e13]/90 backdrop-blur-md p-7 md:p-8 rounded-3xl border border-white/10 shadow-2xl relative overflow-hidden"
      >
        <div className="flex items-center gap-5 relative z-10">
          <div className="w-16 h-16 rounded-2xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center shadow-[0_0_30px_rgba(168,85,247,0.15)] shrink-0">
            <Bell className="w-8 h-8 text-purple-400" />
          </div>
          <div>
            <h1 className="text-3xl font-display font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-white via-gray-100 to-gray-400 tracking-tight">
              Manage Announcements & Alerts
            </h1>
            <p className="text-gray-400 text-sm font-medium mt-0.5">
              Broadcast announcements and notifications to all registered gym members and staff.
            </p>
          </div>
        </div>

        <div className="relative z-10 flex items-center gap-3">
          <button
            onClick={() => { setShowForm(true); setShowPreview(false); }}
            className="px-5 py-3 bg-purple-600 text-white font-bold text-xs rounded-xl hover:bg-purple-500 transition-all flex items-center gap-2 shadow-lg shadow-purple-600/20 active:scale-95"
          >
            <Plus className="w-4 h-4" /> New Announcement
          </button>
        </div>
      </motion.div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Total Announcements', value: announcements.length,                             color: 'text-white' },
          { label: 'Pinned Alerts',        value: announcements.filter(a => a.pinned).length,        color: 'text-amber-400' },
          { label: 'Urgent Priority',      value: announcements.filter(a => a.type === 'urgent').length, color: 'text-red-400' },
        ].map((s) => (
          <div key={s.label} className="p-4 rounded-2xl bg-[#0f0e13]/80 border border-white/[0.08] text-center">
            <p className={`text-2xl font-black font-display ${s.color}`}>{s.value}</p>
            <p className="text-xs text-gray-500 font-medium mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Create Form Modal */}
      <AnimatePresence>
        {showForm && (
          <motion.div
            initial={{ opacity: 0, y: -12, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.98 }}
            transition={{ duration: 0.2 }}
            className="p-6 rounded-3xl bg-[#0f0e13]/95 backdrop-blur-md border border-white/10 shadow-2xl space-y-4"
          >
            <div className="flex items-center justify-between pb-3 border-b border-white/[0.08]">
              <div className="flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-purple-400" />
                <h2 className="font-bold text-white text-base">Create Broadcast Announcement</h2>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowPreview(!showPreview)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all flex items-center gap-1.5 ${
                    showPreview ? 'bg-purple-500/20 text-purple-300 border-purple-500/30' : 'bg-white/[0.04] text-gray-400 border-white/[0.08] hover:text-white'
                  }`}
                >
                  <Eye className="w-3.5 h-3.5" />
                  {showPreview ? 'Hide Preview' : 'Preview'}
                </button>
                <button onClick={() => { setShowForm(false); setErrors({}); }} className="p-1 rounded-lg text-gray-400 hover:text-white hover:bg-white/5">
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="space-y-4">
              {/* Type selector */}
              <div>
                <label className="text-xs font-bold text-gray-400 uppercase tracking-wider block mb-2">Priority Level / Type</label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {(Object.keys(TYPE_CONFIG) as AnnouncementType[]).map((t) => {
                    const cfg = TYPE_CONFIG[t];
                    const isSelected = form.type === t;
                    return (
                      <button
                        key={t}
                        type="button"
                        onClick={() => setForm({ ...form, type: t })}
                        className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs font-bold border transition-all ${cfg.badgeClass} ${
                          isSelected ? 'ring-2 ring-purple-500 opacity-100' : 'opacity-50 hover:opacity-80'
                        }`}
                      >
                        {cfg.icon}
                        {cfg.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Title */}
              <div>
                <label className="text-xs font-bold text-gray-400 uppercase tracking-wider block mb-1.5">Announcement Title</label>
                <input
                  type="text"
                  className={`w-full px-4 py-2.5 bg-[#0a0a0d] border rounded-xl text-xs text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 transition-colors ${errors.title ? 'border-red-500' : 'border-white/10'}`}
                  placeholder="e.g. Scheduled maintenance this Sunday"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  maxLength={100}
                />
                {errors.title && <p className="text-red-400 text-xs mt-1">{errors.title}</p>}
              </div>

              {/* Message */}
              <div>
                <label className="text-xs font-bold text-gray-400 uppercase tracking-wider block mb-1.5">Announcement Message</label>
                <textarea
                  className={`w-full px-4 py-2.5 bg-[#0a0a0d] border rounded-xl text-xs text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 transition-colors ${errors.message ? 'border-red-500' : 'border-white/10'}`}
                  placeholder="Provide full details of the announcement..."
                  value={form.message}
                  onChange={(e) => setForm({ ...form, message: e.target.value })}
                  maxLength={500}
                  rows={3}
                />
                <div className="flex items-center justify-between mt-1">
                  {errors.message && <p className="text-red-400 text-xs">{errors.message}</p>}
                  <p className="text-gray-600 text-[11px] ml-auto">{form.message.length}/500</p>
                </div>
              </div>

              {/* Pinned toggle */}
              <div className="flex items-center justify-between p-3.5 rounded-2xl bg-white/[0.03] border border-white/[0.06]">
                <div>
                  <p className="text-xs font-bold text-white">Pin this announcement</p>
                  <p className="text-[11px] text-gray-500">Pinned announcements stay featured at the top of member dashboards</p>
                </div>
                <input
                  type="checkbox"
                  checked={form.pinned}
                  onChange={(e) => setForm({ ...form, pinned: e.target.checked })}
                  className="w-4 h-4 rounded text-purple-600 focus:ring-purple-500 bg-gray-900 border-gray-700 cursor-pointer"
                />
              </div>

              {/* Live Preview Card */}
              <AnimatePresence>
                {showPreview && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                  >
                    <label className="text-xs font-bold text-gray-400 uppercase tracking-wider block mb-2">Live Preview</label>
                    <NotifPreview ann={form} />
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Actions */}
              <div className="flex items-center justify-end gap-3 pt-2">
                <button onClick={() => { setShowForm(false); setErrors({}); }} className="px-4 py-2 bg-white/5 hover:bg-white/10 text-gray-300 font-semibold text-xs rounded-xl">
                  Cancel
                </button>
                <button onClick={handleCreate} className="px-5 py-2 bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs rounded-xl flex items-center gap-2 shadow-lg shadow-purple-600/20">
                  <Bell className="w-4 h-4" /> Publish Announcement
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Announcements List */}
      <div className="space-y-3">
        <h2 className="font-bold text-xs uppercase tracking-widest text-gray-400">
          Published Announcements ({announcements.length})
        </h2>

        {announcements.length === 0 ? (
          <div className="p-12 rounded-3xl bg-[#0f0e13]/90 border border-white/10 text-center space-y-3">
            <Bell className="w-10 h-10 text-gray-600 mx-auto" />
            <p className="font-bold text-sm text-white">No announcements published yet</p>
            <p className="text-xs text-gray-500">Create your first broadcast message to inform gym members.</p>
            <button onClick={() => setShowForm(true)} className="px-4 py-2 bg-purple-600 text-white font-bold text-xs rounded-xl hover:bg-purple-500 transition-all inline-flex items-center gap-2">
              <Plus className="w-4 h-4" /> Create Announcement
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {(() => {
              const totalPages = Math.ceil(announcements.length / itemsPerPage);
              const startIndex = (currentPage - 1) * itemsPerPage;
              const paginatedAnnouncements = announcements.slice(startIndex, startIndex + itemsPerPage);

              return (
                <>
                  {paginatedAnnouncements.map((ann, i) => {
                    const cfg = TYPE_CONFIG[ann.type || 'info'];
                    return (
                      <motion.div
                        key={ann.id}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.04 }}
                        className="group rounded-3xl overflow-hidden border border-white/10 bg-[#0f0e13]/90 backdrop-blur-md hover:border-white/20 transition-all duration-300 shadow-xl"
                        style={{ borderLeft: `4px solid ${cfg.borderColor}` }}
                      >
                        <div className="p-5 flex items-start gap-4">
                          <div
                            className="shrink-0 mt-0.5 w-9 h-9 rounded-2xl flex items-center justify-center"
                            style={{ background: cfg.bgColor, color: cfg.borderColor }}
                          >
                            {cfg.icon}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap mb-1">
                              <span className="font-bold text-base text-white">{ann.title}</span>
                              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${cfg.badgeClass}`}>{cfg.label}</span>
                              {ann.pinned && (
                                <span className="text-[9px] font-bold uppercase tracking-wider text-amber-400 bg-amber-400/10 px-2 py-0.5 rounded border border-amber-500/20 flex items-center gap-1">
                                  <Pin className="w-2.5 h-2.5" /> Pinned
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-gray-400 leading-relaxed mb-2.5">{ann.message}</p>
                            <div className="flex items-center gap-3 text-[11px] text-gray-500">
                              <span>by <strong className="text-gray-300">{ann.createdBy || 'Admin'}</strong></span>
                              <span>·</span>
                              <span className="flex items-center gap-1"><Clock className="w-3 h-3 text-gray-600" /> {timeAgo(ann.createdAt)}</span>
                            </div>
                          </div>

                          <div className="flex items-center gap-1.5 shrink-0 opacity-80 group-hover:opacity-100 transition-opacity">
                            <button
                              onClick={() => togglePin(ann)}
                              title={ann.pinned ? 'Unpin' : 'Pin to top'}
                              className={`p-2 rounded-xl border transition-all ${
                                ann.pinned ? 'bg-amber-500/20 text-amber-400 border-amber-500/30' : 'bg-white/[0.04] text-gray-400 border-white/[0.08] hover:text-white'
                              }`}
                            >
                              <Pin className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => setDeleteConfirmId(ann.id)}
                              className="p-2 rounded-xl bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20 transition-all"
                              title="Delete Announcement"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>

                        <AnimatePresence>
                          {deleteConfirmId === ann.id && (
                            <motion.div
                              initial={{ opacity: 0, height: 0 }}
                              animate={{ opacity: 1, height: 'auto' }}
                              exit={{ opacity: 0, height: 0 }}
                              className="border-t border-white/[0.08] px-5 py-3.5 flex items-center justify-between bg-red-500/[0.05]"
                            >
                              <p className="text-xs text-red-400 font-medium">Delete this announcement? This action cannot be undone.</p>
                              <div className="flex items-center gap-2">
                                <button onClick={() => setDeleteConfirmId(null)} className="px-3 py-1 bg-white/5 text-gray-300 text-xs rounded-lg font-medium">Cancel</button>
                                <button
                                  onClick={() => { deleteAnnouncement(ann.id); setDeleteConfirmId(null); }}
                                  className="px-3 py-1 bg-red-500 text-white font-bold text-xs rounded-lg shadow-md shadow-red-500/20"
                                >
                                  Delete
                                </button>
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </motion.div>
                    );
                  })}

                  <div className="p-4 bg-[#0f0e13]/90 border border-white/10 rounded-2xl">
                    <Pagination
                      currentPage={currentPage}
                      totalPages={totalPages}
                      totalItems={announcements.length}
                      itemsPerPage={itemsPerPage}
                      onPageChange={setCurrentPage}
                    />
                  </div>
                </>
              );
            })()}
          </div>
        )}
      </div>
    </div>
  );
}
