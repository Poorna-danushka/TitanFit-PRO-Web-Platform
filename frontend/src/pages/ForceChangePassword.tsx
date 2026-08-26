import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { authAPI } from '../api/apiService';
import { useAuth } from '../context/AuthContext';
import { Lock, Eye, EyeOff, ShieldCheck, KeyRound, ArrowRight, LogOut, CheckCircle2, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'react-toastify';

export default function ForceChangePassword() {
  const { user, updateUser, logout } = useAuth();
  const navigate = useNavigate();

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Password strength checks
  const hasMinLength = newPassword.length >= 8;
  const hasUpper = /[A-Z]/.test(newPassword);
  const hasLower = /[a-z]/.test(newPassword);
  const hasNumber = /[0-9]/.test(newPassword);
  const hasSpecial = /[^A-Za-z0-9]/.test(newPassword);
  const passwordsMatch = newPassword.length > 0 && newPassword === confirmPassword;
  const isStrong = hasMinLength && hasUpper && hasLower && hasNumber && hasSpecial && passwordsMatch;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!isStrong) {
      setError('Please meet all password requirements before proceeding.');
      return;
    }

    setLoading(true);

    try {
      // Call changePassword without requiring current password since user is already verified via login
      const res = await authAPI.changePassword(newPassword);
      toast.success(res.data.message || 'Password successfully created! Welcome to GymFit Pro.');

      // Update auth context state
      updateUser({ mustChangePassword: false });

      // Determine dashboard route
      const uRole = (user?.role || '').toUpperCase();
      const isAdminLike = ['ADMIN', 'SYSTEM_ADMIN'].includes(uRole) || Boolean((user as any)?.isSystemAdmin);

      let targetPath = '/dashboard';
      if (isAdminLike) targetPath = '/admin/dashboard';
      else if (uRole === 'STAFF') targetPath = '/staff/dashboard';
      else if (uRole === 'TRAINER') targetPath = '/trainer/dashboard';

      setTimeout(() => {
        navigate(targetPath, { replace: true });
      }, 500);
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.safeMessage || err?.message || 'Failed to update password.';
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#070709] text-white flex flex-col justify-center items-center px-4 py-12 relative overflow-hidden selection:bg-green-500 selection:text-black">
      {/* Background ambient lighting */}
      <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-green-500/10 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] bg-blue-500/10 rounded-full blur-[140px] pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-lg relative z-10"
      >
        {/* Header Branding */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-tr from-green-500/20 to-green-500/5 border border-green-500/30 text-green-400 mb-4 shadow-[0_0_30px_rgba(34,197,94,0.2)]">
            <KeyRound className="w-8 h-8 text-green-400" />
          </div>
          <h1 className="text-3xl font-display font-extrabold tracking-tight text-white mb-2">
            Create Your Permanent Password
          </h1>
          <p className="text-gray-400 text-sm max-w-md mx-auto leading-relaxed">
            Welcome, <span className="text-white font-semibold">{user?.name || user?.email}</span>! Please create a new secure password for your account to proceed to your dashboard.
          </p>
        </div>

        {/* Form Card */}
        <div className="bg-[#111115]/90 backdrop-blur-xl border border-white/10 rounded-3xl p-8 shadow-2xl space-y-6 relative overflow-hidden">
          <div className="flex items-center gap-3 p-3.5 rounded-2xl bg-green-500/10 border border-green-500/20 text-green-300 text-xs">
            <ShieldCheck className="w-5 h-5 flex-shrink-0 text-green-400" />
            <span>One-time password verified. Set your new personal password below.</span>
          </div>

          <AnimatePresence>
            {error && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="flex items-center gap-3 p-4 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs"
              >
                <AlertCircle className="w-5 h-5 flex-shrink-0" />
                <p>{error}</p>
              </motion.div>
            )}
          </AnimatePresence>

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* New Password */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-gray-400 mb-2">
                New Permanent Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-gray-500">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type={showNew ? 'text' : 'password'}
                  required
                  value={newPassword}
                  onChange={(e) => { setNewPassword(e.target.value); setError(''); }}
                  placeholder="At least 8 characters"
                  className="w-full pl-11 pr-11 py-3.5 bg-black/50 border border-white/10 rounded-xl text-sm text-white placeholder-gray-600 focus:outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500 transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowNew(!showNew)}
                  className="absolute inset-y-0 right-0 pr-4 flex items-center text-gray-500 hover:text-gray-300"
                >
                  {showNew ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Confirm New Password */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-gray-400 mb-2">
                Confirm New Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-gray-500">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type={showConfirm ? 'text' : 'password'}
                  required
                  value={confirmPassword}
                  onChange={(e) => { setConfirmPassword(e.target.value); setError(''); }}
                  placeholder="Repeat new password"
                  className="w-full pl-11 pr-11 py-3.5 bg-black/50 border border-white/10 rounded-xl text-sm text-white placeholder-gray-600 focus:outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500 transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirm(!showConfirm)}
                  className="absolute inset-y-0 right-0 pr-4 flex items-center text-gray-500 hover:text-gray-300"
                >
                  {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Password Requirements Checklist */}
            <div className="p-4 bg-white/[0.02] border border-white/5 rounded-2xl space-y-2 text-xs">
              <p className="font-bold text-gray-400 uppercase tracking-wider text-[10px] mb-2">Password Requirements</p>
              <div className="grid grid-cols-2 gap-2">
                <div className={`flex items-center gap-2 ${hasMinLength ? 'text-green-400 font-semibold' : 'text-gray-500'}`}>
                  <CheckCircle2 className="w-3.5 h-3.5 flex-shrink-0" />
                  <span>8+ Characters</span>
                </div>
                <div className={`flex items-center gap-2 ${hasUpper ? 'text-green-400 font-semibold' : 'text-gray-500'}`}>
                  <CheckCircle2 className="w-3.5 h-3.5 flex-shrink-0" />
                  <span>Uppercase Letter</span>
                </div>
                <div className={`flex items-center gap-2 ${hasLower ? 'text-green-400 font-semibold' : 'text-gray-500'}`}>
                  <CheckCircle2 className="w-3.5 h-3.5 flex-shrink-0" />
                  <span>Lowercase Letter</span>
                </div>
                <div className={`flex items-center gap-2 ${hasNumber ? 'text-green-400 font-semibold' : 'text-gray-500'}`}>
                  <CheckCircle2 className="w-3.5 h-3.5 flex-shrink-0" />
                  <span>Number (0-9)</span>
                </div>
                <div className={`flex items-center gap-2 ${hasSpecial ? 'text-green-400 font-semibold' : 'text-gray-500'}`}>
                  <CheckCircle2 className="w-3.5 h-3.5 flex-shrink-0" />
                  <span>Special Character (@#$%)</span>
                </div>
                <div className={`flex items-center gap-2 ${passwordsMatch ? 'text-green-400 font-semibold' : 'text-gray-500'}`}>
                  <CheckCircle2 className="w-3.5 h-3.5 flex-shrink-0" />
                  <span>Passwords Match</span>
                </div>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading || !isStrong}
              className="w-full py-4 px-6 rounded-2xl bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-400 hover:to-emerald-400 text-black font-extrabold text-sm tracking-wide transition-all shadow-[0_0_25px_rgba(34,197,94,0.25)] flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed group"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                  <span>Setting Permanent Password...</span>
                </>
              ) : (
                <>
                  <span>Save Password & Access Dashboard</span>
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </button>
          </form>

          {/* Logout / Switch Account Option */}
          <div className="pt-4 border-t border-white/5 text-center">
            <button
              onClick={() => logout()}
              className="inline-flex items-center gap-2 text-xs text-gray-500 hover:text-gray-300 transition-colors"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Not your account? Sign out</span>
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}