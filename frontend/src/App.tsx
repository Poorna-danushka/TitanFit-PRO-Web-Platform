import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Login from './pages/Login';
import Register from './pages/Register';
import Home from './pages/Home';
import Dashboard from './pages/Dashboard';
import StaffDashboard from './pages/StaffDashboard';
import TrainerDashboard from './pages/TrainerDashboard';
import PackageList from './pages/PackageList';
import MyPackage from './pages/MyPackage';
import Profile from './pages/Profile';
import Trainers from './pages/Trainers';
import AttendanceQR from './pages/AttendanceQR';

import UserNotificationsPage from './pages/UserNotificationsPage';

import AdminDashboard from './pages/admin/AdminDashboard';
import ManagePackages from './pages/admin/ManagePackages';
import ManageUsers from './pages/admin/ManageUsers';
import ManagePurchases from './pages/admin/ManagePurchases';
import ManageNotifications from './pages/admin/ManageNotifications';
import BackupSettings from './pages/admin/BackupSettings';

import ForceChangePassword from './pages/ForceChangePassword';
import NotFound from './pages/NotFound';

import ProtectedRoute from './components/ProtectedRoute';
import AdminRoute from './components/AdminRoute';
import AnyUserRoute from './components/AnyUserRoute';
import RoleAdaptiveLayout from './components/RoleAdaptiveLayout';
import RoleRoute from './components/RoleRoute';
import PTRoute from './components/PTRoute';
import UserLayout from './components/UserLayout';
import AdminLayout from './components/AdminLayout';
import Notifications from './components/Notifications';

// ─── Role-based dashboard redirect helper ─────────────────────────────────────
function getDashboardPathForRole(role?: string, isSystemAdmin?: boolean, mustChangePassword?: boolean): string {
  if (mustChangePassword) return '/force-change-password';

  const normalized = (role || 'MEMBER').toUpperCase();
  if (normalized === 'SYSTEM_ADMIN' || isSystemAdmin) return '/admin/dashboard';
  if (normalized === 'ADMIN') return '/admin/dashboard';
  if (normalized === 'STAFF') return '/staff/dashboard';
  if (normalized === 'TRAINER') return '/trainer/dashboard';
  return '/dashboard';
}

function RootRedirect() {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (!user) return <Home />;
  return <Navigate to={getDashboardPathForRole(user.role, user.isSystemAdmin, user.mustChangePassword)} replace />;
}

function LoginRedirect() {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (user) return <Navigate to={getDashboardPathForRole(user.role, user.isSystemAdmin, user.mustChangePassword)} replace />;
  return <Login />;
}

function RegisterRedirect() {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (user) return <Navigate to={getDashboardPathForRole(user.role, user.isSystemAdmin, user.mustChangePassword)} replace />;
  return <Register />;
}

function ForceChangePasswordRoute() {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (!user) return <Navigate to="/login" replace />;
  if (!user.mustChangePassword) {
    return <Navigate to={getDashboardPathForRole(user.role, user.isSystemAdmin, false)} replace />;
  }
  return <ForceChangePassword />;
}

function App() {
  return (
    <AuthProvider>
      <Router>
        <Notifications />
        <Routes>
          {/* Public Routes */}
          <Route path="/" element={<RootRedirect />} />
          <Route path="/login" element={<LoginRedirect />} />
          <Route path="/register" element={<RegisterRedirect />} />
          <Route path="/force-change-password" element={<ForceChangePasswordRoute />} />

          {/* ─── Universal routes: accessible by ANY authenticated user (any role) ─── */}
          {/* Profile & Notifications work for Members, Staff, Trainers, Admin, System Admin */}
          {/* RoleAdaptiveLayout picks AdminLayout for admins, UserLayout for everyone else */}
          <Route element={<AnyUserRoute />}>
            <Route element={<RoleAdaptiveLayout />}>
              <Route path="/profile" element={<Profile />} />
              <Route path="/notifications" element={<UserNotificationsPage />} />
            </Route>
          </Route>

          {/* ─── Member / User routes ─── */}
          <Route element={<ProtectedRoute />}>
            <Route element={<UserLayout />}>
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/packages" element={<PackageList />} />
              <Route path="/my-package" element={<MyPackage />} />
              <Route path="/trainers" element={<PTRoute><Trainers /></PTRoute>} />
              <Route path="/attendance-qr" element={<AttendanceQR />} />
            </Route>
          </Route>

          {/* ─── Staff Dashboard ─── */}
          <Route element={<RoleRoute allowedRoles={['STAFF', 'ADMIN', 'SYSTEM_ADMIN']} />}>
            <Route element={<UserLayout />}>
              <Route path="/staff/dashboard" element={<StaffDashboard />} />
            </Route>
          </Route>

          {/* ─── Trainer Dashboard ─── */}
          <Route element={<RoleRoute allowedRoles={['TRAINER', 'ADMIN', 'SYSTEM_ADMIN']} />}>
            <Route element={<UserLayout />}>
              <Route path="/trainer/dashboard" element={<TrainerDashboard />} />
            </Route>
          </Route>

          {/* ─── Admin & System Admin Routes ─── */}
          <Route path="/admin" element={<AdminRoute />}>
            <Route index element={<Navigate to="/admin/dashboard" replace />} />
            <Route element={<AdminLayout />}>
              <Route path="dashboard" element={<AdminDashboard />} />
              <Route path="packages" element={<ManagePackages />} />
              <Route path="users" element={<ManageUsers />} />
              <Route path="purchases" element={<ManagePurchases />} />
              <Route path="notifications" element={<ManageNotifications />} />
              <Route path="backups" element={<BackupSettings />} />
            </Route>
          </Route>

          {/* Catch-all route showing clean 404 page */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;
