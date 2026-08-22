import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const AdminRoute = () => {
  const { user, loading } = useAuth();

  if (loading) return <LoadingScreen />;
  if (!user) return <Navigate to="/login" replace />;
  if (user.mustChangePassword) {
    return <Navigate to="/force-change-password" replace />;
  }

  const uRole = (user.role || '').toUpperCase();
  const isAdmin = ['ADMIN', 'SYSTEM_ADMIN', 'STAFF'].includes(uRole) || Boolean((user as any)?.isSystemAdmin);

  // Non-admins trying to access admin routes go to user dashboard
  if (!isAdmin) return <Navigate to="/dashboard" replace />;

  return <Outlet />;
};

const LoadingScreen = () => (
  <div className="min-h-screen bg-black flex items-center justify-center">
    <div className="flex flex-col items-center gap-4">
      <div className="w-12 h-12 border-4 border-green-500/30 border-t-green-500 rounded-full animate-spin" />
      <p className="text-gray-500 text-sm font-medium tracking-widest uppercase">Loading...</p>
    </div>
  </div>
);

export default AdminRoute;
