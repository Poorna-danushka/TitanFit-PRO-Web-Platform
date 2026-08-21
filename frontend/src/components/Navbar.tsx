import { useState, useRef, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Bell, Search, Menu, User, LogOut, ChevronRight, Check, CheckCheck, Settings } from 'lucide-react';
import { useAnnouncements, AnnouncementType } from '../hooks/useNotifications';
import { Link, useNavigate } from 'react-router-dom';
import LogoIcon from './LogoIcon';
import { motion, AnimatePresence } from 'framer-motion';

interface NavbarProps {
  onMenuClick: () => void;
}

const TYPE_COLORS: Record<AnnouncementType, { dot: string }> = {
  info:    { dot: '#3b82f6' },
  success: { dot: '#22c55e' },
  warning: { dot: '#eab308' },
  urgent:  { dot: '#ef4444' },
};

function timeAgo(isoString: string) {
  const diff = Date.now() - new Date(isoString).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1)  return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

export default function Navbar({ onMenuClick }: NavbarProps) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const uRole = (user?.role || '').toUpperCase();
  const isAdmin = ['ADMIN', 'SYSTEM_ADMIN', 'STAFF'].includes(uRole) || Boolean((user as any)?.isSystemAdmin);

  // Only load notification data for regular users
  const { announcements, readIds, markRead, markAllRead, unreadCount } = useAnnouncements();

  const [bellOpen, setBellOpen] = useState(false);
  const [avatarOpen, setAvatarOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);

  const bellRef  = useRef<HTMLDivElement>(null);
  const avatarRef = useRef<HTMLDivElement>(null);

  const unread = isAdmin ? 0 : unreadCount;

  // Handle outside clicks and scrolling
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (bellRef.current  && !bellRef.current.contains(e.target as Node))  setBellOpen(false);
      if (avatarRef.current && !avatarRef.current.contains(e.target as Node)) setAvatarOpen(false);
    }
    
    function handleScroll() {
      setIsScrolled(window.scrollY > 20);
    }

    document.addEventListener('mousedown', handleClick);
    window.addEventListener('scroll', handleScroll);
    
    return () => {
      document.removeEventListener('mousedown', handleClick);
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);

  const handleBellOpen = () => {
    setBellOpen((v) => !v);
    setAvatarOpen(false);
  };

  const handleAvatarOpen = () => {
    setAvatarOpen((v) => !v);
    setBellOpen(false);
  };

  const handleNotifClick = (id: string) => {
    markRead(id);
    setBellOpen(false);
    navigate('/notifications');
  };

  return (
    <header className={`h-20 flex items-center justify-between px-6 z-40 sticky top-0 shrink-0 transition-all duration-300 ${isScrolled ? 'bg-[#0a0a0c]/80 backdrop-blur-xl border-b border-white/5 shadow-lg' : 'bg-transparent'}`}>
      
      {/* Left */}
      <div className="flex items-center gap-4">
        <button
          onClick={onMenuClick}
          className="md:hidden text-gray-400 hover:text-white transition-colors p-2 rounded-xl hover:bg-white/[0.06] active:scale-95"
          aria-label="Open sidebar"
        >
          <Menu className="w-6 h-6" />
        </button>

        {/* Brand Logo (Visible on mobile mostly, or if sidebar is collapsed) */}
        <div className="md:hidden flex items-center gap-2">
          <LogoIcon size="sm" variant="green" />
          <span className="text-xl brand-logo-title tracking-tight text-white flex items-center gap-1.5 font-extrabold">
            <span>TITAN<span className="text-green-400">FIT</span></span>
            <span className="brand-accent-badge">PRO</span>
          </span>
        </div>

        {/* Search */}
        <div className="hidden sm:flex items-center gap-3 bg-white/[0.03] border border-white/5 rounded-2xl px-4 py-2.5 w-64 md:w-80 group focus-within:border-green-500/30 focus-within:bg-white/[0.05] transition-all duration-300 focus-within:shadow-[0_0_20px_rgba(34,197,94,0.1)]">
          <Search className="w-4 h-4 text-gray-500 group-focus-within:text-green-400 transition-colors shrink-0" />
          <input
            type="text"
            placeholder="Search workouts, plans..."
            className="bg-transparent border-none outline-none text-sm text-white w-full placeholder:text-gray-600 font-medium"
          />
          <span className="hidden lg:flex items-center gap-1 text-[10px] text-gray-500 font-bold tracking-widest shrink-0 border border-white/10 rounded px-1.5 py-0.5 group-focus-within:border-green-500/20 group-focus-within:text-green-500/80">⌘K</span>
        </div>
      </div>

      {/* Right */}
      <div className="flex items-center gap-3 md:gap-5">

        {/* Notification Bell — USER ONLY */}
        {!isAdmin && (
          <div className="relative" ref={bellRef}>
            <button
              onClick={handleBellOpen}
              className={`relative transition-colors p-2.5 rounded-2xl active:scale-95 flex items-center justify-center ${bellOpen ? 'bg-white/10 text-white' : 'text-gray-400 hover:text-white hover:bg-white/[0.05]'}`}
              aria-label="Notifications"
            >
              <Bell className="w-5 h-5" />
              {unread > 0 && (
                <span className="absolute top-1.5 right-1.5 min-w-[18px] h-[18px] bg-green-500 rounded-full text-[10px] font-black text-black flex items-center justify-center px-1 ring-2 ring-[#0a0a0c] shadow-[0_0_10px_rgba(34,197,94,0.5)]">
                  {unread > 9 ? '9+' : unread}
                </span>
              )}
            </button>

            {/* Bell dropdown */}
            <AnimatePresence>
              {bellOpen && (
                <motion.div 
                  initial={{ opacity: 0, y: 10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 10, scale: 0.95 }}
                  transition={{ duration: 0.2 }}
                  className="absolute right-0 top-full mt-3 w-80 md:w-96 z-50 bg-[#111113]/90 backdrop-blur-xl border border-white/10 rounded-3xl shadow-2xl overflow-hidden"
                >
                  {/* Header */}
                  <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.05] bg-white/[0.02]">
                    <div>
                      <p className="font-bold text-base text-white">Notifications</p>
                      {unread > 0 && <p className="text-xs font-medium text-green-400 mt-0.5">{unread} unread updates</p>}
                    </div>
                    {unread > 0 && (
                      <button
                        onClick={markAllRead}
                        className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-white transition-colors font-bold uppercase tracking-wider bg-white/5 px-2.5 py-1.5 rounded-lg hover:bg-white/10"
                      >
                        <CheckCheck className="w-3.5 h-3.5" />
                        Mark Read
                      </button>
                    )}
                  </div>

                  {/* List */}
                  <div className="max-h-80 overflow-y-auto custom-scrollbar bg-black/20">
                    {announcements.length === 0 ? (
                      <div className="py-12 flex flex-col items-center justify-center text-center px-6">
                        <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center mb-3">
                          <Bell className="w-5 h-5 text-gray-600" />
                        </div>
                        <p className="text-gray-300 font-bold text-sm">You're all caught up!</p>
                        <p className="text-gray-500 text-xs mt-1">Check back later for new announcements.</p>
                      </div>
                    ) : (
                      announcements.slice(0, 8).map((ann) => {
                        const isUnread = !readIds.includes(ann.id);
                        const dot = TYPE_COLORS[ann.type].dot;
                        return (
                          <button
                            key={ann.id}
                            onClick={() => handleNotifClick(ann.id)}
                            className={`w-full text-left px-6 py-4 border-b border-white/[0.03] transition-colors group relative overflow-hidden ${isUnread ? 'bg-white/[0.03] hover:bg-white/[0.05]' : 'hover:bg-white/[0.02]'}`}
                          >
                            {isUnread && (
                              <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-green-400 to-emerald-600" />
                            )}
                            <div className="flex items-start gap-4">
                              <span
                                className="mt-1.5 w-2 h-2 rounded-full shrink-0 transition-opacity shadow-[0_0_8px_currentColor]"
                                style={{ background: dot, opacity: isUnread ? 1 : 0.3, color: dot }}
                              />
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                  <p className={`text-sm font-bold truncate ${isUnread ? 'text-white' : 'text-gray-400'}`}>
                                    {ann.title}
                                  </p>
                                  {ann.pinned && (
                                    <span className="text-[9px] font-black uppercase tracking-widest text-amber-400 bg-amber-400/10 px-1.5 py-0.5 rounded shrink-0 border border-amber-400/20">
                                      Pinned
                                    </span>
                                  )}
                                </div>
                                <p className={`text-xs line-clamp-2 leading-relaxed ${isUnread ? 'text-gray-400' : 'text-gray-500'}`}>{ann.message}</p>
                                <p className="text-[10px] text-gray-600 font-medium mt-2 tracking-wide uppercase">{timeAgo(ann.createdAt)}</p>
                              </div>
                              {isUnread && (
                                <div className="w-6 h-6 rounded-full bg-white/5 flex items-center justify-center shrink-0 mt-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                  <Check className="w-3.5 h-3.5 text-green-400" />
                                </div>
                              )}
                            </div>
                          </button>
                        );
                      })
                    )}
                  </div>

                  {/* Footer */}
                  <div className="px-6 py-3 border-t border-white/[0.05] bg-white/[0.02]">
                    <Link
                      to="/notifications"
                      onClick={() => setBellOpen(false)}
                      className="flex items-center justify-center gap-2 text-xs font-bold uppercase tracking-widest text-gray-400 hover:text-white transition-colors py-1.5 group"
                    >
                      View All Activity
                      <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                    </Link>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}

        {/* Divider */}
        <div className="hidden md:block w-px h-6 bg-white/10" />

        {/* Avatar dropdown */}
        <div className="relative" ref={avatarRef}>
          <button
            onClick={handleAvatarOpen}
            className={`flex items-center gap-3 p-1.5 rounded-full hover:bg-white/[0.04] transition-all active:scale-95 border ${avatarOpen ? 'border-white/20 bg-white/5' : 'border-transparent'}`}
          >
            <div className="text-right hidden sm:block px-2">
              <p className="text-sm font-bold text-white leading-tight">{user?.name || 'User'}</p>
              <p className="text-[10px] font-black uppercase tracking-widest" style={{ color: isAdmin ? '#c084fc' : '#4ade80' }}>
                {isAdmin ? 'Administrator' : 'Pro Member'}
              </p>
            </div>
            <div
              className="w-10 h-10 rounded-full flex items-center justify-center text-black font-black text-sm shrink-0"
              style={{
                background: isAdmin
                  ? 'linear-gradient(135deg, #a855f7, #7c3aed)'
                  : 'linear-gradient(135deg, #4ade80, #10b981)',
                boxShadow: isAdmin
                  ? '0 0 20px rgba(168,85,247,0.4)'
                  : '0 0 20px rgba(34,197,94,0.4)',
              }}
            >
              {user?.name?.charAt(0).toUpperCase() || 'U'}
            </div>
          </button>

          <AnimatePresence>
            {avatarOpen && (
              <motion.div 
                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 10, scale: 0.95 }}
                transition={{ duration: 0.2 }}
                className="absolute right-0 top-full mt-3 w-64 z-50 bg-[#111113]/90 backdrop-blur-xl border border-white/10 rounded-3xl shadow-2xl py-2 overflow-hidden"
              >
                <div className="px-5 pb-4 pt-3 border-b border-white/[0.05] mb-2 bg-white/[0.02]">
                  <p className="text-base font-bold text-white truncate">{user?.name}</p>
                  <p className="text-xs font-medium text-gray-500 truncate">{user?.email}</p>
                </div>
                
                <div className="px-2 space-y-1">
                  <Link
                    to="/profile"
                    onClick={() => setAvatarOpen(false)}
                    className="flex items-center gap-3 px-4 py-2.5 text-sm font-semibold text-gray-300 hover:text-white hover:bg-white/5 transition-all rounded-xl group"
                  >
                    <User className="w-4 h-4 text-gray-500 group-hover:text-white" />
                    My Profile
                  </Link>
                  <Link
                    to="/notifications"
                    onClick={() => setAvatarOpen(false)}
                    className="flex items-center gap-3 px-4 py-2.5 text-sm font-semibold text-gray-300 hover:text-white hover:bg-white/5 transition-all rounded-xl group"
                  >
                    <Settings className="w-4 h-4 text-gray-500 group-hover:text-white" />
                    Notifications & Prefs
                  </Link>
                </div>

                <div className={`px-2 border-t border-white/[0.05] mt-2 pt-2`}>
                  <button
                    onClick={() => { setAvatarOpen(false); logout(); }}
                    className="flex items-center gap-3 px-4 py-2.5 text-sm font-bold text-red-400 hover:text-white hover:bg-red-500 transition-all rounded-xl w-full group"
                  >
                    <LogOut className="w-4 h-4 text-red-400 group-hover:text-white" />
                    Sign Out
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </header>
  );
}