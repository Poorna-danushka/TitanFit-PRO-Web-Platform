import { useState, useEffect } from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { authAPI } from '../api/apiService';
import { useAuth } from '../context/AuthContext';
import { Eye, EyeOff, Loader2, AlertCircle, Mail, Lock, ShieldCheck, Clock } from 'lucide-react';
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
      navigate(isAdminLike ? '/admin/dashboard' : uRole === 'STAFF' ? '/staff/dashboard' : uRole === 'TRAINER' ? '/trainer/dashboard' : '/dashboard');
    } catch (err: any) {
      setError(err.safeMessage || 'Invalid email or password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-black flex overflow-hidden">
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
            <ShieldCheck className="w-4 h-4 text-green-400" />
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
            <LogoIcon size="lg" variant="green" />
            <span className="text-2xl brand-logo-title tracking-tight text-white flex items-center gap-2 font-extrabold">
              <span>TITAN<span className="text-green-400">FIT</span></span>
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
              <label className="block text-[11px] font-display font-semibold uppercase tracking-widest text-gray-500 mb-2">
                Password
              </label>
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
              className="w-full flex items-center justify-center gap-2.5 bg-green-500 text-black py-3.5 rounded-xl font-bold hover:bg-green-400 disabled:opacity-60 disabled:cursor-not-allowed transition-all glow-green mt-2 text-sm"
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
            <Link to="/register" className="text-green-400 font-semibold hover:text-green-300 transition-colors">
              Create one free
            </Link>
          </p>
        </motion.div>
      </div>
    </div>
  );
}
