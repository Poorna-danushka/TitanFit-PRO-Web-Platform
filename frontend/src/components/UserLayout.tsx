import { useState } from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import UserSidebar from './UserSidebar';
import Navbar from './Navbar';
import ChatBot from './ChatBot';
import { Home, QrCode, Package, User, Bell } from 'lucide-react';
import { useAnnouncements } from '../hooks/useNotifications';

const BOTTOM_NAV = [
  { path: '/dashboard',      icon: Home,     label: 'Home'     },
  { path: '/attendance-qr',  icon: QrCode,   label: 'QR Pass'  },
  { path: '/my-package',     icon: Package,  label: 'Package'  },
  { path: '/notifications',  icon: Bell,     label: 'Alerts'   },
  { path: '/profile',        icon: User,     label: 'Profile'  },
];

export default function UserLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();

  const { unreadCount } = useAnnouncements();
  const unread = unreadCount;

  return (
    // overflow-visible so dropdowns (bell, avatar) can bleed outside header
    <div className="flex h-screen bg-black text-white font-sans overflow-hidden">

      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/70 backdrop-blur-sm z-20 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar — desktop always visible, mobile slide-in */}
      <aside
        className={`fixed lg:relative inset-y-0 left-0 z-30 transform transition-transform duration-300 ease-in-out lg:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <UserSidebar onClose={() => setSidebarOpen(false)} />
      </aside>

      {/* Main content */}
      {/* NOTE: overflow-visible on this column so the Navbar dropdowns can overflow */}
      <div className="flex-1 flex flex-col min-w-0 overflow-visible">
        {/* Upgraded Navbar with functional bell + avatar dropdown */}
        <Navbar onMenuClick={() => setSidebarOpen(true)} />

        {/* Page content */}
        <main className="flex-1 overflow-auto p-4 lg:p-6 bg-[#050505] relative pb-24 lg:pb-6">
          <div className="absolute inset-0 bg-gradient-to-br from-green-500/[0.03] to-transparent pointer-events-none" />
          <div className="relative z-10 max-w-7xl mx-auto">
            <Outlet />
          </div>
        </main>
      </div>

      {/* Mobile Bottom Navigation */}
      <nav className="fixed bottom-0 inset-x-0 z-40 lg:hidden bg-[#0a0a0a]/95 backdrop-blur-xl border-t border-white/[0.07]">
        <div className="flex items-center justify-around h-16 px-2">
          {BOTTOM_NAV.map(({ path, icon: Icon, label }) => {
            const isActive =
              location.pathname === path ||
              location.pathname.startsWith(path + '/');
            return (
              <Link
                key={path}
                to={path}
                className="flex flex-col items-center gap-1 flex-1 py-2 rounded-xl transition-all relative"
              >
                <div
                  className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all relative ${
                    isActive ? 'bg-green-500/15' : 'bg-transparent'
                  }`}
                >
                  <Icon
                    className={`w-5 h-5 transition-colors ${
                      isActive ? 'text-green-400' : 'text-gray-600'
                    }`}
                  />
                  {/* Unread badge on Alerts icon */}
                  {label === 'Alerts' && unread > 0 && (
                    <span className="absolute -top-1 -right-1 min-w-[16px] h-4 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center px-1">
                      {unread > 9 ? '9+' : unread}
                    </span>
                  )}
                </div>
                <span
                  className={`text-[10px] font-bold tracking-wide transition-colors ${
                    isActive ? 'text-green-400' : 'text-gray-700'
                  }`}
                >
                  {label}
                </span>
                {isActive && (
                  <span className="absolute top-0 left-1/2 -translate-x-1/2 w-6 h-0.5 rounded-full bg-green-400" />
                )}
              </Link>
            );
          })}
        </div>
        <div className="h-safe-bottom bg-[#0a0a0a]" style={{ height: 'env(safe-area-inset-bottom, 0px)' }} />
      </nav>

      {/* AI FitBot Chat Widget */}
      <ChatBot />
    </div>
  );
}
