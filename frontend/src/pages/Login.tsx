import { useState, useEffect } from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { authAPI } from '../api/apiService';
import { useAuth } from '../context/AuthContext';
import { Eye, EyeOff, Loader2, AlertCircle, Mail, Lock, ShieldCheck, Clock, X, KeyRound, CheckCircle2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  validateLoginForm,
  checkRateLimit,
  resetRateLimit,
  formatLockoutTime,
  sanitizeInput,
} from '../utils/security';

import LogoIcon from '../components/LogoIcon';

export default function Login() {
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [lockoutMs, setLockoutMs] = useState(0);
  const [sessionMsg, setSessionMsg] = useState('');

  // Forgot password OTP modal state
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotSuccess, setForgotSuccess] = useState('');
  const [forgotError, setForgotError] = useState('');

  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { login } = useAuth();

  // Show contextual messages from URL params & fetch CSRF token
  useEffect(() => {
    authAPI.getCsrfToken().catch(() => {});

    const reason = searchParams.get('reason');
    if (reason === 'session_expired') {
      setSessionMsg('Your session expired. Please sign in again.');
    } else if (reason === 'security') {
      setSessionMsg('You were signed out for security reasons. Please sign in again.');
    }
  }, [searchParams]);

  // Count down lockout timer
  useEffect(() => {
    if (!lockoutMs) return;
    const id = setInterval(() => {
      setLockoutMs((prev) => {
        if (prev <= 1000) { clearInterval(id); return 0; }
        return prev - 1000;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [lockoutMs]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: '' }));
    if (error) setError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Client-side validation
    const { valid, errors: validationErrors } = validateLoginForm(formData.email, formData.password);
    if (!valid) { setErrors(validationErrors); return; }

    // Rate limit check
    const rl = checkRateLimit(`login:${formData.email}`, 5, 60_000, 300_000);
    if (!rl.allowed) {
      setLockoutMs(rl.remainingMs ?? 300_000);
      setError(`Too many failed attempts. Please wait ${formatLockoutTime(rl.remainingMs ?? 0)}.`);
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await authAPI.login(sanitizeInput(formData.email), formData.password);
      const userData = response.data.user;
      resetRateLimit(`login:${formData.email}`);
      login(response.data.tokens.accessToken, userData, response.data.tokens.refreshToken);
      const uRole = (userData.role || '').toUpperCase();
      const isAdminLike = ['ADMIN', 'SYSTEM_ADMIN'].includes(uRole) || Boolean(userData?.isSystemAdmin);

      if (userData.mustChangePassword) {
        navigate('/force-change-password', { replace: true });
      } else {
        navigate(isAdminLike ? '/admin/dashboard' : uRole === 'STAFF' ? '/staff/dashboard' : uRole === 'TRAINER' ? '/trainer/dashboard' : '/dashboard', { replace: true });
      }
    } catch (err: any) {
      setError(err.safeMessage || 'Invalid email or password');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenForgotModal = () => {
    setForgotEmail(formData.email || '');
    setForgotError('');
    setForgotSuccess('');
    setShowForgotModal(true);
  };

  const handleForgotPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!forgotEmail || !forgotEmail.includes('@')) {
      setForgotError('Please enter a valid email address.');
      return;
    }

    setForgotLoading(true);
    setForgotError('');
    setForgotSuccess('');

    try {
      const res = await authAPI.requestPasswordReset(sanitizeInput(forgotEmail));
      setForgotSuccess(res.data?.message || 'Temporary OTP password sent to your email!');
      setFormData((prev) => ({ ...prev, email: forgotEmail }));
    } catch (err: any) {
      setForgotError(err?.response?.data?.message || err?.safeMessage || 'Failed to send temporary password email.');
    } finally {
      setForgotLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0B0F14] flex overflow-hidden">
      {/* Left panel */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden">
        <img
          src="https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?q=80&w=2070&auto=format&fit=crop"
          alt="Gym"
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-black/60 to-black/20" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
        <div className="relative z-10 flex flex-col justify-end p-12">
          <div className="flex items-center gap-2 mb-6 px-3 py-2 bg-white/10 backdrop-blur-md rounded-lg w-fit border border-white/10">
            <ShieldCheck className="w-4 h-4 text-sky-400" />
            <span className="text-white text-xs font-semibold">Bank-level security & encryption</span>
          </div>
          <blockquote className="text-white">
            <p className="font-display text-3xl font-bold leading-tight mb-4">
              "The body achieves what the mind believes."
            </p>
            <footer className="text-gray-400 text-sm">— Napoleon Hill</footer>
          </blockquote>
        </div>
      </div>

      {/* Right panel */}
      <div className="flex-1 flex items-center justify-center p-6 auth-bg relative">
        <div className="absolute inset-0 opacity-[0.015]" style={{
          backgroundImage: 'linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)',
          backgroundSize: '40px 40px',
        }} />

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="relative z-10 w-full max-w-md"
        >
          <Link to="/" className="flex items-center gap-2.5 mb-10 justify-center lg:justify-start group">
            <LogoIcon size="lg" variant="titanium" />
            <span className="text-2xl brand-logo-title tracking-tight text-white flex items-center gap-2 font-extrabold">
              <span>TITAN<span className="text-sky-400">FIT</span></span>
              <span className="brand-accent-badge text-xs">PRO</span>
            </span>
          </Link>

          <div className="mb-8">
            <h1 className="font-display text-4xl font-bold text-white mb-2">Welcome back</h1>
            <p className="text-gray-500">Sign in to continue your fitness journey.</p>
          </div>

          {/* Session expired / security notice */}
          <AnimatePresence>
            {sessionMsg && (
              <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="flex items-center gap-3 px-4 py-3.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 text-sm mb-4"
              >
                <Clock className="w-4 h-4 shrink-0" />
                {sessionMsg}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Error banner */}
          <AnimatePresence>
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="flex items-center gap-3 px-4 py-3.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm mb-6"
              >
                <AlertCircle className="w-4 h-4 shrink-0" />
                {error}
              </motion.div>
            )}
          </AnimatePresence>

          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            {/* Email */}
            <div>
              <label className="block text-[11px] font-display font-semibold uppercase tracking-widest text-gray-500 mb-2">
                Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-600 pointer-events-none" />
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="you@example.com"
                  className={`input-dark w-full pl-10 ${errors.email ? 'border-red-500/50' : ''}`}
                  required
                  autoComplete="email"
                  aria-describedby={errors.email ? 'email-error' : undefined}
                />
              </div>
              {errors.email && (
                <p id="email-error" className="text-red-400 text-xs mt-1.5 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" /> {errors.email}
                </p>
              )}
            </div>

            {/* Password */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-[11px] font-display font-semibold uppercase tracking-widest text-gray-500">
                  Password
                </label>
                <button
                  type="button"
                  onClick={handleOpenForgotModal}
                  className="text-xs text-sky-400 hover:text-sky-300 transition-colors font-medium"
                >
                  Forgot password?
                </button>
              </div>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-600 pointer-events-none" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  placeholder="••••••••"
                  className={`input-dark w-full pl-10 pr-12 ${errors.password ? 'border-red-500/50' : ''}`}
                  required
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-600 hover:text-gray-300 transition-colors"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {errors.password && (
                <p className="text-red-400 text-xs mt-1.5 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" /> {errors.password}
                </p>
              )}
            </div>

            <button
              type="submit"
              disabled={loading || lockoutMs > 0}
              className="w-full flex items-center justify-center gap-2.5 bg-sky-500 text-black py-3.5 rounded-xl font-bold hover:bg-sky-400 disabled:opacity-60 disabled:cursor-not-allowed transition-all glow-green mt-2 text-sm"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              {lockoutMs > 0
                ? `Locked — wait ${formatLockoutTime(lockoutMs)}`
                : loading
                ? 'Signing in...'
                : 'Sign In'}
            </button>
          </form>

          <p className="text-center mt-8 text-gray-600 text-sm">
            Don't have an account?{' '}
            <Link to="/register" className="text-sky-400 font-semibold hover:text-sky-300 transition-colors">
              Create one free
            </Link>
          </p>
        </motion.div>
      </div>

      {/* Forgot Password OTP Modal */}
      <AnimatePresence>
        {showForgotModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0B0F14]/80 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-md bg-[#111115] border border-white/10 rounded-3xl p-6 shadow-2xl relative overflow-hidden"
            >
              {/* Close Button */}
              <button
                type="button"
                onClick={() => setShowForgotModal(false)}
                className="absolute top-4 right-4 p-2 text-gray-500 hover:text-white transition-colors rounded-full hover:bg-white/5"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-sky-500/10 border border-sky-500/20 text-sky-400 flex items-center justify-center">
                  <KeyRound className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">Reset Password via OTP</h3>
                  <p className="text-xs text-gray-400">Receive a temporary password in your inbox</p>
                </div>
              </div>

              {forgotSuccess ? (
                <div className="space-y-4 py-2">
                  <div className="p-4 rounded-2xl bg-sky-500/10 border border-sky-500/20 text-sky-300 text-xs flex items-start gap-3">
                    <CheckCircle2 className="w-5 h-5 text-sky-400 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-bold text-white text-sm mb-1">Temporary OTP Sent!</p>
                      <p className="leading-relaxed">{forgotSuccess}</p>
                      <p className="mt-2 text-gray-400 text-[11px]">
                        Log in using your email and the temporary password received in your email. You will then be prompted to create your new permanent password.
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowForgotModal(false)}
                    className="w-full py-3 bg-sky-500 text-black font-bold rounded-xl hover:bg-sky-400 transition-colors text-sm"
                  >
                    Got It — Return to Login
                  </button>
                </div>
              ) : (
                <form onSubmit={handleForgotPasswordSubmit} className="space-y-4">
                  {forgotError && (
                    <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 shrink-0" />
                      <span>{forgotError}</span>
                    </div>
                  )}

                  <div>
                    <label className="block text-[11px] font-display font-semibold uppercase tracking-widest text-gray-400 mb-1.5">
                      Account Email Address
                    </label>
                    <div className="relative">
                      <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-600 pointer-events-none" />
                      <input
                        type="email"
                        required
                        value={forgotEmail}
                        onChange={(e) => { setForgotEmail(e.target.value); setForgotError(''); }}
                        placeholder="you@example.com"
                        className="input-dark w-full pl-10 text-sm"
                      />
                    </div>
                  </div>

                  <p className="text-xs text-gray-500 leading-relaxed">
                    We will send a one-time temporary password (OTP) to this email address. Once logged in, you must set a new permanent password.
                  </p>

                  <div className="flex gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => setShowForgotModal(false)}
                      className="flex-1 py-3 bg-white/5 hover:bg-white/10 text-gray-300 text-sm font-semibold rounded-xl transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={forgotLoading}
                      className="flex-1 py-3 bg-sky-500 hover:bg-sky-400 text-black text-sm font-bold rounded-xl transition-colors glow-green flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                      {forgotLoading ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>Sending...</span>
                        </>
                      ) : (
                        <span>Send OTP</span>
                      )}
                    </button>
                  </div>
                </form>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

