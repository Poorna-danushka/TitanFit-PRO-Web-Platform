import { useState, useEffect, useRef } from 'react';
import { authAPI } from '../api/apiService';
import { useAuth } from '../context/AuthContext';
import {
  User, Scale, Ruler, Calendar, Edit3, Check, X, Loader2,
  TrendingUp, Phone, ShieldCheck, Crown, Award, UserCheck, Mail, FileText,
  Camera, Trash2, Activity, Lock, Sparkles, HeartPulse, CheckCircle2, AlertCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import BackButton from '../components/BackButton';

export default function Profile() {
  const { user: ctxUser, updateUser } = useAuth();

  const [profile, setProfile] = useState<any>(ctxUser || null);
  const [activeTab, setActiveTab] = useState<'personal' | 'fitness' | 'account'>('personal');
  const [formData, setFormData] = useState({
    name:        (ctxUser as any)?.name        || '',
    phone:       (ctxUser as any)?.phone       || '',
    bio:         (ctxUser as any)?.bio         || '',
    gender:      (ctxUser as any)?.gender      || '',
    dateOfBirth: (ctxUser as any)?.dateOfBirth ? String((ctxUser as any).dateOfBirth).split('T')[0] : '',
    weight:      (ctxUser as any)?.weight      ? String((ctxUser as any).weight) : '',
    height:      (ctxUser as any)?.height      ? String((ctxUser as any).height) : '',
  });

  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fetch fresh user data on mount
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
        console.warn('Profile API failed, using AuthContext:', err);
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
        weight:      formData.weight       ? parseFloat(formData.weight) : undefined,
        height:      formData.height       ? parseFloat(formData.height) : undefined,
      });
      const updated = res.data.user;
      setProfile(updated);
      updateUser(updated);
      setEditing(false);
      setMessage({ type: 'success', text: 'Profile updated successfully!' });
      setTimeout(() => setMessage(null), 3500);
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

  const handleImageFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setMessage({ type: 'error', text: 'Please select a valid image file.' });
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setMessage({ type: 'error', text: 'Image file size must be less than 5MB.' });
      return;
    }

    setUploadingImage(true);
    setMessage(null);

    try {
      const data = new FormData();
      data.append('avatar', file);

      const res = await authAPI.uploadAvatar(data);
      const updatedUser = res.data.user;
      setProfile(updatedUser);
      updateUser(updatedUser);
      setMessage({ type: 'success', text: 'Profile photo updated successfully!' });
      setTimeout(() => setMessage(null), 3500);
    } catch (err: any) {
      setMessage({ type: 'error', text: err?.response?.data?.message || err?.safeMessage || 'Failed to upload photo.' });
    } finally {
      setUploadingImage(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleImageDelete = async () => {
    setUploadingImage(true);
    setMessage(null);
    try {
      const res = await authAPI.deleteAvatar();
      const updatedUser = { ...res.data.user, profileImage: null };
      setProfile(updatedUser);
      updateUser(updatedUser);
      setMessage({ type: 'success', text: 'Profile photo removed.' });
      setTimeout(() => setMessage(null), 3500);
    } catch (err: any) {
      setMessage({ type: 'error', text: err?.response?.data?.message || err?.safeMessage || 'Failed to remove photo.' });
    } finally {
      setUploadingImage(false);
    }
  };

  // Role info helper
  const uRole = ((profile?.role || ctxUser?.role || 'MEMBER')).toUpperCase();
  const isSysAdmin = profile?.isSystemAdmin || ctxUser?.isSystemAdmin || uRole === 'SYSTEM_ADMIN';

  const roleBadgeMap: Record<string, { label: string; bg: string; color: string; border: string; icon: React.ReactNode }> = {
    SYSTEM_ADMIN: { label: 'System Admin', bg: 'bg-purple-500/10', color: 'text-purple-400', border: 'border-purple-500/30', icon: <Crown className="w-3.5 h-3.5" /> },
    ADMIN:        { label: 'Admin',        bg: 'bg-blue-500/10',   color: 'text-blue-400',   border: 'border-blue-500/30',   icon: <ShieldCheck className="w-3.5 h-3.5" /> },
    TRAINER:      { label: 'Trainer',      bg: 'bg-amber-500/10',  color: 'text-amber-400',  border: 'border-amber-500/30',  icon: <Award className="w-3.5 h-3.5" /> },
    STAFF:        { label: 'Staff',        bg: 'bg-cyan-500/10',   color: 'text-cyan-400',   border: 'border-cyan-500/30',   icon: <UserCheck className="w-3.5 h-3.5" /> },
    MEMBER:       { label: 'Member',       bg: 'bg-green-500/10',  color: 'text-green-400',  border: 'border-green-500/30',  icon: <User className="w-3.5 h-3.5" /> },
  };

  const roleBadge = isSysAdmin ? roleBadgeMap.SYSTEM_ADMIN : (roleBadgeMap[uRole] || roleBadgeMap.MEMBER);

  // Avatar background colors
  const avatarGradients: Record<string, string> = {
    SYSTEM_ADMIN: 'from-purple-600 via-pink-600 to-indigo-600 text-white',
    ADMIN:        'from-blue-600 to-cyan-600 text-white',
    TRAINER:      'from-amber-500 to-orange-600 text-black',
    STAFF:        'from-cyan-500 to-teal-600 text-black',
    MEMBER:       'from-green-400 to-emerald-600 text-black',
  };
  const avatarClass = isSysAdmin ? avatarGradients.SYSTEM_ADMIN : (avatarGradients[uRole] || avatarGradients.MEMBER);

  // BMI calculations
  const weightNum = parseFloat(formData.weight || profile?.weight || '0');
  const heightNum = parseFloat(formData.height || profile?.height || '0');
  let bmi: number | null = null;
  if (weightNum > 0 && heightNum > 0) {
    const hM = heightNum / 100;
    bmi = parseFloat((weightNum / (hM * hM)).toFixed(1));
  }

  const getBmiCategory = (val: number) => {
    if (val < 18.5) return { label: 'Underweight', color: 'text-blue-400', bg: 'bg-blue-500/10', border: 'border-blue-500/20' };
    if (val < 25.0) return { label: 'Normal Weight', color: 'text-green-400', bg: 'bg-green-500/10', border: 'border-green-500/20' };
    if (val < 30.0) return { label: 'Overweight', color: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/20' };
    return { label: 'Obese', color: 'text-red-400', bg: 'bg-red-500/10', border: 'border-red-500/20' };
  };

  const bmiCategory = bmi ? getBmiCategory(bmi) : null;

  const displayName   = profile?.name  || ctxUser?.name  || 'User';
  const displayEmail  = profile?.email || ctxUser?.email || '—';
  const currentAvatar = profile ? profile.profileImage : ctxUser?.profileImage;

  const joinedDate = profile?.createdAt
    ? new Date(profile.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'short' })
    : '—';

  return (
    <div className="pb-16 max-w-5xl mx-auto text-white space-y-8">
      <div className="flex items-center justify-between">
        <BackButton fallbackPath="/dashboard" />
      </div>

      {/* ─── Hidden file input ─── */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleImageFileChange}
        accept="image/jpeg,image/png,image/webp,image/gif"
        className="hidden"
      />

      {/* ─── Hero Profile Header Banner ─── */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative rounded-3xl overflow-hidden bg-gradient-to-br from-[#181920] via-[#121318] to-[#0d0e12] border border-white/10 shadow-2xl p-6 md:p-8"
      >
        <div className="absolute top-0 right-0 w-96 h-96 bg-green-500/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />

        <div className="relative z-10 flex flex-col md:flex-row items-center md:items-start gap-6 text-center md:text-left">
          {/* Avatar Ring */}
          <div className="relative group shrink-0">
            <div className={`w-32 h-32 rounded-3xl overflow-hidden bg-gradient-to-br ${avatarClass} flex items-center justify-center font-bold text-5xl font-display shadow-[0_0_30px_rgba(34,197,94,0.2)] border-2 border-white/20 transition-transform duration-300 group-hover:scale-[1.02]`}>
              {currentAvatar ? (
                <img src={currentAvatar} alt={displayName} className="w-full h-full object-cover" />
              ) : (
                displayName.charAt(0).toUpperCase()
              )}
            </div>

            {/* Upload Spinner Overlay */}
            {uploadingImage ? (
              <div className="absolute inset-0 bg-black/75 backdrop-blur-sm rounded-3xl flex items-center justify-center">
                <Loader2 className="w-7 h-7 text-green-400 animate-spin" />
              </div>
            ) : (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="absolute inset-0 bg-black/60 backdrop-blur-[2px] opacity-0 group-hover:opacity-100 transition-all duration-200 rounded-3xl flex flex-col items-center justify-center gap-1 text-white cursor-pointer"
                title="Change profile image"
              >
                <Camera className="w-7 h-7 text-green-400" />
                <span className="text-[10px] font-bold tracking-wider uppercase text-gray-200">Change Photo</span>
              </button>
            )}

            {/* Quick remove trigger if avatar present */}
            {currentAvatar && !uploadingImage && (
              <button
                type="button"
                onClick={handleImageDelete}
                className="absolute -bottom-2 -right-2 p-2 rounded-xl bg-red-500/80 hover:bg-red-600 text-white shadow-lg backdrop-blur-md transition-transform hover:scale-110"
                title="Remove photo"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* User Info Details */}
          <div className="flex-1 space-y-3 min-w-0">
            <div className="flex flex-wrap items-center justify-center md:justify-start gap-3">
              <h1 className="font-display text-3xl md:text-4xl font-extrabold text-white tracking-tight">{displayName}</h1>
              <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-extrabold uppercase tracking-wider border ${roleBadge.bg} ${roleBadge.color} ${roleBadge.border}`}>
                {roleBadge.icon}
                {roleBadge.label}
              </span>
            </div>

            <p className="text-gray-400 text-sm flex items-center justify-center md:justify-start gap-2">
              <Mail className="w-4 h-4 text-green-400 shrink-0" />
              <span className="truncate">{displayEmail}</span>
            </p>

            <div className="flex flex-wrap items-center justify-center md:justify-start gap-4 pt-1 text-xs text-gray-400">
              <div className="flex items-center gap-1.5 bg-white/[0.04] px-3 py-1.5 rounded-xl border border-white/5">
                <Calendar className="w-3.5 h-3.5 text-gray-400" />
                <span>Joined {joinedDate}</span>
              </div>
              <div className="flex items-center gap-1.5 bg-white/[0.04] px-3 py-1.5 rounded-xl border border-white/5">
                <ShieldCheck className="w-3.5 h-3.5 text-green-400" />
                <span className="text-green-300 font-semibold">Account Verified</span>
              </div>
            </div>
          </div>

          {/* Quick Action Button */}
          <div className="shrink-0 flex flex-col gap-2">
            {!editing ? (
              <button
                onClick={() => setEditing(true)}
                className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-2xl bg-gradient-to-r from-green-500 to-emerald-600 text-black font-bold text-xs hover:from-green-400 hover:to-emerald-500 transition-all shadow-[0_0_20px_rgba(34,197,94,0.3)]"
              >
                <Edit3 className="w-4 h-4" /> Edit Profile
              </button>
            ) : (
              <button
                onClick={handleCancel}
                className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-2xl bg-white/[0.06] border border-white/10 text-gray-300 font-bold text-xs hover:bg-white/10 hover:text-white transition-all"
              >
                <X className="w-4 h-4" /> Cancel Editing
              </button>
            )}
          </div>
        </div>
      </motion.div>

      {/* ─── Notification / Alert Toast ─── */}
      <AnimatePresence>
        {message && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className={`flex items-center justify-between px-6 py-4 rounded-2xl border text-sm font-semibold backdrop-blur-md shadow-lg ${
              message.type === 'success'
                ? 'bg-green-500/10 border-green-500/30 text-green-300'
                : 'bg-red-500/10 border-red-500/30 text-red-300'
            }`}
          >
            <div className="flex items-center gap-3">
              {message.type === 'success' ? <CheckCircle2 className="w-5 h-5 text-green-400 shrink-0" /> : <AlertCircle className="w-5 h-5 text-red-400 shrink-0" />}
              <span>{message.text}</span>
            </div>
            <button onClick={() => setMessage(null)} className="opacity-60 hover:opacity-100">
              <X className="w-4 h-4" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ─── Navigation Tabs ─── */}
      <div className="flex items-center gap-2 border-b border-white/10 pb-3 overflow-x-auto">
        {[
          { id: 'personal', label: 'Personal Information', icon: <User className="w-4 h-4" /> },
          { id: 'fitness',  label: 'Body Metrics & BMI',  icon: <HeartPulse className="w-4 h-4" /> },
          { id: 'account',  label: 'Account Security',    icon: <Lock className="w-4 h-4" /> },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-2xl text-xs font-bold transition-all whitespace-nowrap ${
              activeTab === tab.id
                ? 'bg-green-500 text-black shadow-[0_0_15px_rgba(34,197,94,0.3)]'
                : 'bg-white/[0.03] text-gray-400 border border-white/5 hover:bg-white/10 hover:text-white'
            }`}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {/* ─── Main Content Body ─── */}
      <motion.div
        key={activeTab + (editing ? '-edit' : '-view')}
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
        className="bg-[#121318]/90 backdrop-blur-xl border border-white/10 rounded-3xl p-6 md:p-8 shadow-2xl space-y-6"
      >
        {/* ─── TAB 1: PERSONAL INFO ───────────────────────────────────── */}
        {activeTab === 'personal' && (
          <div>
            {editing ? (
              /* Edit Form */
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid sm:grid-cols-2 gap-5">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-gray-400 mb-2">
                      Full Name <span className="text-red-400">*</span>
                    </label>
                    <div className="relative">
                      <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                      <input
                        type="text"
                        name="name"
                        value={formData.name}
                        onChange={handleChange}
                        placeholder="John Doe"
                        className="w-full px-4 py-3 pl-10 bg-gray-900/90 border border-gray-800 rounded-xl text-sm text-white focus:outline-none focus:border-green-500 transition-colors"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-gray-400 mb-2">
                      Contact Number
                    </label>
                    <div className="relative">
                      <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                      <input
                        type="tel"
                        name="phone"
                        value={formData.phone}
                        onChange={handleChange}
                        placeholder="+94 77 123 4567"
                        className="w-full px-4 py-3 pl-10 bg-gray-900/90 border border-gray-800 rounded-xl text-sm text-white focus:outline-none focus:border-green-500 transition-colors"
                      />
                    </div>
                  </div>
                </div>

                <div className="grid sm:grid-cols-2 gap-5">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-gray-400 mb-2">Gender</label>
                    <select
                      name="gender"
                      value={formData.gender}
                      onChange={handleChange}
                      className="w-full px-4 py-3 bg-gray-900/90 border border-gray-800 rounded-xl text-sm text-white focus:outline-none focus:border-green-500 transition-colors"
                    >
                      <option value="">Select Gender</option>
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-gray-400 mb-2">Date of Birth</label>
                    <input
                      type="date"
                      name="dateOfBirth"
                      value={formData.dateOfBirth}
                      onChange={handleChange}
                      className="w-full px-4 py-3 bg-gray-900/90 border border-gray-800 rounded-xl text-sm text-white focus:outline-none focus:border-green-500 transition-colors"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-gray-400 mb-2">Bio / About Me</label>
                  <div className="relative">
                    <FileText className="absolute left-3.5 top-3.5 w-4 h-4 text-gray-500" />
                    <textarea
                      name="bio"
                      value={formData.bio}
                      onChange={handleChange}
                      rows={3}
                      placeholder="Tell us about your fitness journey and goals..."
                      className="w-full px-4 py-3 pl-10 bg-gray-900/90 border border-gray-800 rounded-xl text-sm text-white focus:outline-none focus:border-green-500 transition-colors resize-none"
                    />
                  </div>
                </div>

                <div className="flex gap-4 pt-2">
                  <button
                    type="submit"
                    disabled={saving}
                    className="flex-1 flex items-center justify-center gap-2 bg-gradient-to-r from-green-500 to-emerald-600 text-black py-3 rounded-xl font-bold text-xs hover:from-green-400 hover:to-emerald-500 disabled:opacity-60 transition-all shadow-lg"
                  >
                    {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                    {saving ? 'Saving Changes...' : 'Save Profile'}
                  </button>
                  <button
                    type="button"
                    onClick={handleCancel}
                    className="flex-1 flex items-center justify-center gap-2 bg-white/[0.05] border border-white/10 py-3 rounded-xl font-bold text-xs text-gray-300 hover:text-white hover:bg-white/10 transition-all"
                  >
                    <X className="w-4 h-4" /> Cancel
                  </button>
                </div>
              </form>
            ) : (
              /* View Mode */
              <div className="grid sm:grid-cols-2 gap-6">
                {[
                  { label: 'Full Name',      value: displayName,                          icon: <User className="w-4 h-4 text-green-400" /> },
                  { label: 'Email Address',  value: displayEmail,                         icon: <Mail className="w-4 h-4 text-blue-400" /> },
                  { label: 'Contact Number', value: profile?.phone || 'Not provided',     icon: <Phone className="w-4 h-4 text-cyan-400" /> },
                  { label: 'Gender',         value: profile?.gender || 'Not specified',   icon: <Activity className="w-4 h-4 text-purple-400" /> },
                  { label: 'Date of Birth',  value: profile?.dateOfBirth ? String(profile.dateOfBirth).split('T')[0] : 'Not specified', icon: <Calendar className="w-4 h-4 text-amber-400" /> },
                  { label: 'Account Role',   value: roleBadge.label,                      icon: <ShieldCheck className="w-4 h-4 text-emerald-400" /> },
                ].map((item, idx) => (
                  <div key={idx} className="p-4 rounded-2xl bg-white/[0.02] border border-white/5 flex items-start gap-4">
                    <div className="p-2.5 rounded-xl bg-white/[0.04] border border-white/5 shrink-0">
                      {item.icon}
                    </div>
                    <div>
                      <p className="text-[11px] font-bold uppercase tracking-wider text-gray-400 mb-0.5">{item.label}</p>
                      <p className="font-semibold text-white text-sm">{item.value}</p>
                    </div>
                  </div>
                ))}

                <div className="sm:col-span-2 p-4 rounded-2xl bg-white/[0.02] border border-white/5 flex items-start gap-4">
                  <div className="p-2.5 rounded-xl bg-white/[0.04] border border-white/5 shrink-0">
                    <FileText className="w-4 h-4 text-green-400" />
                  </div>
                  <div>
                    <p className="text-[11px] font-bold uppercase tracking-wider text-gray-400 mb-0.5">Bio / Notes</p>
                    <p className="text-sm text-gray-300">{profile?.bio || 'No bio added yet.'}</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ─── TAB 2: BODY METRICS & BMI ─────────────────────────────────── */}
        {activeTab === 'fitness' && (
          <div className="space-y-6">
            <div className="grid md:grid-cols-2 gap-6">
              <div className="p-6 rounded-2xl bg-gradient-to-br from-blue-500/10 to-transparent border border-blue-500/20 space-y-4">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-blue-500/20 text-blue-400">
                    <Scale className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wider text-gray-400">Body Weight</p>
                    <p className="font-display text-3xl font-extrabold text-white">
                      {formData.weight || profile?.weight ? `${formData.weight || profile.weight} kg` : '—'}
                    </p>
                  </div>
                </div>
                <p className="text-xs text-gray-400">Keep your body weight metrics accurate for personalized calorie recommendations.</p>
              </div>

              <div className="p-6 rounded-2xl bg-gradient-to-br from-emerald-500/10 to-transparent border border-emerald-500/20 space-y-4">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-emerald-500/20 text-emerald-400">
                    <Ruler className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wider text-gray-400">Height</p>
                    <p className="font-display text-3xl font-extrabold text-white">
                      {formData.height || profile?.height ? `${formData.height || profile.height} cm` : '—'}
                    </p>
                  </div>
                </div>
                <p className="text-xs text-gray-400">Your height is used to calculate your precise Body Mass Index (BMI).</p>
              </div>
            </div>

            {/* Interactive BMI Card */}
            {bmi && bmiCategory ? (
              <div className={`p-6 rounded-3xl border bg-white/[0.02] ${bmiCategory.border} space-y-4`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-gray-400" />
                    <span className="text-xs font-bold uppercase tracking-wider text-gray-300">Body Mass Index (BMI)</span>
                  </div>
                  <span className={`text-xs font-extrabold px-3 py-1 rounded-full border ${bmiCategory.bg} ${bmiCategory.color} ${bmiCategory.border}`}>
                    {bmiCategory.label}
                  </span>
                </div>

                <div className="flex items-baseline gap-3">
                  <span className={`font-display text-6xl font-extrabold ${bmiCategory.color}`}>{bmi}</span>
                  <span className="text-xs text-gray-400">kg/m²</span>
                </div>

                {/* Meter bar */}
                <div className="space-y-1.5">
                  <div className="h-3 rounded-full bg-white/10 overflow-hidden p-0.5">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-blue-500 via-green-500 via-yellow-500 to-red-500 transition-all duration-500"
                      style={{ width: `${Math.min(Math.max(((bmi - 15) / 20) * 100, 5), 100)}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-[10px] font-bold text-gray-500 uppercase tracking-widest pt-1">
                    <span>Underweight (&lt;18.5)</span>
                    <span>Normal (18.5-24.9)</span>
                    <span>Overweight (25-29.9)</span>
                    <span>Obese (30+)</span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-8 text-center rounded-3xl border border-dashed border-white/10 bg-white/[0.01] space-y-3">
                <Sparkles className="w-8 h-8 text-green-400 mx-auto" />
                <p className="text-white font-bold text-sm">Calculate Your BMI</p>
                <p className="text-xs text-gray-400 max-w-sm mx-auto">Click "Edit Profile" above to enter your current weight and height to unlock your automated BMI score.</p>
              </div>
            )}
          </div>
        )}

        {/* ─── TAB 3: ACCOUNT SECURITY ────────────────────────────────────── */}
        {activeTab === 'account' && (
          <div className="space-y-6">
            <div className="p-6 rounded-2xl bg-white/[0.02] border border-white/5 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-purple-500/20 text-purple-400">
                    <Lock className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="font-bold text-sm text-white">Password & Security</p>
                    <p className="text-xs text-gray-400">Manage your account authentication credentials</p>
                  </div>
                </div>
                <span className="text-xs font-bold px-3 py-1 rounded-full bg-green-500/10 text-green-400 border border-green-500/20">
                  Protected
                </span>
              </div>
            </div>

            <div className="p-6 rounded-2xl bg-white/[0.02] border border-white/5 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-cyan-500/20 text-cyan-400">
                    <ShieldCheck className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="font-bold text-sm text-white">Email Verification</p>
                    <p className="text-xs text-gray-400">{displayEmail}</p>
                  </div>
                </div>
                <span className="text-xs font-bold px-3 py-1 rounded-full bg-green-500/10 text-green-400 border border-green-500/20">
                  Verified
                </span>
              </div>
            </div>
          </div>
        )}
      </motion.div>
    </div>
  );
}