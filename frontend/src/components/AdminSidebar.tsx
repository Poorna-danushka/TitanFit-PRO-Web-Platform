import { Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, Users, Package, CreditCard, LogOut, X, Bell, User } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useAdminAnnouncements } from '../hooks/useNotifications';

import LogoIcon from './LogoIcon';

interface Props {
  onClose?: () => void;
}

export default function AdminSidebar({ onClose }: Props) {
  const location = useLocation();
  const { logout, user } = useAuth();
  const { announcements } = useAdminAnnouncements();

  const uRole = (user?.role || '').toUpperCase();
  const isSysAdmin = user?.isSystemAdmin || uRole === 'SYSTEM_ADMIN';

  const menuItems = [
    { name: 'Dashboard',     path: '/admin/dashboard',     icon: <LayoutDashboard className="w-[18px] h-[18px]" /> },
    { name: 'Users',         path: '/admin/users',         icon: <Users           className="w-[18px] h-[18px]" /> },
    { name: 'Packages',      path: '/admin/packages',      icon: <Package         className="w-[18px] h-[18px]" /> },
    { name: 'Purchases',     path: '/admin/purchases',     icon: <CreditCard      className="w-[18px] h-[18px]" /> },
    { name: 'Notifications', path: '/admin/notifications', icon: <Bell            className="w-[18px] h-[18px]" />, badge: announcements.length },
  ];

  const avatarColor = isSysAdmin
    ? 'from-amber-400 to-amber-600'
    : 'from-purple-400 to-purple-700';
  const avatarGlow = isSysAdmin
    ? '0 0 12px rgba(245,158,11,0.4)'
    : '0 0 12px rgba(168,85,247,0.3)';
  const roleLabel = isSysAdmin ? 'System Admin' : 'Administrator';
  const roleColor = isSysAdmin ? 'text-amber-400' : 'text-purple-400';
  const dotColor = isSysAdmin ? 'bg-amber-400' : 'bg-purple-400';

  return (
    <div className="w-64 bg-[#080809] border-r border-white/[0.06] flex flex-col h-screen text-white">

      {/* Logo */}
      <div className="h-16 flex items-center justify-between px-5 border-b border-white/[0.06]">
        <Link to="/admin/dashboard" className="flex items-center gap-2.5 group">
          <LogoIcon size="sm" variant={isSysAdmin ? 'amber' : 'purple'} />
          <span className="text-xl brand-logo-title tracking-tight text-white flex items-center gap-1.5 font-extrabold">
            <span>TITAN<span className={isSysAdmin ? 'text-amber-400' : 'text-purple-400'}>FIT</span></span>
            <span className={`text-[10px] font-black px-1.5 py-0.5 rounded-md uppercase tracking-wider text-black ${isSysAdmin ? 'bg-amber-400 shadow-[0_0_12px_rgba(245,158,11,0.4)]' : 'bg-purple-400 shadow-[0_0_12px_rgba(168,85,247,0.4)]'}`}>
              ADMIN
            </span>
          </span>
        </Link>
        {onClose && (
          <button onClick={onClose} className="lg:hidden text-gray-600 hover:text-white transition-colors p-1 rounded-lg hover:bg-white/[0.06]">
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Admin profile pill */}
      <div className={`mx-4 mt-4 mb-2 p-3 rounded-2xl border flex items-center gap-3 ${isSysAdmin ? 'bg-gradient-to-br from-amber-500/10 to-transparent border-amber-500/20' : 'bg-gradient-to-br from-purple-500/10 to-transparent border-purple-500/15'}`}>
        <div
          className={`w-9 h-9 rounded-full bg-gradient-to-br ${avatarColor} flex items-center justify-center font-bold text-sm shrink-0 overflow-hidden`}
          style={{ boxShadow: avatarGlow }}
        >
          {user?.profileImage ? (
            <img src={user.profileImage} alt={user?.name || 'Admin'} className="w-full h-full object-cover" />
          ) : (
            (user?.name || user?.firstName || 'A').charAt(0).toUpperCase()
          )}
        </div>
        <div className="min-w-0">
          <p className="font-semibold text-sm truncate text-white">{user?.name || 'Admin'}</p>
          <div className="flex items-center gap-1.5 mt-0.5">
            <span className={`w-1.5 h-1.5 rounded-full ${dotColor} animate-pulse`} />
            <p className={`text-xs ${roleColor} font-medium`}>{roleLabel}</p>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 py-2 px-3 flex flex-col gap-0.5 overflow-y-auto custom-scrollbar">
        <p className="text-[10px] font-bold uppercase tracking-widest text-gray-700 px-3 mb-2 mt-1">Management</p>
        {menuItems.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <Link
              key={item.name}
              to={item.path}
              onClick={onClose}
              className={`sidebar-nav-item sidebar-nav-item-admin ${isActive ? 'active' : 'text-gray-500'}`}
            >
              <span className={isActive ? (isSysAdmin ? 'text-amber-400' : 'text-purple-400') : 'text-gray-600'}>{item.icon}</span>
              <span className="flex-1">{item.name}</span>
              {item.badge != null && item.badge > 0 && (
                <span className={`min-w-[20px] h-5 ${isSysAdmin ? 'bg-amber-500/20 text-amber-300 border-amber-500/20' : 'bg-purple-500/20 text-purple-300 border-purple-500/20'} text-[10px] font-bold rounded-full flex items-center justify-center px-1.5 border`}>
                  {item.badge}
                </span>
              )}
            </Link>
          );
        })}

        {/* Account section */}
        <p className="text-[10px] font-bold uppercase tracking-widest text-gray-700 px-3 mb-2 mt-4">Account</p>
        <Link
          to="/profile"
          onClick={onClose}
          className={`sidebar-nav-item sidebar-nav-item-admin ${location.pathname === '/profile' ? 'active' : 'text-gray-500'}`}
        >
          <span className={location.pathname === '/profile' ? (isSysAdmin ? 'text-amber-400' : 'text-purple-400') : 'text-gray-600'}>
            <User className="w-[18px] h-[18px]" />
          </span>
          <span className="flex-1">My Profile</span>
        </Link>
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