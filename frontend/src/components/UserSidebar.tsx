import { Link, useLocation } from 'react-router-dom';
import { Home, Package, Activity, User, LogOut, X, Dumbbell, Bell, Award, QrCode, TrendingUp, UserCheck, ShieldCheck } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useAnnouncements } from '../hooks/useNotifications';

import LogoIcon from './LogoIcon';

interface Props {
  onClose?: () => void;
}

export default function UserSidebar({ onClose }: Props) {
  const location = useLocation();
  const { logout, user } = useAuth();
  const { unreadCount } = useAnnouncements();
  const unread = unreadCount;

  const userRole = (user?.role || 'MEMBER').toUpperCase();

  const navItems = [
    { name: 'Dashboard',     path: '/dashboard',     icon: <Home       className="w-[18px] h-[18px]" /> },
    ...(userRole === 'STAFF' || userRole === 'ADMIN' ? [{ name: 'Staff Portal', path: '/staff/dashboard', icon: <UserCheck className="w-[18px] h-[18px]" /> }] : []),
    ...(userRole === 'TRAINER' || userRole === 'ADMIN' ? [{ name: 'Trainer Portal', path: '/trainer/dashboard', icon: <Award className="w-[18px] h-[18px]" /> }] : []),
    ...(userRole === 'ADMIN' ? [{ name: 'Admin Portal', path: '/admin/dashboard', icon: <ShieldCheck className="w-[18px] h-[18px]" /> }] : []),
    { name: 'Packages',      path: '/packages',      icon: <Package    className="w-[18px] h-[18px]" /> },
    { name: 'My Package',    path: '/my-package',    icon: <Activity   className="w-[18px] h-[18px]" /> },
    { name: 'Workouts',      path: '/workouts',      icon: <Dumbbell   className="w-[18px] h-[18px]" /> },
    { name: 'Trainers',      path: '/trainers',      icon: <Award      className="w-[18px] h-[18px]" /> },
    { name: 'Entry Pass & QR',path: '/attendance-qr',icon: <QrCode     className="w-[18px] h-[18px]" /> },
    { name: 'Progress Log',  path: '/progress',      icon: <TrendingUp className="w-[18px] h-[18px]" /> },

    { name: 'Notifications', path: '/notifications', icon: <Bell       className="w-[18px] h-[18px]" />, badge: unread },
    { name: 'Profile',       path: '/profile',       icon: <User       className="w-[18px] h-[18px]" /> },
  ];

  return (
    <div className="w-64 bg-[#080809] border-r border-white/[0.06] flex flex-col h-screen text-white">

      {/* Logo */}
      <div className="h-16 flex items-center justify-between px-5 border-b border-white/[0.06]">
        <Link to="/dashboard" className="flex items-center gap-2.5 group">
          <LogoIcon size="sm" variant="green" />
          <span className="text-xl brand-logo-title tracking-tight text-white flex items-center gap-1.5 font-extrabold">
            <span>TITAN<span className="text-green-400">FIT</span></span>
            <span className="brand-accent-badge">PRO</span>
          </span>
        </Link>
        {onClose && (
          <button onClick={onClose} className="lg:hidden text-gray-600 hover:text-white transition-colors p-1 rounded-lg hover:bg-white/[0.06]">
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* User profile pill */}
      <div className="mx-4 mt-4 mb-2 p-3 rounded-2xl bg-gradient-to-br from-green-500/10 to-transparent border border-green-500/15 flex items-center gap-3">
        <div
          className="w-9 h-9 rounded-full bg-gradient-to-br from-green-400 to-green-600 flex items-center justify-center font-bold text-black text-sm shrink-0 overflow-hidden"
          style={{ boxShadow: '0 0 12px rgba(34,197,94,0.3)' }}
        >
          {user?.profileImage ? (
            <img src={user.profileImage} alt={user?.name || 'User'} className="w-full h-full object-cover" />
          ) : (
            user?.name?.charAt(0).toUpperCase() || 'U'
          )}
        </div>
        <div className="min-w-0">
          <p className="font-semibold text-sm truncate text-white">{user?.name || 'Member'}</p>
          <div className="flex items-center gap-1.5 mt-0.5">
            <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
            <p className="text-xs text-green-400 font-medium">Pro Member</p>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 py-2 px-3 flex flex-col gap-0.5 overflow-y-auto custom-scrollbar">
        <p className="text-[10px] font-bold uppercase tracking-widest text-gray-700 px-3 mb-2 mt-1">Main Menu</p>
        {navItems.map((item) => {
          const isActive =
            location.pathname === item.path ||
            location.pathname.startsWith(item.path + '/');
          return (
            <Link
              key={item.name}
              to={item.path}
              onClick={onClose}
              className={`sidebar-nav-item ${isActive ? 'active' : 'text-gray-500'}`}
            >
              <span className={isActive ? 'text-green-400' : 'text-gray-600'}>{item.icon}</span>
              <span className="flex-1">{item.name}</span>
              {item.badge != null && item.badge > 0 && (
                <span className="badge-pop min-w-[20px] h-5 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1.5">
                  {item.badge > 9 ? '9+' : item.badge}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Logout */}
      <div className="p-3 border-t border-white/[0.06]">
        <button
          onClick={() => logout()}
          className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-gray-600 hover:bg-red-500/10 hover:text-red-400 w-full transition-all"
        >
          <LogOut className="w-[18px] h-[18px]" />
          <span>Sign Out</span>
        </button>
      </div>
    </div>
  );
}
