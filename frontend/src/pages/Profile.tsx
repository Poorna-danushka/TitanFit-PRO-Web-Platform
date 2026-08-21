import { useState, useEffect } from 'react';
import { authAPI } from '../api/apiService';
import { useAuth } from '../context/AuthContext';
import {
  User, Scale, Ruler, Calendar, Edit3, Check, X, Loader2,
  TrendingUp, Phone, ShieldCheck, Crown, Award, UserCheck, Mail, FileText
} from 'lucide-react';
import { motion } from 'framer-motion';

export default function Profile() {
  // Seed the profile with whatever the AuthContext already has, so there's
  // never a blank flash even if the API is slow or the session is cookie-only.
  const { user: ctxUser, updateUser } = useAuth();

  const [profile, setProfile] = useState<any>(ctxUser || null);
  const [formData, setFormData] = useState({
    name:        (ctxUser as any)?.name        || '',
    phone:       (ctxUser as any)?.phone       || '',
    bio:         (ctxUser as any)?.bio         || '',
    gender:      (ctxUser as any)?.gender      || '',
    dateOfBirth: (ctxUser as any)?.dateOfBirth ? String((ctxUser as any).dateOfBirth).split('T')[0] : '',
    weight:      (ctxUser as any)?.weight      ? String((ctxUser as any).weight) : '',
    height:      (ctxUser as any)?.height      ? String((ctxUser as any).height) : '',
  });
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Fetch fresh user data from API on mount
  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const res = await authAPI.getMe();
        const u = res.data.user;
        setProfile(u);
        setFormData({
          name:        u.name        || '',
          phone:       u.phone       || '',
          bio:         u.bio         || '',
          gender:      u.gender      || '',
          dateOfBirth: u.dateOfBirth ? String(u.dateOfBirth).split('T')[0] : '',
          weight:      u.weight      ? String(u.weight) : '',
          height:      u.height      ? String(u.height) : '',
        });
      } catch (err) {
        console.warn('Profile API failed, using AuthContext data:', err);
        // We already seeded from AuthContext — just continue showing that.
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      setMessage({ type: 'error', text: 'Full name is required.' });
      return;
    }
    setSaving(true);
    try {
      const res = await authAPI.updateProfile({
        name:        formData.name.trim(),
        phone:       formData.phone.trim() || undefined,
        bio:         formData.bio.trim()   || undefined,
        gender:      formData.gender       || undefined,
        dateOfBirth: formData.dateOfBirth  || undefined,
        weight:      formData.weight       ? parseInt(formData.weight) : undefined,
        height:      formData.height       ? parseInt(formData.height) : undefined,
      });
      const updated = res.data.user;
      setProfile(updated);
      updateUser(updated);          // keep AuthContext in sync
      setEditing(false);
      setMessage({ type: 'success', text: 'Profile updated successfully!' });
      setTimeout(() => setMessage(null), 3000);
    } catch (err: any) {
      setMessage({ type: 'error', text: err?.response?.data?.message || err?.safeMessage || 'Failed to save changes.' });
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setEditing(false);
    if (profile) {
      setFormData({
        name:        profile.name        || '',
        phone:       profile.phone       || '',
        bio:         profile.bio         || '',
        gender:      profile.gender      || '',
        dateOfBirth: profile.dateOfBirth ? String(profile.dateOfBirth).split('T')[0] : '',
        weight:      profile.weight      ? String(profile.weight) : '',
        height:      profile.height      ? String(profile.height) : '',
      });
    }
  };

  // ─── Derived role info ───────────────────────────────────────────────────────
  const uRole      = ((profile?.role || ctxUser?.role || 'MEMBER')).toUpperCase();
  const isSysAdmin = profile?.isSystemAdmin || ctxUser?.isSystemAdmin || uRole === 'SYSTEM_ADMIN';
  const isAdmin    = uRole === 'ADMIN' || isSysAdmin;

  const displayName = profile?.name || ctxUser?.name || '—';
  const displayEmail = profile?.email || ctxUser?.email || '—';

  // ─── BMI ─────────────────────────────────────────────────────────────────────
  const bmi = formData.weight && formData.height
    ? parseFloat((parseInt(formData.weight) / Math.pow(parseInt(formData.height) / 100, 2)).toFixed(1))
    : null;

  const getBmiCategory = (v: number) => {
    if (v < 18.5) return { label: 'Underweight', color: 'text-blue-400',   bg: 'bg-blue-500/10',   border: 'border-blue-500/20' };
    if (v < 25)   return { label: 'Healthy',     color: 'text-green-400',  bg: 'bg-green-500/10',  border: 'border-green-500/20' };
    if (v < 30)   return { label: 'Overweight',  color: 'text-yellow-400', bg: 'bg-yellow-500/10', border: 'border-yellow-500/20' };
    return               { label: 'Obese',       color: 'text-red-400',    bg: 'bg-red-500/10',    border: 'border-red-500/20' };
  };
  const bmiCategory = bmi ? getBmiCategory(bmi) : null;

  // ─── Avatar colour ──────────────────────────────────────────────────────────
  const avatarClass = isSysAdmin  ? 'from-amber-400 to-amber-600 text-black  ring-4 ring-amber-400/30'
    : isAdmin       ? 'from-purple-500 to-purple-700 text-white  ring-4 ring-purple-500/30'
    : uRole === 'STAFF'   ? 'from-blue-500  to-blue-700  text-white  ring-4 ring-blue-500/30'
    : uRole === 'TRAINER' ? 'from-emerald-500 to-emerald-700 text-black ring-4 ring-emerald-500/30'
    :                       'from-green-400 to-green-600 text-black  ring-4 ring-green-400/30';

  const roleBadge = isSysAdmin  ? { label: 'System Admin',  color: 'text-amber-400',   bg: 'bg-amber-500/10',  border: 'border-amber-500/30',  dot: 'bg-amber-400',  icon: <Crown className="w-3.5 h-3.5" /> }
    : isAdmin       ? { label: 'Administrator', color: 'text-purple-400', bg: 'bg-purple-500/10', border: 'border-purple-500/20', dot: 'bg-purple-400', icon: <ShieldCheck className="w-3.5 h-3.5" /> }
    : uRole === 'STAFF'   ? { label: 'Desk Staff',    color: 'text-blue-400',   bg: 'bg-blue-500/10',   border: 'border-blue-500/20',   dot: 'bg-blue-400',   icon: <UserCheck className="w-3.5 h-3.5" /> }
    : uRole === 'TRAINER' ? { label: 'Fitness Coach', color: 'text-emerald-400',bg: 'bg-emerald-500/10',border: 'border-emerald-500/20', dot: 'bg-emerald-400',icon: <Award className="w-3.5 h-3.5" /> }
    :                       { label: 'Gym Member',    color: 'text-green-400',  bg: 'bg-green-500/10',  border: 'border-green-500/20',  dot: 'bg-green-400',  icon: <User className="w-3.5 h-3.5" /> };

  // ─── Loading state ──────────────────────────────────────────────────────────
  if (loading && !profile && !ctxUser) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 text-green-500 animate-spin" />
          <p className="text-gray-500 text-sm">Loading your profile...</p>
        </div>
      </div>
    );
  }

  const joinedDate = (profile?.createdAt || ctxUser?.createdAt)
    ? new Date(profile?.createdAt || ctxUser?.createdAt!).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
    : '—';

  return (
    <div className="pb-12 max-w-4xl mx-auto text-white space-y-6">
      {/* Header */}
      <div>
        <h1 className="font-display text-3xl md:text-4xl font-bold text-white mb-1">User Profile</h1>
        <p className="text-gray-400 text-sm">View and update your account details, contact information, and body metrics.</p>
      </div>

      {/* Toast message */}
      {message && (
        <motion.div
          initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
          className={`flex items-center gap-3 px-5 py-3.5 rounded-xl border text-sm font-medium ${
            message.type === 'success'
              ? 'bg-green-500/10 border-green-500/20 text-green-400'
              : 'bg-red-500/10 border-red-500/20 text-red-400'
          }`}
        >
          {message.type === 'success' ? <Check className="w-4 h-4 shrink-0" /> : <X className="w-4 h-4 shrink-0" />}
          {message.text}
        </motion.div>
      )}

      <div className="grid lg:grid-cols-3 gap-6">
        {/* ─── Left: Avatar & Role Card ───────────────────────────────────── */}
        <div className="space-y-5">
          <motion.div
            initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
            className="bg-[#111113]/80 backdrop-blur-md border border-white/10 rounded-3xl p-6 text-center shadow-2xl"
          >
            {/* Avatar */}
            <div className={`w-24 h-24 rounded-2xl bg-gradient-to-br ${avatarClass} flex items-center justify-center font-bold text-4xl font-display mx-auto mb-4 shadow-2xl`}>
              {displayName.charAt(0).toUpperCase()}
            </div>

            <h2 className="font-display text-2xl font-bold text-white mb-2">{displayName}</h2>

            {/* Role badge */}
            <div className="flex justify-center mb-4">
              <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-extrabold uppercase tracking-wider border ${roleBadge.bg} ${roleBadge.color} ${roleBadge.border}`}>
                {roleBadge.icon}
                {roleBadge.label}
              </span>
            </div>

            {/* Joined date */}
            <div className="flex items-center justify-center gap-2 text-xs text-gray-400 bg-white/[0.03] rounded-xl py-2 px-3 border border-white/5">
              <Calendar className="w-3.5 h-3.5 text-gray-500" />
              Joined {joinedDate}
            </div>
          </motion.div>

          {/* BMI Card (visible when weight + height set) */}
          {bmi && bmiCategory && (
            <motion.div
              initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
              className={`bg-[#111113]/80 border rounded-3xl p-5 ${bmiCategory.border}`}
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-gray-400" />
                  <span className="text-xs font-bold uppercase tracking-wider text-gray-400">BMI</span>
                </div>
                <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full ${bmiCategory.bg} ${bmiCategory.color}`}>
                  {bmiCategory.label}
                </span>
              </div>
              <p className={`font-display text-5xl font-bold ${bmiCategory.color}`}>{bmi}</p>
              <div className="mt-4 h-2 rounded-full bg-white/[0.06] overflow-hidden">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-blue-500 via-green-500 via-yellow-500 to-red-500"
                  style={{ width: `${Math.min(((bmi - 15) / 25) * 100, 100)}%` }}
                />
              </div>
            </motion.div>
          )}
        </div>

        {/* ─── Right: Info / Edit Form ─────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
          className="lg:col-span-2 bg-[#111113]/80 backdrop-blur-md border border-white/10 rounded-3xl p-6 md:p-8 shadow-2xl"
        >
          <div className="flex items-center justify-between mb-8 pb-4 border-b border-white/10">
            <div>
              <h3 className="font-display text-xl font-bold text-white">Profile Information</h3>
              <p className="text-gray-500 text-xs mt-0.5">Your personal details and account credentials</p>
            </div>
            {!editing && (
              <button
                onClick={() => setEditing(true)}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/[0.05] border border-white/10 text-xs font-bold text-gray-200 hover:text-white hover:bg-white/10 transition-all"
              >
                <Edit3 className="w-4 h-4" /> Edit Profile
              </button>
            )}
          </div>

          {editing ? (
            /* ─── Edit form ─── */
            <form onSubmit={handleSubmit} className="space-y-5">
              {[
                { label: 'Full Name', name: 'name', type: 'text', icon: <User className="w-4 h-4 text-gray-600" />, placeholder: 'Your full name', required: true },
                { label: 'Contact Number', name: 'phone', type: 'tel', icon: <Phone className="w-4 h-4 text-gray-600" />, placeholder: '+94 77 123 4567', required: false },
              ].map(f => (
                <div key={f.name}>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-2">
                    {f.label} {f.required && <span className="text-red-400">*</span>}
                  </label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2">{f.icon}</span>
                    <input
                      type={f.type}
                      name={f.name}
                      value={(formData as any)[f.name]}
                      onChange={handleChange}
                      placeholder={f.placeholder}
                      className="w-full px-4 py-3 pl-10 bg-gray-900/80 border border-gray-800 rounded-xl text-sm text-white focus:outline-none focus:border-green-500/60 transition-colors"
                    />
                  </div>
                </div>
              ))}

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-2">
                  Bio / About
                </label>
                <div className="relative">
                  <FileText className="absolute left-3.5 top-3.5 w-4 h-4 text-gray-600" />
                  <textarea
                    name="bio"
                    value={formData.bio}
                    onChange={handleChange}
                    rows={3}
                    placeholder="Tell us about yourself..."
                    className="w-full px-4 py-3 pl-10 bg-gray-900/80 border border-gray-800 rounded-xl text-sm text-white focus:outline-none focus:border-green-500/60 transition-colors resize-none"
                  />
                </div>
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-2">Weight (kg)</label>
                  <div className="relative">
                    <Scale className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-600" />
                    <input type="number" name="weight" value={formData.weight} onChange={handleChange} placeholder="e.g. 75"
                      className="w-full px-4 py-3 pl-10 bg-gray-900/80 border border-gray-800 rounded-xl text-sm text-white focus:outline-none focus:border-green-500/60 transition-colors"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-2">Height (cm)</label>
                  <div className="relative">
                    <Ruler className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-600" />
                    <input type="number" name="height" value={formData.height} onChange={handleChange} placeholder="e.g. 175"
                      className="w-full px-4 py-3 pl-10 bg-gray-900/80 border border-gray-800 rounded-xl text-sm text-white focus:outline-none focus:border-green-500/60 transition-colors"
                    />
                  </div>
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button type="submit" disabled={saving}
                  className="flex-1 flex items-center justify-center gap-2 bg-green-500 text-black py-3 rounded-xl font-bold text-sm hover:bg-green-400 disabled:opacity-60 transition-all"
                >
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                  {saving ? 'Saving...' : 'Save Changes'}
                </button>
                <button type="button" onClick={handleCancel}
                  className="flex-1 flex items-center justify-center gap-2 bg-white/[0.05] border border-white/10 py-3 rounded-xl font-semibold text-sm text-gray-400 hover:text-white hover:bg-white/10 transition-all"
                >
                  <X className="w-4 h-4" /> Cancel
                </button>
              </div>
            </form>
          ) : (
            /* ─── Read-only view ─── */
            <div className="space-y-0">
              {[
                { label: 'Email Address',  value: displayEmail,                                                       icon: <Mail className="w-4 h-4 text-gray-500" /> },
                { label: 'Full Name',      value: displayName,                                                        icon: <User className="w-4 h-4 text-gray-500" /> },
                { label: 'Contact Number', value: profile?.phone || ctxUser?.phone || null,                           icon: <Phone className="w-4 h-4 text-green-400" /> },
                { label: 'Account Role',   value: isSysAdmin ? 'SYSTEM_ADMIN' : uRole,                               icon: <ShieldCheck className="w-4 h-4 text-purple-400" /> },
                { label: 'Bio / Notes',    value: profile?.bio || null,                                               icon: <FileText className="w-4 h-4 text-gray-500" /> },
                { label: 'Body Weight',    value: profile?.weight ? `${profile.weight} kg` : null,                   icon: <Scale className="w-4 h-4 text-blue-400" /> },
                { label: 'Height',         value: profile?.height ? `${profile.height} cm` : null,                   icon: <Ruler className="w-4 h-4 text-emerald-400" /> },
              ].map((field, i) => (
                <div key={i} className="flex items-center justify-between py-4 border-b border-white/[0.04] last:border-0">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-widest text-gray-500 mb-1">{field.label}</p>
                    <p className="text-white font-medium text-sm">
                      {field.value || <span className="text-gray-600 italic text-xs">Not set — click Edit Profile to add</span>}
                    </p>
                  </div>
                  <span className="opacity-60">{field.icon}</span>
                </div>
              ))}
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
}