/**
 * AnyUserRoute – protects routes that must be accessible to
 * ALL authenticated users regardless of role (e.g. /profile, /notifications).
 * It never redirects admins away – it only forces an unauthenticated user to login.
 */
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const AnyUserRoute = () => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-green-500/30 border-t-green-500 rounded-full animate-spin" />
          <p className="text-gray-500 text-sm font-medium tracking-widest uppercase">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;

  return <Outlet />;
};

export default AnyUserRoute;
