import { useState, useEffect } from 'react';
import { adminAPI, userAPI } from '../../api/apiService';
import Pagination from '../../components/Pagination';
import {
  Shield, ShieldAlert, Trash2, Users, AlertTriangle, UserCheck,
  ShieldCheck, X, Crown, Award, UserPlus, Lock, Power, CheckCircle,
  Ban, Phone, Search, Mail
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'react-toastify';
import BackButton from '../../components/BackButton';

export default function ManageUsers() {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  // Search & Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'DEACTIVATED'>('ALL');

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // New User Form State
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [role, setRole] = useState<'MEMBER' | 'STAFF' | 'TRAINER' | 'ADMIN'>('STAFF');
  const [creating, setCreating] = useState(false);
  const [createdResult, setCreatedResult] = useState<{ name: string; email: string; role: string; tempPassword?: string; emailSent?: boolean } | null>(null);

  const { user: currentUser } = useAuth();
  const isSystemAdmin = currentUser?.role === 'SYSTEM_ADMIN' || (currentUser as any)?.isSystemAdmin;

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const res = await adminAPI.getAllUsers();
      setUsers(res.data.users || res.data.data || (Array.isArray(res.data) ? res.data : []));
    } catch (error) {
      console.error(error);
      toast.error('Failed to load user accounts.');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !name.trim()) return;

    if (role === 'ADMIN' && !isSystemAdmin) {
      toast.error('Forbidden. Only System Admin can create new Admin accounts.');
      return;
    }

    setCreating(true);
    try {
      const res = await userAPI.create({
        name,
        email,
        phone,
        role,
      });

      const data = res.data;
      toast.success(data.message || 'User created successfully!');
      setIsCreateModalOpen(false);

      if (data.tempPassword || data.emailSent) {
        setCreatedResult({
          name,
          email,
          role,
          tempPassword: data.tempPassword,
          emailSent: data.emailSent,
        });
      }

      setName('');
      setEmail('');
      setPhone('');
      setRole('STAFF');
      fetchUsers();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || err?.message || 'Failed to create user.');
    } finally {
      setCreating(false);
    }
  };

  const handleRoleToggle = async (userObj: any) => {
    if (userObj._id === currentUser?.id || userObj._id === currentUser?._id) {
      toast.error("You cannot change your own role.");
      return;
    }

    const currentRole = (userObj.role || 'MEMBER').toUpperCase();
    const newRole = currentRole === 'ADMIN' ? 'MEMBER' : 'ADMIN';

    if (newRole === 'ADMIN' && !isSystemAdmin) {
      toast.error('Forbidden. Only System Admin can promote users to Admin role.');
      return;
    }

    try {
      await adminAPI.updateUserRole(userObj._id, newRole);
      toast.success(`User role updated to ${newRole}`);
      fetchUsers();
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Error updating user role');
    }
  };

  const handleToggleStatus = async (userObj: any) => {
    if (userObj._id === currentUser?.id || userObj._id === currentUser?._id) {
      toast.error("You cannot deactivate your own account.");
      return;
    }

    if (userObj.isSystemAdmin || userObj.role === 'SYSTEM_ADMIN') {
      toast.error("System Admin account status cannot be modified.");
      return;
    }

    const currentRole = (userObj.role || 'MEMBER').toUpperCase();
    if (currentRole === 'ADMIN' && !isSystemAdmin) {
      toast.error('Forbidden. Only System Admin can activate or deactivate Admin accounts.');
      return;
    }

    try {
      const res = await userAPI.toggleStatus(userObj._id, !userObj.isActive);
      toast.success(res.data.message || 'User status updated!');
      fetchUsers();
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Error toggling user status');
    }
  };

  const confirmDelete = async () => {
    if (!deleteId) return;
    try {
      await adminAPI.deleteUser(deleteId);
      toast.success('User deleted successfully');
      setDeleteId(null);
      fetchUsers();
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Error deleting user');
    }
  };

  // Filtered Users List
  const filteredUsers = users.filter((u) => {
    const uRole = (u.role || 'MEMBER').toUpperCase();
    const uName = (u.name || `${u.firstName || ''} ${u.lastName || ''}`).toLowerCase();
    const uEmail = (u.email || '').toLowerCase();
    const uPhone = (u.phone || u.phoneNumber || '').toLowerCase();
    const q = searchQuery.toLowerCase().trim();

    const matchesSearch = !q || uName.includes(q) || uEmail.includes(q) || uPhone.includes(q);

    let matchesRole = true;
    if (roleFilter !== 'ALL') {
      if (roleFilter === 'SYSTEM_ADMIN') matchesRole = u.isSystemAdmin || uRole === 'SYSTEM_ADMIN';
      else matchesRole = uRole === roleFilter;
    }

    let matchesStatus = true;
    if (statusFilter === 'ACTIVE') matchesStatus = u.isActive !== false;
    if (statusFilter === 'DEACTIVATED') matchesStatus = u.isActive === false;

    return matchesSearch && matchesRole && matchesStatus;
  });

  const roleCounts = {
    ALL: users.length,
    ADMIN: users.filter(u => (u.role || '').toUpperCase() === 'ADMIN' && !u.isSystemAdmin).length,
    STAFF: users.filter(u => (u.role || '').toUpperCase() === 'STAFF').length,
    TRAINER: users.filter(u => (u.role || '').toUpperCase() === 'TRAINER').length,
    MEMBER: users.filter(u => (u.role || '').toUpperCase() === 'MEMBER').length,
  };

  const totalPages = Math.ceil(filteredUsers.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedUsers = filteredUsers.slice(startIndex, startIndex + itemsPerPage);

  return (
    <div className="pb-16 space-y-8 relative text-white min-h-[85vh]">
      <div className="flex items-center justify-between">
        <BackButton fallbackPath="/admin/dashboard" />
      </div>

      {/* Ambient Backdrop Effects */}
      <div className="absolute top-10 left-10 w-80 h-80 bg-blue-500/10 blur-[130px] rounded-full pointer-events-none -z-10" />
      <div className="absolute top-40 right-10 w-96 h-96 bg-purple-500/10 blur-[130px] rounded-full pointer-events-none -z-10" />

      {/* Header Banner */}
      <motion.div
        initial={{ opacity: 0, y: -16 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 bg-[#0f0e13]/90 backdrop-blur-md p-7 md:p-8 rounded-3xl border border-white/10 shadow-2xl relative overflow-hidden"
      >
        <div className="flex items-center gap-5 relative z-10">
          <div className="w-16 h-16 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center shadow-[0_0_30px_rgba(59,130,246,0.15)] shrink-0">
            <Users className="w-8 h-8 text-blue-400" />
          </div>
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className={`px-3 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded-full border ${
                isSystemAdmin
                  ? 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                  : 'bg-purple-500/10 text-purple-400 border-purple-500/30'
              }`}>
                {isSystemAdmin ? 'System Admin Mode' : 'Standard Admin Mode'}
              </span>
            </div>
            <h1 className="text-3xl font-display font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-white via-gray-100 to-gray-400 tracking-tight">
              Manage Users & Account Roles
            </h1>
            <p className="text-gray-400 text-sm font-medium mt-0.5">
              Create accounts, manage user role permissions, and control active/deactivated user status.
            </p>
          </div>
        </div>

        <div className="relative z-10 flex flex-wrap items-center gap-3">
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="px-5 py-3 bg-gradient-to-r from-emerald-500 to-green-400 text-black font-bold text-xs rounded-xl hover:from-emerald-400 hover:to-green-300 transition-all flex items-center gap-2 shadow-lg shadow-emerald-500/20 active:scale-95"
          >
            <UserPlus className="w-4 h-4" /> Add Staff / Trainer / Member
          </button>

          <div className="bg-white/[0.04] border border-white/10 rounded-xl px-4 py-2.5 flex items-center gap-3">
            <Users className="w-4 h-4 text-blue-400" />
            <div className="flex flex-col">
              <span className="text-[9px] uppercase font-bold text-gray-500 tracking-widest">Total Accounts</span>
              <span className="text-lg font-black text-white">{users.length}</span>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Search & Filter Bar */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.08 }}
        className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4"
      >
        {/* Search input */}
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-gray-500 absolute left-4 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search users by name, email, or phone..."
            className="w-full pl-11 pr-4 py-2.5 rounded-xl bg-[#0f0e13]/80 border border-white/10 text-white text-xs placeholder-gray-500 focus:outline-none focus:border-purple-500 transition-colors"
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white">
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Role Filter Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0 custom-scrollbar">
          {(['ALL', 'ADMIN', 'STAFF', 'TRAINER', 'MEMBER'] as const).map((r) => {
            const isActive = roleFilter === r;
            const count = roleCounts[r];
            return (
              <button
                key={r}
                onClick={() => setRoleFilter(r)}
                className={`px-3 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1.5 border ${
                  isActive
                    ? 'bg-purple-600 text-white border-purple-500 shadow-md shadow-purple-600/20'
                    : 'bg-white/[0.03] text-gray-400 border-white/[0.08] hover:text-white hover:bg-white/[0.06]'
                }`}
              >
                <span>{r === 'ALL' ? 'All Roles' : r}</span>
                <span className={`text-[10px] px-1.5 py-0.2 rounded-md ${isActive ? 'bg-white/20 text-white' : 'bg-white/10 text-gray-400'}`}>
                  {count}
                </span>
              </button>
            );
          })}

          {/* Status Dropdown */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="px-3 py-2 rounded-xl text-xs font-bold bg-[#0f0e13] text-gray-300 border border-white/[0.08] focus:outline-none focus:border-purple-500"
          >
            <option value="ALL">All Status</option>
            <option value="ACTIVE">Active Only</option>
            <option value="DEACTIVATED">Deactivated</option>
          </select>
        </div>
      </motion.div>

      {/* Users Table */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.12 }}>
        <div className="bg-[#0f0e13]/90 backdrop-blur-md border border-white/10 rounded-3xl overflow-hidden shadow-2xl">
          {loading ? (
            <div className="py-20 text-center text-gray-500 space-y-3">
              <div className="w-8 h-8 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="text-xs">Loading accounts...</p>
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="py-20 text-center text-gray-500 space-y-2">
              <Users className="w-10 h-10 text-gray-700 mx-auto" />
              <p className="font-semibold text-sm text-gray-400">No users found matching your filters</p>
              <p className="text-xs text-gray-600">Try adjusting your search query or role filter.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-white/[0.03] border-b border-white/10 text-gray-400 text-xs uppercase tracking-widest font-bold">
                    <th className="p-5 pl-7">User Account</th>
                    <th className="p-5">Contact Details</th>
                    <th className="p-5">Role</th>
                    <th className="p-5">Account Status</th>
                    <th className="p-5 pr-7 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.04]">
                  <AnimatePresence>
                    {paginatedUsers.map((u, i) => {
                      const uRole = (u.role || 'MEMBER').toUpperCase();
                        const isSysAdmin = u.isSystemAdmin || uRole === 'SYSTEM_ADMIN';
                      const isAdmin = uRole === 'ADMIN' || isSysAdmin;
                      const isMe = u._id === currentUser?.id || u._id === currentUser?._id;
                      const isActive = u.isActive !== false;

                      return (
                        <motion.tr
                          key={u._id}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, scale: 0.95 }}
                          transition={{ delay: i * 0.03 }}
                          className={`group hover:bg-white/[0.04] transition-colors ${isMe ? 'bg-purple-500/[0.03]' : ''}`}
                        >
                          {/* User Column */}
                          <td className="p-5 pl-7">
                            <div className="flex items-center gap-3.5">
                              <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm shadow-inner overflow-hidden shrink-0 border ${
                                isSysAdmin
                                  ? 'bg-amber-500/20 text-amber-400 border-amber-500/40'
                                  : isAdmin
                                    ? 'bg-purple-500/20 text-purple-400 border-purple-500/30'
                                    : uRole === 'STAFF'
                                      ? 'bg-blue-500/20 text-blue-400 border-blue-500/30'
                                      : uRole === 'TRAINER'
                                        ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                                        : 'bg-gray-800/80 text-gray-400 border-gray-700'
                              }`}>
                                {u.profileImage ? (
                                  <img src={u.profileImage} alt={u.name || 'User'} className="w-full h-full object-cover" />
                                ) : (
                                  (u.name || u.firstName || 'U').charAt(0).toUpperCase()
                                )}
                              </div>
                              <div className="flex flex-col min-w-0">
                                <span className="font-bold text-gray-200 text-sm flex items-center gap-2 truncate">
                                  {u.name || `${u.firstName || ''} ${u.lastName || ''}`}
                                  {isMe && <span className="text-[9px] px-1.5 py-0.2 rounded bg-purple-500/20 text-purple-300 uppercase tracking-wider font-bold">You</span>}
                                </span>
                                <span className="text-[11px] text-gray-500 font-medium mt-0.5">
                                  Joined {new Date(u.createdAt || Date.now()).toLocaleDateString()}
                                </span>
                              </div>
                            </div>
                          </td>

                          {/* Email & Phone */}
                          <td className="p-5">
                            <div className="flex flex-col text-xs">
                              <span className="text-gray-300 font-medium flex items-center gap-1.5">
                                <Mail className="w-3.5 h-3.5 text-gray-500 shrink-0" />
                                {u.email}
                              </span>
                              {(u.phone || u.phoneNumber) && (
                                <span className="text-gray-500 text-[11px] flex items-center gap-1.5 mt-0.5">
                                  <Phone className="w-3 h-3 text-emerald-400 shrink-0" />
                                  {u.phone || u.phoneNumber}
                                </span>
                              )}
                            </div>
                          </td>

                          {/* Role Badge */}
                          <td className="p-5">
                            <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-[11px] font-bold uppercase tracking-wider border ${
                              isSysAdmin
                                ? 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                                : isAdmin
                                  ? 'bg-purple-500/10 text-purple-400 border-purple-500/20'
                                  : uRole === 'STAFF'
                                    ? 'bg-blue-500/10 text-blue-400 border-blue-500/20'
                                    : uRole === 'TRAINER'
                                      ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                                      : 'bg-gray-800/80 text-gray-400 border-gray-700'
                            }`}>
                              {isSysAdmin ? <Crown className="w-3.5 h-3.5 text-amber-400" /> : isAdmin ? <ShieldCheck className="w-3.5 h-3.5 text-purple-400" /> : uRole === 'STAFF' ? <UserCheck className="w-3.5 h-3.5 text-blue-400" /> : uRole === 'TRAINER' ? <Award className="w-3.5 h-3.5 text-emerald-400" /> : <Users className="w-3.5 h-3.5 text-gray-400" />}
                              {uRole}
                            </div>
                          </td>

                          {/* Status */}
                          <td className="p-5">
                            <button
                              onClick={() => handleToggleStatus(u)}
                              disabled={isMe || isSysAdmin || (isAdmin && !isSystemAdmin)}
                              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-[11px] font-bold uppercase tracking-wider border transition-all ${
                                isActive
                                  ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/20'
                                  : 'bg-red-500/10 text-red-400 border-red-500/20 hover:bg-red-500/20'
                              } ${(isMe || isSysAdmin || (isAdmin && !isSystemAdmin)) ? 'cursor-not-allowed opacity-80' : ''}`}
                            >
                              {isActive ? <CheckCircle className="w-3.5 h-3.5 text-emerald-400" /> : <Ban className="w-3.5 h-3.5 text-red-400" />}
                              {isActive ? 'Active' : 'Deactivated'}
                            </button>
                          </td>

                          {/* Actions */}
                          <td className="p-5 pr-7 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                onClick={() => handleToggleStatus(u)}
                                disabled={isMe || isSysAdmin || (isAdmin && !isSystemAdmin)}
                                className={`p-2 rounded-xl border transition-all ${
                                  isActive ? 'bg-amber-500/10 text-amber-400 border-amber-500/20 hover:bg-amber-500/20' : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/20'
                                } ${(isMe || isSysAdmin || (isAdmin && !isSystemAdmin)) ? 'opacity-30 cursor-not-allowed' : ''}`}
                                title={isActive ? 'Deactivate Account' : 'Activate Account'}
                              >
                                <Power className="w-4 h-4" />
                              </button>

                              <button
                                onClick={() => handleRoleToggle(u)}
                                disabled={isMe || isSysAdmin || (!isSystemAdmin && !isAdmin)}
                                className={`p-2 rounded-xl border transition-all ${
                                  isMe || isSysAdmin
                                    ? 'bg-white/5 text-gray-600 border-transparent cursor-not-allowed'
                                    : isAdmin
                                      ? 'bg-amber-500/10 text-amber-400 border-amber-500/20 hover:bg-amber-500/20'
                                      : 'bg-purple-500/10 text-purple-400 border-purple-500/20 hover:bg-purple-500/20'
                                }`}
                                title={!isSystemAdmin && !isAdmin ? 'Only System Admin can promote users to Admin' : isAdmin ? 'Demote to Member' : 'Promote to Admin'}
                              >
                                {!isSystemAdmin && !isAdmin ? <Lock className="w-4 h-4 text-gray-600" /> : isAdmin ? <ShieldAlert className="w-4 h-4" /> : <Shield className="w-4 h-4" />}
                              </button>

                              <button
                                onClick={() => {
                                  if (isMe || isSysAdmin) {
                                    toast.error("Cannot delete System Admin or your own account.");
                                    return;
                                  }
                                  setDeleteId(u._id);
                                }}
                                disabled={isMe || isSysAdmin}
                                className={`p-2 rounded-xl border transition-all ${
                                  isMe || isSysAdmin
                                    ? 'bg-white/5 text-gray-600 border-transparent cursor-not-allowed'
                                    : 'bg-red-500/10 text-red-400 border-red-500/20 hover:bg-red-500/20'
                                }`}
                                title="Delete User"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </motion.tr>
                      );
                    })}
                  </AnimatePresence>
                </tbody>
              </table>

              <div className="p-4 border-t border-white/10">
                <Pagination
                  currentPage={currentPage}
                  totalPages={totalPages}
                  totalItems={filteredUsers.length}
                  itemsPerPage={itemsPerPage}
                  onPageChange={setCurrentPage}
                />
              </div>
            </div>
          )}
        </div>
      </motion.div>

      {/* CREATE USER MODAL */}
      <AnimatePresence>
        {isCreateModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsCreateModalOpen(false)} className="absolute inset-0 bg-black/85 backdrop-blur-md" />
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="relative bg-[#121118] border border-white/10 rounded-3xl w-full max-w-md p-6 shadow-2xl space-y-5">
              <div className="flex justify-between items-center pb-3 border-b border-white/10">
                <h3 className="text-lg font-bold text-white">Create Account</h3>
                <button onClick={() => setIsCreateModalOpen(false)} className="text-gray-400 hover:text-white p-1 rounded-lg hover:bg-white/5"><X className="w-5 h-5" /></button>
              </div>

              <form onSubmit={handleCreateUser} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-400 mb-1">Full Name</label>
                  <input type="text" required value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. John Smith" className="w-full px-4 py-2.5 bg-[#0a0a0d] border border-white/10 rounded-xl text-xs text-white focus:outline-none focus:border-purple-500" />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-400 mb-1">Email Address</label>
                  <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="e.g. staff@gym.local" className="w-full px-4 py-2.5 bg-[#0a0a0d] border border-white/10 rounded-xl text-xs text-white focus:outline-none focus:border-purple-500" />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-400 mb-1">Contact Number</label>
                  <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="e.g. +94 77 123 4567" className="w-full px-4 py-2.5 bg-[#0a0a0d] border border-white/10 rounded-xl text-xs text-white focus:outline-none focus:border-purple-500" />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-400 mb-1">Account Role</label>
                  <select
                    value={role}
                    onChange={(e) => setRole(e.target.value as any)}
                    className="w-full px-4 py-2.5 bg-[#0a0a0d] border border-white/10 rounded-xl text-xs text-white focus:outline-none focus:border-purple-500"
                  >
                    <option value="STAFF">Staff / Reception Desk</option>
                    <option value="TRAINER">Personal Trainer</option>
                    <option value="MEMBER">Member (Gym User)</option>
                    {isSystemAdmin ? (
                      <option value="ADMIN">Admin (System Manager)</option>
                    ) : (
                      <option value="ADMIN" disabled>Admin (System Admin Only)</option>
                    )}
                  </select>
                </div>

                <div className="p-3.5 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-xs text-emerald-300 space-y-1">
                  <div className="flex items-center gap-2 font-bold text-emerald-400">
                    <CheckCircle className="w-4 h-4 shrink-0" />
                    <span>Automated Security & Delivery</span>
                  </div>
                  <p className="text-gray-300 text-[11px] leading-relaxed">
                    A temporary password will be created and sent to this email address.
                  </p>
                </div>

                <button type="submit" disabled={creating} className="w-full py-3 bg-emerald-500 text-black font-bold text-xs rounded-xl hover:bg-emerald-400 transition-all disabled:opacity-50 flex items-center justify-center gap-2">
                  {creating ? 'Creating Account...' : 'Create Account & Send Credentials'}
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* SUCCESS & CREDENTIALS MODAL */}
      <AnimatePresence>
        {createdResult && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setCreatedResult(null)} className="absolute inset-0 bg-black/85 backdrop-blur-md" />
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="relative bg-[#121118] border border-emerald-500/30 rounded-3xl w-full max-w-md p-6 shadow-2xl space-y-4">
              <div className="flex justify-between items-center pb-3 border-b border-white/10">
                <div className="flex items-center gap-2 text-emerald-400 font-bold">
                  <CheckCircle className="w-5 h-5" />
                  <h3 className="text-base text-white">Account Created Successfully</h3>
                </div>
                <button onClick={() => setCreatedResult(null)} className="text-gray-400 hover:text-white"><X className="w-5 h-5" /></button>
              </div>

              <div className="space-y-3 text-xs">
                <div className="p-4 bg-white/[0.03] border border-white/10 rounded-2xl space-y-2">
                  <div className="flex justify-between"><span className="text-gray-400">User:</span><span className="text-white font-bold">{createdResult.name}</span></div>
                  <div className="flex justify-between"><span className="text-gray-400">Email:</span><span className="text-blue-400 font-mono">{createdResult.email}</span></div>
                  <div className="flex justify-between"><span className="text-gray-400">Role:</span><span className="text-purple-400 font-bold">{createdResult.role}</span></div>
                </div>

                {createdResult.tempPassword && (
                  <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-2xl space-y-2">
                    <span className="text-[10px] uppercase font-bold text-amber-400 tracking-wider block">Generated Temporary Password</span>
                    <div className="flex items-center justify-between bg-black/60 px-3.5 py-2.5 rounded-xl border border-amber-500/30">
                      <span className="font-mono text-base font-bold text-amber-300">{createdResult.tempPassword}</span>
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(createdResult.tempPassword!);
                          toast.success('Temporary password copied to clipboard!');
                        }}
                        className="px-2.5 py-1 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 text-xs font-semibold rounded-lg"
                      >
                        Copy
                      </button>
                    </div>
                  </div>
                )}

                <button onClick={() => setCreatedResult(null)} className="w-full py-2.5 bg-white/10 hover:bg-white/20 text-white font-bold text-xs rounded-xl">
                  Done
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* DELETE CONFIRMATION MODAL */}
      <AnimatePresence>
        {deleteId && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setDeleteId(null)} className="absolute inset-0 bg-black/80 backdrop-blur-sm" />
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="relative bg-[#121118] border border-white/10 rounded-3xl w-full max-w-xs p-6 shadow-2xl text-center">
              <div className="w-14 h-14 rounded-full bg-red-500/10 flex items-center justify-center mx-auto mb-3 border border-red-500/20">
                <AlertTriangle className="w-7 h-7 text-red-400" />
              </div>
              <h3 className="font-display text-xl font-bold text-white mb-1">Delete User?</h3>
              <p className="text-gray-400 text-xs mb-5">This action will permanently delete the user account.</p>
              <div className="flex flex-col gap-2">
                <button onClick={confirmDelete} className="w-full py-2.5 rounded-xl bg-red-500 hover:bg-red-600 text-white font-bold text-xs">Yes, Delete</button>
                <button onClick={() => setDeleteId(null)} className="w-full py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-white font-semibold text-xs">Cancel</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
