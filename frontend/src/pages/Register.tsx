import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { authAPI } from '../api/apiService';
import { useAuth } from '../context/AuthContext';
import { Eye, EyeOff, Loader2, AlertCircle, Mail, Lock, User, CheckCircle2, Phone } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  validateRegisterForm,
  validatePassword,
  checkRateLimit,
  resetRateLimit,
  sanitizeInput,
  formatLockoutTime,
} from '../utils/security';

import LogoIcon from '../components/LogoIcon';
import BackButton from '../components/BackButton';

export default function Register() {
  const [formData, setFormData] = useState({ name: '', email: '', phone: '', password: '' });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [apiError, setApiError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [lockoutMs, setLockoutMs] = useState(0);
  const navigate = useNavigate();
  const { login } = useAuth();

  const passwordStrength = validatePassword(formData.password);

  // Countdown for lockout timer
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
    if (apiError) setApiError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Client-side validation (includes phone)
    const { valid, errors: validationErrors } = validateRegisterForm(
      formData.name,
      formData.email,
      formData.password,
      formData.phone,
    );
    if (!valid) {
      setErrors(validationErrors);
      return;
    }

    // Client-side rate limit
    const rl = checkRateLimit(`register:${formData.email}`, 5, 300_000, 600_000);
    if (!rl.allowed) {
      setLockoutMs(rl.remainingMs ?? 600_000);
      setApiError(`Too many attempts. Wait ${formatLockoutTime(rl.remainingMs ?? 0)}.`);
      return;
    }

    setLoading(true);
    setApiError('');
    try {
      const response = await authAPI.register(
        sanitizeInput(formData.name),
        sanitizeInput(formData.email),
        formData.password,
        formData.phone ? sanitizeInput(formData.phone) : undefined,
      );
      resetRateLimit(`register:${formData.email}`);
      const userData = response.data.user;
      login(response.data.tokens.accessToken, userData, response.data.tokens.refreshToken);
      navigate('/dashboard');
    } catch (err: any) {
      // Show field-specific API errors if available
      const data = err?.response?.data;
      if (data?.errors && Array.isArray(data.errors)) {
        const fieldErrs: Record<string, string> = {};
        data.errors.forEach((e: { field: string; message: string }) => {
          fieldErrs[e.field] = e.message;
        });
        setErrors(fieldErrs);
        setApiError('Please fix the highlighted errors below.');
      } else {
        setApiError(
          data?.message ||
          err?.safeMessage ||
          'Registration failed. Please check your details and try again.'
        );
      }
    } finally {
      setLoading(false);
    }
  };

  const strengthColors = ['bg-white/10', 'bg-red-500', 'bg-[#C7CED6]', 'bg-yellow-500', 'bg-blue-500', 'bg-sky-500'];
  const strengthTextColors = ['text-gray-600', 'text-red-400', 'text-[#C7CED6]', 'text-yellow-400', 'text-blue-400', 'text-sky-400'];
  const strengthLabels = ['', 'Very Weak', 'Weak', 'Fair — add uppercase/digit', 'Good', 'Strong'];

  return (
    <div className="min-h-screen bg-[#0B0F14] flex overflow-hidden">
      {/* Left panel */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden">
        <img
          src="https://images.unsplash.com/photo-1534438327276-14e5300c3a48?q=80&w=2070&auto=format&fit=crop"
          alt="Gym"
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-black/70 to-black/20" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
        <div className="relative z-10 flex flex-col justify-end p-12">
          <div className="mb-6">
            <span className="inline-flex items-center gap-2 px-3 py-1.5 bg-sky-500/15 border border-sky-500/30 rounded-full text-sky-400 text-xs font-bold uppercase tracking-wider">
              Gym Members Only
            </span>
          </div>
          <h3 className="font-display text-2xl font-bold text-white mb-6">Everything you need to succeed</h3>
          <div className="space-y-3">
            {[
              'Expert-curated workout packages',
              'Hundreds of guided exercises',
              'Progress tracking & analytics',
              'AI-powered fitness coaching',
            ].map((item, i) => (
              <div key={i} className="flex items-center gap-3">
                <CheckCircle2 className="w-5 h-5 text-sky-400 shrink-0" />
                <span className="text-gray-300 text-sm">{item}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right panel */}
      <div className="flex-1 flex items-center justify-center p-6 auth-bg relative overflow-y-auto">
        <div className="absolute inset-0 opacity-[0.015]" style={{
          backgroundImage: 'linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)',
          backgroundSize: '40px 40px',
        }} />

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="relative z-10 w-full max-w-md py-8"
        >
          <div className="flex items-center justify-between mb-6">
            <BackButton fallbackPath="/" label="Back to Home" />
          </div>

          <Link to="/" className="flex items-center gap-2.5 mb-8 justify-center lg:justify-start group">
            <LogoIcon size="lg" variant="titanium" />
            <span className="text-2xl brand-logo-title tracking-tight text-white flex items-center gap-2 font-extrabold">
              <span>TITAN<span className="text-sky-400">FIT</span></span>
              <span className="brand-accent-badge text-xs">PRO</span>
            </span>
          </Link>

          <div className="mb-6">
            <h1 className="font-display text-3xl font-bold text-white mb-1">Create your account</h1>
            <p className="text-gray-500 text-sm">Join TITANFIT PRO as a gym member. Admin and staff accounts are created by the admin.</p>
          </div>

          {/* API Error Banner */}
          <AnimatePresence>
            {apiError && (
              <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="flex items-start gap-3 px-4 py-3.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm mb-5"
              >
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{apiError}</span>
              </motion.div>
            )}
          </AnimatePresence>

          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            {/* Full Name */}
            <div>
              <label className="block text-[11px] font-display font-semibold uppercase tracking-widest text-gray-500 mb-2">
                Full Name <span className="text-red-400">*</span>
              </label>
              <div className="relative">
                <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-600 pointer-events-none" />
                <input
                  type="text"
                  name="name"
                  id="reg-name"
                  value={formData.name}
                  onChange={handleChange}
                  placeholder="John Doe"
                  className={`input-dark w-full pl-10 ${errors.name ? 'border-red-500/60 bg-red-500/5' : ''}`}
                  required
                  autoComplete="name"
                  maxLength={60}
                />
              </div>
              {errors.name && (
                <p className="text-red-400 text-xs mt-1.5 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3 shrink-0" /> {errors.name}
                </p>
              )}
            </div>

            {/* Email */}
            <div>
              <label className="block text-[11px] font-display font-semibold uppercase tracking-widest text-gray-500 mb-2">
                Email Address <span className="text-red-400">*</span>
              </label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-600 pointer-events-none" />
                <input
                  type="email"
                  name="email"
                  id="reg-email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="you@example.com"
                  className={`input-dark w-full pl-10 ${errors.email ? 'border-red-500/60 bg-red-500/5' : ''}`}
                  required
                  autoComplete="email"
                />
              </div>
              {errors.email && (
                <p className="text-red-400 text-xs mt-1.5 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3 shrink-0" /> {errors.email}
                </p>
              )}
            </div>

            {/* Contact Number */}
            <div>
              <label className="block text-[11px] font-display font-semibold uppercase tracking-widest text-gray-500 mb-2">
                Contact Number <span className="text-gray-600 text-[10px] normal-case tracking-normal font-normal">(optional)</span>
              </label>
              <div className="relative">
                <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-600 pointer-events-none" />
                <input
                  type="tel"
                  name="phone"
                  id="reg-phone"
                  value={formData.phone}
                  onChange={handleChange}
                  placeholder="+94 77 123 4567"
                  className={`input-dark w-full pl-10 ${errors.phone ? 'border-red-500/60 bg-red-500/5' : ''}`}
                  autoComplete="tel"
                />
              </div>
              {errors.phone && (
                <p className="text-red-400 text-xs mt-1.5 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3 shrink-0" /> {errors.phone}
                </p>
              )}
            </div>

            {/* Password */}
            <div>
              <label className="block text-[11px] font-display font-semibold uppercase tracking-widest text-gray-500 mb-2">
                Password <span className="text-red-400">*</span>
              </label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-600 pointer-events-none" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  name="password"
                  id="reg-password"
                  value={formData.password}
                  onChange={handleChange}
                  placeholder="Min. 8 characters"
                  className={`input-dark w-full pl-10 pr-12 ${errors.password ? 'border-red-500/60 bg-red-500/5' : ''}`}
                  required
                  minLength={8}
                  autoComplete="new-password"
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
                  <AlertCircle className="w-3 h-3 shrink-0" /> {errors.password}
                </p>
              )}

              {/* Strength meter */}
              {formData.password && (
                <div className="mt-2.5">
                  <div className="flex gap-1 mb-1.5">
                    {[1, 2, 3, 4].map((level) => (
                      <div
                        key={level}
                        className={`h-1 flex-1 rounded-full transition-all duration-300 ${
                          level <= passwordStrength.score
                            ? strengthColors[passwordStrength.score]
                            : 'bg-white/[0.06]'
                        }`}
                      />
                    ))}
                  </div>
                  <div className="flex items-center justify-between">
                    <p className={`text-[11px] font-medium ${strengthTextColors[passwordStrength.score]}`}>
                      {strengthLabels[passwordStrength.score] || passwordStrength.label}
                    </p>
                    {passwordStrength.failures.length > 0 && (
                      <p className="text-[10px] text-gray-600">
                        Needs: {passwordStrength.failures.slice(0, 2).join(', ')}
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>

            <button
              type="submit"
              id="reg-submit"
              disabled={loading || lockoutMs > 0}
              className="w-full flex items-center justify-center gap-2.5 bg-sky-500 text-black py-3.5 rounded-xl font-bold hover:bg-sky-400 disabled:opacity-60 disabled:cursor-not-allowed transition-all glow-green mt-2 text-sm"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              {lockoutMs > 0
                ? `Locked — wait ${formatLockoutTime(lockoutMs)}`
                : loading
                ? 'Creating account...'
                : 'Create Account'}
            </button>

            <p className="text-center text-gray-600 text-xs mt-3">
              By signing up, you agree to our{' '}
              <span className="text-gray-400 underline cursor-pointer hover:text-white transition-colors">Terms of Service</span>
              {' '}and{' '}
              <span className="text-gray-400 underline cursor-pointer hover:text-white transition-colors">Privacy Policy</span>.
            </p>
          </form>

          <p className="text-center mt-5 text-gray-600 text-sm">
            Already have an account?{' '}
            <Link to="/login" className="text-sky-400 font-semibold hover:text-sky-300 transition-colors">
              Sign in
            </Link>
          </p>
        </motion.div>
      </div>
    </div>
  );
}
