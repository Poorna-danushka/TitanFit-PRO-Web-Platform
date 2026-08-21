/**
 * RoleAdaptiveLayout
 * Renders AdminLayout for ADMIN/SYSTEM_ADMIN users, UserLayout for everyone else.
 * Used for shared pages like /profile and /notifications that must be
 * accessible regardless of role.
 */
import { useAuth } from '../context/AuthContext';
import AdminLayout from './AdminLayout';
import UserLayout from './UserLayout';

export default function RoleAdaptiveLayout() {
  const { user } = useAuth();
  const uRole = (user?.role || '').toUpperCase();
  const isAdmin = uRole === 'ADMIN' || uRole === 'SYSTEM_ADMIN' || Boolean(user?.isSystemAdmin);
  return isAdmin ? <AdminLayout /> : <UserLayout />;
}
