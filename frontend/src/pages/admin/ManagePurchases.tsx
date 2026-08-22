import { useState, useEffect } from 'react';
import { adminAPI } from '../../api/apiService';
import { ShoppingCart, Package, TrendingUp, CheckCircle, Building2, Check, X, Clock, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'react-toastify';

export default function ManagePurchases() {
  const [purchases, setPurchases] = useState<any[]>([]);
  const [filter, setFilter] = useState<'ALL' | 'PENDING' | 'PAID'>('ALL');
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => {
    fetchPurchases();
  }, []);

  const fetchPurchases = async () => {
    try {
      const res = await adminAPI.getAllPurchases();
      setPurchases(res.data.purchases || []);
    } catch (error) {
      console.error(error);
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
    if (filter === 'PENDING') return p.status === 'pending_approval' || p.status === 'pending';
    if (filter === 'PAID') return p.status === 'paid' || p.status === 'active';
    return true;
  });

  const totalRevenue = purchases
    .filter((p) => p.status === 'paid' || p.status === 'active')
    .reduce((acc, curr) => acc + (curr.price || 0), 0);

  const pendingCount = purchases.filter((p) => p.status === 'pending_approval' || p.status === 'pending').length;

  return (
    <div className="pb-12 space-y-8 relative text-white min-h-[80vh]">
      {/* Ambient Background Glows */}
      <div className="absolute top-10 left-1/4 w-72 h-72 bg-emerald-500/10 blur-[120px] rounded-full pointer-events-none -z-10" />
      <div className="absolute top-40 right-1/4 w-80 h-80 bg-orange-500/10 blur-[120px] rounded-full pointer-events-none -z-10" />

      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-[#111113]/80 backdrop-blur-md p-8 rounded-3xl border border-white/10 shadow-2xl relative overflow-hidden"
      >
        <div className="flex items-center gap-5 relative z-10">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-orange-500/20 to-amber-600/10 flex items-center justify-center ring-1 ring-orange-500/30 shadow-[0_0_30px_rgba(249,115,22,0.15)]">
            <ShoppingCart className="w-8 h-8 text-orange-400" />
          </div>
          <div>
            <h1 className="text-3xl font-display font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-white to-gray-400 tracking-tight mb-1">
              Manage Purchases & Bank Transfers
            </h1>
            <p className="text-gray-400 text-sm font-medium">
              Review member payments, verify bank transfers, and send payment receipts.
            </p>
          </div>
        </div>

        <div className="relative z-10 flex flex-wrap gap-4">
          <div className="bg-white/5 border border-white/10 rounded-xl px-5 py-3 flex items-center gap-4 shadow-inner">
            <TrendingUp className="w-5 h-5 text-green-400 opacity-80" />
            <div className="flex flex-col">
              <span className="text-[10px] uppercase font-bold text-gray-500 tracking-widest">Total Revenue</span>
              <span className="text-xl font-black text-white">LKR {totalRevenue.toLocaleString()}</span>
            </div>
          </div>
          <div className="bg-white/5 border border-white/10 rounded-xl px-5 py-3 flex items-center gap-4 shadow-inner">
            <Clock className="w-5 h-5 text-amber-400 opacity-80" />
            <div className="flex flex-col">
              <span className="text-[10px] uppercase font-bold text-gray-500 tracking-widest">Pending Approvals</span>
              <span className="text-xl font-black text-amber-400">{pendingCount}</span>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Filter Tabs */}
      <div className="flex gap-3">
        <button
          onClick={() => setFilter('ALL')}
          className={`px-5 py-2.5 rounded-xl font-bold text-xs transition-all ${
            filter === 'ALL' ? 'bg-white text-black shadow-lg' : 'bg-gray-900 border border-gray-800 text-gray-400 hover:text-white'
          }`}
        >
          All Purchases ({purchases.length})
        </button>
        <button
          onClick={() => setFilter('PENDING')}
          className={`px-5 py-2.5 rounded-xl font-bold text-xs transition-all flex items-center gap-2 ${
            filter === 'PENDING' ? 'bg-amber-500 text-black shadow-lg' : 'bg-gray-900 border border-gray-800 text-amber-400 hover:text-amber-300'
          }`}
        >
          <Building2 className="w-4 h-4" /> Pending Bank Transfers ({pendingCount})
        </button>
        <button
          onClick={() => setFilter('PAID')}
          className={`px-5 py-2.5 rounded-xl font-bold text-xs transition-all ${
            filter === 'PAID' ? 'bg-green-500 text-black shadow-lg' : 'bg-gray-900 border border-gray-800 text-gray-400 hover:text-white'
          }`}
        >
          Confirmed & Active
        </button>
      </div>

      {/* Purchases Table */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
        <div className="bg-[#111113]/80 backdrop-blur-md border border-white/10 rounded-3xl overflow-hidden shadow-2xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-white/[0.03] border-b border-white/10 text-gray-400 text-xs uppercase tracking-widest font-bold">
                  <th className="p-5 pl-8">Customer Details</th>
                  <th className="p-5">Package / Plan</th>
                  <th className="p-5">Amount</th>
                  <th className="p-5">Method & Ref</th>
                  <th className="p-5">Status</th>
                  <th className="p-5 pr-8 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.04]">
                <AnimatePresence>
                  {filteredPurchases.map((p, i) => {
                    const isPending = p.status === 'pending_approval' || p.status === 'pending';
                    const isBank = p.paymentMethod === 'bank_transfer' || p.bankTransferReference;

                    return (
                      <motion.tr
                        key={p._id}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.05 }}
                        className="group hover:bg-white/[0.03] transition-colors"
                      >
                        <td className="p-5 pl-8">
                          <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-500/20 to-amber-600/10 text-orange-400 flex items-center justify-center font-bold text-lg ring-1 ring-orange-500/30 shadow-inner overflow-hidden shrink-0">
                              {p.userId?.profileImage ? (
                                <img src={p.userId.profileImage} alt={p.userId?.name || 'U'} className="w-full h-full object-cover" />
                              ) : (
                                (p.userId?.name || 'U').charAt(0).toUpperCase()
                              )}
                            </div>
                            <div className="flex flex-col">
                              <span className="font-bold text-gray-200 text-sm group-hover:text-white transition-colors">
                                {p.userId?.name || p.userId || 'Unknown User'}
                              </span>
                              {p.userId?.email && (
                                <span className="text-[11px] text-gray-500 font-medium">{p.userId.email}</span>
                              )}
                            </div>
                          </div>
                        </td>

                        <td className="p-5">
                          <div className="flex items-center gap-2">
                            <Package className="w-4 h-4 text-gray-600 group-hover:text-emerald-400 transition-colors" />
                            <span className="text-gray-300 font-medium text-sm group-hover:text-white transition-colors">
                              {p.packageId?.name || p.packageId || 'Gym Package'}
                            </span>
                          </div>
                        </td>

                        <td className="p-5">
                          <span className="text-emerald-400 font-bold tracking-wide">
                            LKR {(p.price || 0).toLocaleString()}
                          </span>
                        </td>

                        <td className="p-5">
                          <div className="flex flex-col text-xs">
                            <span className="font-semibold text-white uppercase flex items-center gap-1">
                              {isBank ? <Building2 className="w-3.5 h-3.5 text-amber-400" /> : <ShoppingCart className="w-3.5 h-3.5 text-blue-400" />}
                              {p.paymentMethod || (isBank ? 'BANK_TRANSFER' : 'CARD')}
                            </span>
                            {p.bankTransferReference && (
                              <span className="text-amber-400 font-mono text-[10px] mt-0.5">Ref: {p.bankTransferReference}</span>
                            )}
                          </div>
                        </td>

                        <td className="p-5">
                          {isPending ? (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider border bg-amber-500/10 text-amber-400 border-amber-500/20">
                              <Clock className="w-3.5 h-3.5" /> Pending Verification
                            </span>
                          ) : p.status === 'rejected' ? (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider border bg-red-500/10 text-red-400 border-red-500/20">
                              <AlertCircle className="w-3.5 h-3.5" /> Rejected
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider border bg-emerald-500/10 text-emerald-400 border-emerald-500/20">
                              <CheckCircle className="w-3.5 h-3.5" /> Paid & Verified
                            </span>
                          )}
                        </td>

                        <td className="p-5 pr-8 text-right">
                          {isPending ? (
                            <div className="flex items-center justify-end gap-2">
                              <button
                                onClick={() => handleApproveBankTransfer(p._id)}
                                disabled={actionLoading === p._id}
                                className="px-3 py-1.5 bg-green-500 text-black font-bold text-xs rounded-lg hover:bg-green-400 transition-all flex items-center gap-1 shadow-md shadow-green-500/20"
                              >
                                <Check className="w-3.5 h-3.5" /> Approve & Email Receipt
                              </button>
                              <button
                                onClick={() => handleRejectBankTransfer(p._id)}
                                disabled={actionLoading === p._id}
                                className="px-3 py-1.5 bg-red-500/20 text-red-400 border border-red-500/30 font-semibold text-xs rounded-lg hover:bg-red-500/30 transition-all"
                              >
                                <X className="w-3.5 h-3.5" /> Reject
                              </button>
                            </div>
                          ) : (
                            <span className="text-xs text-gray-500 font-medium">No Action Needed</span>
                          )}
                        </td>
                      </motion.tr>
                    );
                  })}
                </AnimatePresence>

                {filteredPurchases.length === 0 && (
                  <tr>
                    <td colSpan={6} className="p-16 text-center text-gray-500">
                      No purchase records found under this filter.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
