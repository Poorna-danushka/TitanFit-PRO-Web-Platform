import { useState, useEffect } from 'react';
import { adminAPI, userAPI } from '../../api/apiService';
import { Shield, ShieldAlert, Trash2, Users, AlertTriangle, UserCheck, ShieldCheck, X, Crown, Award, UserPlus, Lock, Power, CheckCircle, Ban, Phone } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'react-toastify';

export default function ManageUsers() {
  const [users, setUsers] = useState<any[]>([]);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

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
      const res = await adminAPI.getAllUsers();
      setUsers(res.data.users || res.data.data || (Array.isArray(res.data) ? res.data : []));
    } catch (error) {
      console.error(error);
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

  return (
    <div className="pb-12 space-y-8 relative text-white min-h-[80vh]">
      {/* Ambient Background Glows */}
      <div className="absolute top-10 left-10 w-64 h-64 bg-blue-500/10 blur-[100px] rounded-full pointer-events-none -z-10" />
      <div className="absolute top-40 right-10 w-72 h-72 bg-purple-500/10 blur-[100px] rounded-full pointer-events-none -z-10" />

      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-[#111113]/80 backdrop-blur-md p-8 rounded-3xl border border-white/10 shadow-2xl relative overflow-hidden"
      >
        <div className="flex items-center gap-5 relative z-10">
          <div className="w-14 h-14 rounded-2xl bg-blue-500/10 flex items-center justify-center ring-1 ring-blue-500/30 shadow-[0_0_20px_rgba(59,130,246,0.15)]">
            <Users className="w-7 h-7 text-blue-400" />
          </div>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="px-3 py-0.5 bg-purple-500/20 text-purple-400 text-[10px] font-bold uppercase rounded-full border border-purple-500/30">
                {isSystemAdmin ? 'System Admin Mode' : 'Standard Admin Mode'}
              </span>
            </div>
            <h1 className="text-3xl font-display font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-white to-gray-400 tracking-tight mb-1">
              Manage Users & Account Status
            </h1>
            <p className="text-gray-400 text-sm font-medium">
              Create accounts, manage role hierarchies, and activate or deactivate user accounts.
            </p>
          </div>
        </div>

        <div className="relative z-10 flex items-center gap-4">
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="px-5 py-3 bg-green-500 text-black font-bold text-xs rounded-xl hover:bg-green-400 transition-all flex items-center gap-2 shadow-lg shadow-green-500/20"
          >
            <UserPlus className="w-4 h-4" /> Add User / Staff / Trainer
          </button>

          <div className="bg-white/5 border border-white/10 rounded-xl px-5 py-3 flex items-center gap-4 shadow-inner">
            <div className="flex flex-col">
              <span className="text-[10px] uppercase font-bold text-gray-500 tracking-widest">Total Accounts</span>
              <span className="text-2xl font-black text-white">{users.length}</span>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Users Table */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
        <div className="bg-[#111113]/80 backdrop-blur-md border border-white/10 rounded-3xl overflow-hidden shadow-2xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-white/[0.03] border-b border-white/10 text-gray-400 text-xs uppercase tracking-widest font-bold">
                  <th className="p-5 pl-8">User Details</th>
                  <th className="p-5">Email Address</th>
                  <th className="p-5">Access Role</th>
                  <th className="p-5">Account Status</th>
                  <th className="p-5 pr-8 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.04]">
                <AnimatePresence>
                  {users.map((u, i) => {
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
                        transition={{ delay: i * 0.05 }}
                        className={`group hover:bg-white/[0.04] transition-colors ${isMe ? 'bg-blue-500/[0.02]' : ''}`}
                      >
                        <td className="p-5 pl-8">
                          <div className="flex items-center gap-4">
                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-lg shadow-inner overflow-hidden shrink-0 ${
                              isSysAdmin
                                ? 'bg-amber-500/20 text-amber-400 ring-1 ring-amber-500/40'
                                : isAdmin
                                  ? 'bg-purple-500/20 text-purple-400 ring-1 ring-purple-500/30'
                                  : uRole === 'STAFF'
                                    ? 'bg-blue-500/20 text-blue-400 ring-1 ring-blue-500/30'
                                    : uRole === 'TRAINER'
                                      ? 'bg-emerald-500/20 text-emerald-400 ring-1 ring-emerald-500/30'
                                      : 'bg-gray-800 text-gray-400 ring-1 ring-gray-700'
                            }`}>
                              {u.profileImage ? (
                                <img src={u.profileImage} alt={u.name || 'User'} className="w-full h-full object-cover" />
                              ) : (
                                (u.name || u.firstName || 'U').charAt(0).toUpperCase()
                              )}
                            </div>
                            <div className="flex flex-col">
                              <span className="font-bold text-gray-200 text-sm flex items-center gap-2">
                                {u.name || `${u.firstName || ''} ${u.lastName || ''}`}
                                {isMe && <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-white/10 text-gray-400 uppercase tracking-wider font-bold">You</span>}
                              </span>
                              <span className="text-[11px] text-gray-500 font-medium">Joined {new Date(u.createdAt || Date.now()).toLocaleDateString()}</span>
                            </div>
                          </div>
                        </td>

                        <td className="p-5">
                          <div className="flex flex-col">
                            <span className="text-gray-200 font-medium text-sm">{u.email}</span>
                            <span className="text-gray-500 text-xs flex items-center gap-1 mt-0.5"><Phone className="w-3 h-3 text-green-400 shrink-0" /> {u.phone || u.phoneNumber || 'No contact'}</span>
                          </div>
                        </td>

                        <td className="p-5">
                          <div className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider border ${
                            isSysAdmin
                              ? 'bg-amber-500/10 text-amber-400 border-amber-500/30 shadow-[0_0_15px_rgba(245,158,11,0.2)]'
                              : isAdmin
                                ? 'bg-purple-500/10 text-purple-400 border-purple-500/20'
                                : uRole === 'STAFF'
                                  ? 'bg-blue-500/10 text-blue-400 border-blue-500/20'
                                  : uRole === 'TRAINER'
                                    ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                                    : 'bg-gray-800 text-gray-400 border-gray-700'
                          }`}>
                            {isSysAdmin ? <Crown className="w-3.5 h-3.5" /> : isAdmin ? <ShieldCheck className="w-3.5 h-3.5" /> : uRole === 'STAFF' ? <UserCheck className="w-3.5 h-3.5" /> : uRole === 'TRAINER' ? <Award className="w-3.5 h-3.5" /> : <Users className="w-3.5 h-3.5" />}
                            {uRole}
                          </div>
                        </td>

                        <td className="p-5">
                          <button
                            onClick={() => handleToggleStatus(u)}
                            disabled={isMe || isSysAdmin || (isAdmin && !isSystemAdmin)}
                            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider border transition-all ${
                              isActive
                                ? 'bg-green-500/10 text-green-400 border-green-500/20 hover:bg-green-500/20'
                                : 'bg-red-500/10 text-red-400 border-red-500/20 hover:bg-red-500/20'
                            }`}
                            title={isSysAdmin || isMe ? 'Cannot modify system admin status' : isActive ? 'Click to Deactivate Account' : 'Click to Activate Account'}
                          >
                            {isActive ? <CheckCircle className="w-3.5 h-3.5 text-green-400" /> : <Ban className="w-3.5 h-3.5 text-red-400" />}
                            {isActive ? 'Active' : 'Deactivated'}
                          </button>
                        </td>

                        <td className="p-5 pr-8 text-right">
                          <div className="flex justify-end gap-2">
                            <button
                              onClick={() => handleToggleStatus(u)}
                              disabled={isMe || isSysAdmin || (isAdmin && !isSystemAdmin)}
                              className={`p-2.5 rounded-xl transition-all flex items-center justify-center ${
                                isActive ? 'bg-amber-500/10 text-amber-400 hover:bg-amber-500/20' : 'bg-green-500/10 text-green-400 hover:bg-green-500/20'
                              } ${(isMe || isSysAdmin || (isAdmin && !isSystemAdmin)) ? 'opacity-40 cursor-not-allowed' : ''}`}
                              title={isActive ? 'Deactivate Account' : 'Activate Account'}
                            >
                              <Power className="w-4 h-4" />
                            </button>

                            <button
                              onClick={() => handleRoleToggle(u)}
                              disabled={isMe || isSysAdmin || (!isSystemAdmin && !isAdmin)}
                              className={`p-2.5 rounded-xl transition-all flex items-center justify-center ${
                                isMe || isSysAdmin
                                  ? 'bg-white/5 text-gray-600 cursor-not-allowed'
                                  : isAdmin
                                    ? 'bg-orange-500/10 text-orange-400 hover:bg-orange-500/20'
                                    : 'bg-purple-500/10 text-purple-400 hover:bg-purple-500/20'
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
                              className={`p-2.5 rounded-xl transition-all flex items-center justify-center ${
                                isMe || isSysAdmin
                                  ? 'bg-white/5 text-gray-600 cursor-not-allowed'
                                  : 'bg-red-500/10 text-red-500 hover:bg-red-500/20'
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
          </div>
        </div>
      </motion.div>

      {/* CREATE USER MODAL */}
      <AnimatePresence>
        {isCreateModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsCreateModalOpen(false)} className="absolute inset-0 bg-black/85 backdrop-blur-md" />
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="relative bg-[#111113] border border-gray-800 rounded-3xl w-full max-w-md p-6 shadow-2xl space-y-5">
              <div className="flex justify-between items-center pb-3 border-b border-gray-800">
                <h3 className="text-xl font-bold">Create New Account</h3>
                <button onClick={() => setIsCreateModalOpen(false)} className="text-gray-400 hover:text-white"><X className="w-5 h-5" /></button>
              </div>

              <form onSubmit={handleCreateUser} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-400 mb-1">Full Name</label>
                  <input type="text" required value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. John Smith" className="w-full px-4 py-3 bg-gray-900 border border-gray-800 rounded-xl text-xs text-white focus:outline-none focus:border-green-500" />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-400 mb-1">Email Address</label>
                  <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="e.g. staff@gym.local" className="w-full px-4 py-3 bg-gray-900 border border-gray-800 rounded-xl text-xs text-white focus:outline-none focus:border-green-500" />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-400 mb-1">Contact Number</label>
                  <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="e.g. +94 77 123 4567" className="w-full px-4 py-3 bg-gray-900 border border-gray-800 rounded-xl text-xs text-white focus:outline-none focus:border-green-500" />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-400 mb-1">Account Role</label>
                  <select
                    value={role}
                    onChange={(e) => setRole(e.target.value as any)}
                    className="w-full px-4 py-3 bg-gray-900 border border-gray-800 rounded-xl text-xs text-white focus:outline-none focus:border-green-500"
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
                  {!isSystemAdmin && (
                    <p className="text-[11px] text-amber-400 mt-1.5 flex items-center gap-1">
                      <Lock className="w-3 h-3" /> Only System Admin can create new Admin accounts. Standard Admins can create Staff, Trainers, and Members.
                    </p>
                  )}
                </div>

                {/* Automated Security & Credentials Notice */}
                <div className="p-3.5 bg-green-500/10 border border-green-500/20 rounded-xl text-xs text-green-300 space-y-1">
                  <div className="flex items-center gap-2 font-bold text-green-400">
                    <CheckCircle className="w-4 h-4 text-green-400 flex-shrink-0" />
                    <span>Automated Security & Email Delivery</span>
                  </div>
                  <p className="text-gray-300 text-[11px] leading-relaxed">
                    A secure temporary password will be automatically generated and sent to this email. The user will be required to set their own permanent password on their first login.
                  </p>
                </div>

                <button type="submit" disabled={creating} className="w-full py-3.5 bg-green-500 text-black font-bold text-xs rounded-xl hover:bg-green-400 transition-all disabled:opacity-50 flex items-center justify-center gap-2">
                  {creating ? 'Creating & Sending Email...' : 'Create Account & Send Welcome Email'}
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ACCOUNT CREATION SUCCESS & CREDENTIALS MODAL */}
      <AnimatePresence>
        {createdResult && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setCreatedResult(null)} className="absolute inset-0 bg-black/85 backdrop-blur-md" />
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="relative bg-[#111113] border border-green-500/30 rounded-3xl w-full max-w-md p-6 shadow-2xl space-y-5">
              <div className="flex justify-between items-center pb-3 border-b border-gray-800">
                <div className="flex items-center gap-2 text-green-400 font-bold">
                  <CheckCircle className="w-5 h-5" />
                  <h3 className="text-lg text-white">Account Created Successfully</h3>
                </div>
                <button onClick={() => setCreatedResult(null)} className="text-gray-400 hover:text-white"><X className="w-5 h-5" /></button>
              </div>

              <div className="space-y-4">
                <div className="p-4 bg-white/[0.02] border border-white/10 rounded-2xl space-y-2 text-xs">
                  <div className="flex justify-between">
                    <span className="text-gray-400">User:</span>
                    <span className="text-white font-bold">{createdResult.name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Email:</span>
                    <span className="text-blue-400 font-mono">{createdResult.email}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Role:</span>
                    <span className="text-purple-400 font-bold">{createdResult.role}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Welcome Email:</span>
                    <span className={createdResult.emailSent ? 'text-green-400 font-bold' : 'text-amber-400'}>
                      {createdResult.emailSent ? 'Sent to recipient ✅' : 'Simulated (logged to console)'}
                    </span>
                  </div>
                </div>

                {createdResult.tempPassword && (
                  <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-2xl space-y-2">
                    <span className="text-[10px] uppercase font-bold text-amber-400 tracking-wider block">
                      Generated Temporary Password
                    </span>
                    <div className="flex items-center justify-between bg-black/60 px-3.5 py-2.5 rounded-xl border border-amber-500/30">
                      <span className="font-mono text-base font-bold text-amber-300 tracking-wider">
                        {createdResult.tempPassword}
                      </span>
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(createdResult.tempPassword!);
                          toast.success('Temporary password copied to clipboard!');
                        }}
                        className="px-2.5 py-1 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 text-xs font-semibold rounded-lg transition-all"
                      >
                        Copy
                      </button>
                    </div>
                    <p className="text-[11px] text-gray-400">
                      The user will be prompted to set a new permanent password on their first login.
                    </p>
                  </div>
                )}

                <button
                  onClick={() => setCreatedResult(null)}
                  className="w-full py-3 bg-white/10 hover:bg-white/20 text-white font-bold text-xs rounded-xl transition-all"
                >
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
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="relative bg-[#111113] border border-white/10 rounded-3xl w-full max-w-xs p-8 shadow-2xl text-center">
              <div className="w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center mx-auto mb-4 border border-red-500/20">
                <AlertTriangle className="w-8 h-8 text-red-400" />
              </div>
              <h3 className="font-display text-2xl font-bold text-white mb-2">Delete User?</h3>
              <p className="text-gray-400 text-sm mb-6 leading-relaxed">This action will permanently delete the user account.</p>
              <div className="flex flex-col gap-3">
                <button onClick={confirmDelete} className="w-full py-3.5 rounded-xl bg-red-500 hover:bg-red-600 text-white font-bold text-sm transition-all">Yes, Delete</button>
                <button onClick={() => setDeleteId(null)} className="w-full py-3.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white font-semibold text-sm transition-all">Cancel</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
