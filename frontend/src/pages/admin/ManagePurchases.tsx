import { useState, useEffect } from 'react';
import { adminAPI } from '../../api/apiService';
import Pagination from '../../components/Pagination';
import { ShoppingCart, Package, TrendingUp, CheckCircle, Building2, Check, X, Clock, AlertCircle, Search, Mail } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'react-toastify';

function getCustomerDisplayName(user: any): string {
  if (!user) return 'Member';
  if (typeof user === 'string') return user;
  const fullName = [user.firstName, user.lastName].filter(Boolean).join(' ').trim();
  if (fullName) return fullName;
  if (user.name && !user.name.includes('@')) return user.name;
  return user.email ? user.email.split('@')[0] : 'Member';
}

export default function ManagePurchases() {
  const [purchases, setPurchases] = useState<any[]>([]);
  const [filter, setFilter] = useState<'ALL' | 'PENDING' | 'PAID'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  useEffect(() => {
    fetchPurchases();
  }, []);

  const fetchPurchases = async () => {
    try {
      setLoading(true);
      const res = await adminAPI.getAllPurchases();
      setPurchases(res.data.purchases || res.data.data || (Array.isArray(res.data) ? res.data : []));
    } catch (error) {
      console.error(error);
      toast.error('Failed to load purchases.');
    } fontally: {
      setLoading(false);
    }
  };

  const handleApproveBankTransfer = async (purchaseId: string) => {
    try {
      setActionLoading(purchaseId);
      const res = await adminAPI.approveBankTransfer(purchaseId);
      toast.success(res.data.message || 'Bank transfer approved & payment receipt emailed to member!');
      fetchPurchases();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to approve bank transfer');
    } finally {
      setActionLoading(null);
    }
  };

  const handleRejectBankTransfer = async (purchaseId: string) => {
    try {
      setActionLoading(purchaseId);
      const res = await adminAPI.rejectBankTransfer(purchaseId);
      toast.info(res.data.message || 'Bank transfer rejected');
      fetchPurchases();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to reject bank transfer');
    } finally {
      setActionLoading(null);
    }
  };

  const filteredPurchases = purchases.filter((p) => {
    const isPending = p.status === 'pending_approval' || p.status === 'pending';
    const isPaid = p.status === 'paid' || p.status === 'active';

    if (filter === 'PENDING' && !isPending) return false;
    if (filter === 'PAID' && !isPaid) return false;

    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;

    const customerName = getCustomerDisplayName(p.userId).toLowerCase();
    const customerEmail = (p.userId?.email || '').toLowerCase();
    const pkgName = (p.packageId?.name || p.packageId || '').toLowerCase();
    const ref = (p.bankTransferReference || '').toLowerCase();

    return customerName.includes(q) || customerEmail.includes(q) || pkgName.includes(q) || ref.includes(q);
  });

  const totalRevenue = purchases
    .filter((p) => p.status === 'paid' || p.status === 'active')
    .reduce((acc, curr) => acc + (curr.price || curr.packageId?.price || 0), 0);

  const pendingCount = purchases.filter((p) => p.status === 'pending_approval' || p.status === 'pending').length;

  const totalPages = Math.ceil(filteredPurchases.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedPurchases = filteredPurchases.slice(startIndex, startIndex + itemsPerPage);

  return (
    <div className="pb-16 space-y-8 relative text-white min-h-[85vh]">
      {/* Background glow graphics */}
      <div className="absolute top-10 left-1/4 w-80 h-80 bg-orange-500/10 blur-[130px] rounded-full pointer-events-none -z-10" />
      <div className="absolute top-40 right-10 w-96 h-96 bg-emerald-500/10 blur-[130px] rounded-full pointer-events-none -z-10" />

      {/* Header Banner */}
      <motion.div
        initial={{ opacity: 0, y: -16 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-[#0f0e13]/90 backdrop-blur-md p-7 md:p-8 rounded-3xl border border-white/10 shadow-2xl relative overflow-hidden"
      >
        <div className="flex items-center gap-5 relative z-10">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-orange-500/20 to-amber-600/10 flex items-center justify-center border border-orange-500/30 shadow-[0_0_30px_rgba(249,115,22,0.15)] shrink-0">
            <ShoppingCart className="w-8 h-8 text-orange-400" />
          </div>
          <div>
            <h1 className="text-3xl font-display font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-white via-gray-100 to-gray-400 tracking-tight">
              Manage Purchases & Bank Slips
            </h1>
            <p className="text-gray-400 text-sm font-medium mt-0.5">
              Review member transaction records, verify bank transfer slips, and send receipts.
            </p>
          </div>
        </div>

        <div className="relative z-10 flex flex-wrap items-center gap-3">
          <div className="bg-white/[0.04] border border-white/10 rounded-xl px-4 py-2.5 flex items-center gap-3">
            <TrendingUp className="w-4 h-4 text-emerald-400" />
            <div className="flex flex-col">
              <span className="text-[9px] uppercase font-bold text-gray-500 tracking-widest">Total Revenue</span>
              <span className="text-base font-black text-white">LKR {totalRevenue.toLocaleString()}</span>
            </div>
          </div>

          <div className="bg-white/[0.04] border border-white/10 rounded-xl px-4 py-2.5 flex items-center gap-3">
            <Clock className="w-4 h-4 text-amber-400" />
            <div className="flex flex-col">
              <span className="text-[9px] uppercase font-bold text-gray-500 tracking-widest">Pending Verification</span>
              <span className="text-base font-black text-amber-400">{pendingCount}</span>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Filter Tabs & Search Bar */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.08 }}
        className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4"
      >
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-gray-500 absolute left-4 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by customer, email, plan, or bank ref..."
            className="w-full pl-11 pr-4 py-2.5 rounded-xl bg-[#0f0e13]/80 border border-white/10 text-white text-xs placeholder-gray-500 focus:outline-none focus:border-orange-500 transition-colors"
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white">
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0 custom-scrollbar">
          <button
            onClick={() => setFilter('ALL')}
            className={`px-3 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap border ${
              filter === 'ALL'
                ? 'bg-white text-black border-white shadow-md'
                : 'bg-white/[0.03] text-gray-400 border-white/[0.08] hover:text-white hover:bg-white/[0.06]'
            }`}
          >
            All Orders ({purchases.length})
          </button>
          <button
            onClick={() => setFilter('PENDING')}
            className={`px-3 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap border flex items-center gap-1.5 ${
              filter === 'PENDING'
                ? 'bg-amber-500 text-black border-amber-400 shadow-md shadow-amber-500/20'
                : 'bg-white/[0.03] text-amber-400 border-white/[0.08] hover:bg-white/[0.06]'
            }`}
          >
            <Building2 className="w-3.5 h-3.5" /> Pending Approval ({pendingCount})
          </button>
          <button
            onClick={() => setFilter('PAID')}
            className={`px-3 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap border ${
              filter === 'PAID'
                ? 'bg-emerald-500 text-black border-emerald-400 shadow-md shadow-emerald-500/20'
                : 'bg-white/[0.03] text-gray-400 border-white/[0.08] hover:text-white hover:bg-white/[0.06]'
            }`}
          >
            Confirmed Paid
          </button>
        </div>
      </motion.div>

      {/* Purchases Table */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.12 }}>
        <div className="bg-[#0f0e13]/90 backdrop-blur-md border border-white/10 rounded-3xl overflow-hidden shadow-2xl">
          {loading ? (
            <div className="py-20 text-center text-gray-500 space-y-3">
              <div className="w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="text-xs">Loading purchases...</p>
            </div>
          ) : filteredPurchases.length === 0 ? (
            <div className="py-20 text-center text-gray-500 space-y-2">
              <ShoppingCart className="w-10 h-10 text-gray-700 mx-auto" />
              <p className="font-semibold text-sm text-gray-400">No purchases found</p>
              <p className="text-xs text-gray-600">No transactions match your filter criteria.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-white/[0.03] border-b border-white/10 text-gray-400 text-xs uppercase tracking-widest font-bold">
                    <th className="p-5 pl-7">Customer</th>
                    <th className="p-5">Plan Purchased</th>
                    <th className="p-5">Amount</th>
                    <th className="p-5">Payment Method</th>
                    <th className="p-5">Status</th>
                    <th className="p-5 pr-7 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.04]">
                  <AnimatePresence>
                    {paginatedPurchases.map((p, i) => {
                      const isPending = p.status === 'pending_approval' || p.status === 'pending';
                      const isBank = p.paymentMethod === 'bank_transfer' || p.bankTransferReference;

                      return (
                        <motion.tr
                          key={p._id}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: i * 0.03 }}
                          className="group hover:bg-white/[0.04] transition-colors"
                        >
                          {/* Customer */}
                          <td className="p-5 pl-7">
                            <div className="flex items-center gap-3.5">
                              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-500/20 to-amber-600/10 text-orange-400 border border-orange-500/30 flex items-center justify-center font-bold text-sm shadow-inner overflow-hidden shrink-0">
                                {p.userId?.profileImage ? (
                                  <img src={p.userId.profileImage} alt={getCustomerDisplayName(p.userId)} className="w-full h-full object-cover" />
                                ) : (
                                  getCustomerDisplayName(p.userId).charAt(0).toUpperCase()
                                )}
                              </div>
                              <div className="flex flex-col min-w-0">
                                <span className="font-bold text-gray-200 text-sm group-hover:text-white transition-colors truncate">
                                  {getCustomerDisplayName(p.userId)}
                                </span>
                                {p.userId?.email && (
                                  <span className="text-[11px] text-gray-500 font-medium truncate flex items-center gap-1 mt-0.5">
                                    <Mail className="w-3 h-3 text-gray-600 shrink-0" />
                                    {p.userId.email}
                                  </span>
                                )}
                              </div>
                            </div>
                          </td>

                          {/* Package */}
                          <td className="p-5">
                            <div className="flex items-center gap-2">
                              <Package className="w-4 h-4 text-emerald-400 shrink-0" />
                              <span className="text-gray-200 font-medium text-sm">
                                {p.packageId?.name || p.packageId || 'Gym Package'}
                              </span>
                            </div>
                          </td>

                          {/* Price */}
                          <td className="p-5">
                            <span className="text-emerald-400 font-bold tracking-wide text-sm">
                              LKR {(p.price || p.packageId?.price || 0).toLocaleString()}
                            </span>
                          </td>

                          {/* Method */}
                          <td className="p-5">
                            <div className="flex flex-col text-xs">
                              <span className="font-bold text-white uppercase flex items-center gap-1.5">
                                {isBank ? <Building2 className="w-3.5 h-3.5 text-amber-400" /> : <ShoppingCart className="w-3.5 h-3.5 text-blue-400" />}
                                {p.paymentMethod || (isBank ? 'BANK_TRANSFER' : 'CARD')}
                              </span>
                              {p.bankTransferReference && (
                                <span className="text-amber-400 font-mono text-[10px] mt-0.5 font-bold">
                                  Ref: {p.bankTransferReference}
                                </span>
                              )}
                            </div>
                          </td>

                          {/* Status */}
                          <td className="p-5">
                            {isPending ? (
                              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-[11px] font-bold uppercase tracking-wider border bg-amber-500/10 text-amber-400 border-amber-500/20">
                                <Clock className="w-3.5 h-3.5 animate-pulse" /> Pending Verification
                              </span>
                            ) : p.status === 'rejected' ? (
                              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-[11px] font-bold uppercase tracking-wider border bg-red-500/10 text-red-400 border-red-500/20">
                                <AlertCircle className="w-3.5 h-3.5" /> Rejected
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-[11px] font-bold uppercase tracking-wider border bg-emerald-500/10 text-emerald-400 border-emerald-500/20">
                                <CheckCircle className="w-3.5 h-3.5" /> Paid & Verified
                              </span>
                            )}
                          </td>

                          {/* Action */}
                          <td className="p-5 pr-7 text-right">
                            {isPending ? (
                              <div className="flex items-center justify-end gap-2">
                                <button
                                  onClick={() => handleApproveBankTransfer(p._id)}
                                  disabled={actionLoading === p._id}
                                  className="px-3 py-1.5 bg-emerald-500 text-black font-bold text-xs rounded-xl hover:bg-emerald-400 transition-all flex items-center gap-1 shadow-md shadow-emerald-500/20 disabled:opacity-50"
                                >
                                  <Check className="w-3.5 h-3.5" /> {actionLoading === p._id ? 'Approving...' : 'Approve'}
                                </button>
                                <button
                                  onClick={() => handleRejectBankTransfer(p._id)}
                                  disabled={actionLoading === p._id}
                                  className="px-3 py-1.5 bg-red-500/10 text-red-400 border border-red-500/20 font-semibold text-xs rounded-xl hover:bg-red-500/20 transition-all disabled:opacity-50"
                                >
                                  <X className="w-3.5 h-3.5" /> Reject
                                </button>
                              </div>
                            ) : (
                              <span className="text-xs text-gray-500 font-medium">Verified</span>
                            )}
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
                  totalItems={filteredPurchases.length}
                  itemsPerPage={itemsPerPage}
                  onPageChange={setCurrentPage}
                />
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}
