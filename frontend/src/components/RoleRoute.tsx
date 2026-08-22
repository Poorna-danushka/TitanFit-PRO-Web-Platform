import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

interface RoleRouteProps {
  allowedRoles: string[];
}

export default function RoleRoute({ allowedRoles }: RoleRouteProps) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-green-500/30 border-t-green-500 rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (user.mustChangePassword) {
    return <Navigate to="/force-change-password" replace />;
  }

  const normalizedUserRole = (user.role || 'MEMBER').toUpperCase();
  const normalizedAllowed = allowedRoles.map(r => r.toUpperCase());

  // System Admin always bypasses role restrictions
  const isSystemAdmin = normalizedUserRole === 'SYSTEM_ADMIN' || Boolean((user as any)?.isSystemAdmin);

  if (!isSystemAdmin && !normalizedAllowed.includes(normalizedUserRole)) {
    // Redirect to user's primary dashboard if role is unauthorized for this route
    if (normalizedUserRole === 'ADMIN') return <Navigate to="/admin/dashboard" replace />;
    if (normalizedUserRole === 'STAFF') return <Navigate to="/staff/dashboard" replace />;
    if (normalizedUserRole === 'TRAINER') return <Navigate to="/trainer/dashboard" replace />;
    return <Navigate to="/dashboard" replace />;
  }

  return <Outlet />;
}
