import { useState, useEffect } from 'react';
import { purchaseAPI } from '../api/apiService';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ShieldAlert, CheckCircle2, Clock, Building2, AlertCircle, ArrowRight, Users, Sparkles, Check } from 'lucide-react';

export default function MyPackage() {
  const [activePurchase, setActivePurchase] = useState<any>(null);
  const [pendingPurchase, setPendingPurchase] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMyPackage();
  }, []);

  const fetchMyPackage = async () => {
    try {
      const pRes = await purchaseAPI.getMy().catch(() => ({ data: { purchases: [] } }));

      const purchases = pRes.data?.purchases || [];
      const active = pRes.data?.activePurchases?.[0] || purchases.find((p: any) => p.status === 'paid');
      const pending = pRes.data?.pendingPurchases?.[0] || purchases.find(
        (p: any) => ['pending_approval', 'pending_verification', 'pending'].includes(p.status) && p.paymentMethod === 'bank_transfer'
      );

      setActivePurchase(active || null);
      setPendingPurchase(pending || null);
    } catch (error) {
      console.error('Error fetching my package', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="py-20 text-center text-gray-500 space-y-3">
        <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="text-xs">Loading package details...</p>
      </div>
    );
  }

  // Case 1: Pending Bank Transfer & No Active Membership
  if (!activePurchase && pendingPurchase) {
    const pendingPkg = pendingPurchase.packageId;
    const familyMembers = pendingPurchase.familyMembers || [];

    return (
      <div className="pb-16 text-white max-w-4xl mx-auto space-y-8 relative min-h-[85vh]">
        {/* Background Ambient Glow */}
        <div className="absolute top-0 left-10 w-80 h-80 bg-amber-500/10 blur-[130px] rounded-full pointer-events-none -z-10" />

        {/* Verification Status Banner */}
        <motion.div
          initial={{ opacity: 0, y: -16 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-[#0f0e13]/90 backdrop-blur-md border border-amber-500/30 rounded-3xl p-7 md:p-8 shadow-2xl relative overflow-hidden"
        >
          <div className="relative z-10 space-y-6">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-500/20 text-amber-400 text-xs font-extrabold uppercase tracking-wider rounded-full border border-amber-500/30">
                <Clock className="w-3.5 h-3.5 animate-pulse" /> Payment Pending Verification
              </span>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-white/5 text-gray-300 text-xs font-semibold rounded-full border border-white/10">
                <Building2 className="w-3.5 h-3.5 text-amber-400" /> Bank Transfer
              </span>
              {pendingPurchase.bankTransferReference && (
                <span className="text-xs font-mono text-amber-300 bg-black/60 px-3 py-1 rounded-full border border-amber-500/30">
                  Ref: {pendingPurchase.bankTransferReference}
                </span>
              )}
            </div>

            <div>
              <h1 className="text-3xl md:text-4xl font-display font-extrabold text-white">
                Bank Transfer Verification in Progress
              </h1>
              <p className="text-gray-300 text-sm mt-1 max-w-2xl leading-relaxed">
                Your receipt for <strong className="text-white font-bold">{pendingPkg?.name || 'Gym Package'}</strong> has been submitted. Gym administration is currently verifying your payment.
              </p>
            </div>

            {/* 3-Step Visual Progress Tracker */}
            <div className="p-6 bg-black/50 border border-white/10 rounded-2xl">
              <p className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-6">
                Verification Pipeline Progress
              </p>
              <div className="grid grid-cols-3 gap-2 relative">
                {/* Step 1 */}
                <div className="flex flex-col items-center text-center space-y-2 relative z-10">
                  <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 border-2 border-emerald-400 text-emerald-400 flex items-center justify-center font-bold text-base shadow-[0_0_20px_rgba(16,185,129,0.3)]">
                    <Check className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-emerald-400">1. Receipt Submitted</p>
                    <p className="text-[10px] text-gray-500 mt-0.5">
                      {new Date(pendingPurchase.createdAt || Date.now()).toLocaleDateString()}
                    </p>
                  </div>
                </div>

                {/* Step 2 */}
                <div className="flex flex-col items-center text-center space-y-2 relative z-10">
                  <div className="w-12 h-12 rounded-2xl bg-amber-500/20 border-2 border-amber-400 text-amber-400 flex items-center justify-center font-bold text-base shadow-[0_0_20px_rgba(245,158,11,0.3)] animate-pulse">
                    <Clock className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-amber-300">2. Admin Verification</p>
                    <p className="text-[10px] text-amber-400 font-semibold mt-0.5">In Progress</p>
                  </div>
                </div>

                {/* Step 3 */}
                <div className="flex flex-col items-center text-center space-y-2 relative z-10 opacity-40">
                  <div className="w-12 h-12 rounded-2xl bg-white/5 border-2 border-white/20 text-gray-400 flex items-center justify-center font-bold text-base">
                    <Sparkles className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-gray-400">3. Pass Activated</p>
                    <p className="text-[10px] text-gray-500 mt-0.5">Instant Access</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="grid sm:grid-cols-3 gap-4 p-5 bg-black/40 border border-white/5 rounded-2xl">
              <div>
                <p className="text-gray-500 text-xs uppercase font-medium mb-0.5">Purchased Plan</p>
                <p className="font-bold text-base text-white">{pendingPkg?.name || 'Selected Package'}</p>
              </div>
              <div>
                <p className="text-gray-500 text-xs uppercase font-medium mb-0.5">Submitted Amount</p>
                <p className="font-bold text-base text-amber-400">LKR {(pendingPurchase.price || pendingPkg?.price || 0).toLocaleString()}</p>
              </div>
              <div>
                <p className="text-gray-500 text-xs uppercase font-medium mb-0.5">Submission Date</p>
                <p className="font-bold text-base text-gray-300">
                  {new Date(pendingPurchase.createdAt || Date.now()).toLocaleDateString()}
                </p>
              </div>
            </div>

            {/* Registered Family Members Display if present */}
            {familyMembers.length > 0 && (
              <div className="p-5 bg-black/40 border border-amber-500/20 rounded-2xl space-y-3">
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-amber-400" />
                  <h4 className="text-xs font-bold uppercase tracking-wider text-amber-300">
                    Submitted Family Members ({familyMembers.length})
                  </h4>
                </div>
                <div className="grid sm:grid-cols-2 gap-3">
                  {familyMembers.map((m: any, idx: number) => (
                    <div key={idx} className="p-3 bg-gray-900/90 border border-gray-800 rounded-xl text-xs space-y-1">
                      <p className="font-bold text-white">{m.name}</p>
                      <p className="text-gray-400">
                        {m.relationship || 'Member'} {m.age ? `• Age ${m.age}` : ''}
                      </p>
                      {m.phone && <p className="text-gray-500 font-mono text-[11px]">{m.phone}</p>}
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-2xl flex items-start gap-3 text-xs text-amber-200">
              <AlertCircle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold mb-0.5">Awaiting Administrator Verification</p>
                <p className="text-gray-300 leading-relaxed">
                  Your package membership features, trainer entitlements, attendance QR pass, and digital receipt will be unlocked immediately once an admin verifies your transfer.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap gap-4 pt-2">
              <Link
                to="/dashboard"
                className="px-6 py-3 bg-white/10 hover:bg-white/20 text-white font-bold text-xs rounded-xl transition-all flex items-center gap-2 border border-white/10"
              >
                Go to Dashboard <ArrowRight className="w-4 h-4" />
              </Link>
              <Link
                to="/packages"
                className="px-6 py-3 bg-amber-500 hover:bg-amber-400 text-black font-bold text-xs rounded-xl transition-all shadow-lg shadow-amber-500/20"
              >
                Explore Other Plans
              </Link>
            </div>
          </div>
        </motion.div>
      </div>
    );
  }

  // Case 2: No Active Package and No Pending Bank Transfer
  if (!activePurchase) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-8">
        <div className="w-24 h-24 bg-white/5 rounded-3xl border border-white/10 flex items-center justify-center mb-6 shadow-xl">
          <ShieldAlert className="w-12 h-12 text-gray-500" />
        </div>
        <h2 className="text-3xl font-display font-extrabold text-white mb-3">No Active Membership Plan</h2>
        <p className="text-gray-400 mb-8 max-w-md text-sm leading-relaxed">You haven't purchased a gym membership package yet. Browse our plans to start your fitness journey.</p>
        <Link to="/packages" className="px-8 py-3 bg-gradient-to-r from-emerald-500 to-green-400 text-black font-bold text-xs rounded-xl hover:from-emerald-400 hover:to-green-300 transition-all shadow-lg shadow-emerald-500/20">
          Browse Gym Packages
        </Link>
      </div>
    );
  }

  // Case 3: Active Approved Membership Exists
  const pkg = activePurchase.packageId;
  const activeFamilyMembers = activePurchase.familyMembers || [];

  return (
    <div className="pb-16 text-white max-w-4xl mx-auto space-y-8 relative min-h-[85vh]">
      {/* Ambient Glow */}
      <div className="absolute top-0 left-10 w-80 h-80 bg-emerald-500/10 blur-[130px] rounded-full pointer-events-none -z-10" />

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-[#0f0e13]/90 backdrop-blur-md border border-emerald-500/30 rounded-3xl p-7 md:p-8 shadow-2xl relative overflow-hidden"
      >
        <div className="relative z-10 space-y-6">
          <div className="flex items-center justify-between flex-wrap gap-4 pb-4 border-b border-white/10">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-emerald-500/20 text-emerald-400 text-xs font-extrabold uppercase tracking-wider rounded-full border border-emerald-500/30">
              <CheckCircle2 className="w-4 h-4" /> Active Membership
            </div>
            <span className="text-xs text-gray-400 font-mono">
              Activated: {new Date(activePurchase.createdAt || Date.now()).toLocaleDateString()}
            </span>
          </div>

          <div>
            <h1 className="text-3xl md:text-4xl font-display font-extrabold text-white">{pkg.name}</h1>
            <p className="text-gray-300 text-sm mt-2 max-w-2xl leading-relaxed">{pkg.description || 'Full gym facility access.'}</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 p-5 bg-white/[0.03] border border-white/10 rounded-2xl">
            <div>
              <p className="text-gray-500 text-xs uppercase font-medium mb-1">Duration</p>
              <p className="font-bold text-lg text-white">{pkg.duration || '1 Month'}</p>
            </div>
            <div>
              <p className="text-gray-500 text-xs uppercase font-medium mb-1">Price Paid</p>
              <p className="font-bold text-lg text-emerald-400">LKR {(pkg.price || 0).toLocaleString()}</p>
            </div>
            <div>
              <p className="text-gray-500 text-xs uppercase font-medium mb-1">Status</p>
              <p className="font-bold text-lg text-emerald-400 uppercase flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4" /> Paid & Verified
              </p>
            </div>
          </div>

          {/* Features / Benefits */}
          {(pkg.benefits || pkg.features) && (
            <div className="pt-2">
              <p className="text-xs font-bold text-gray-400 mb-3 uppercase tracking-wider">Included Plan Features & Benefits:</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {(pkg.benefits || pkg.features).map((feat: any, idx: number) => {
                  const label = typeof feat === 'string' ? feat : feat.name || feat;
                  return (
                    <div key={idx} className="flex items-center gap-2.5 px-3.5 py-2.5 bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 text-xs font-semibold rounded-xl">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                      <span>{label}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Registered Family Members if Family Package */}
          {activeFamilyMembers.length > 0 && (
            <div className="pt-4 border-t border-white/10 space-y-3">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-emerald-400" />
                <p className="text-xs font-bold uppercase tracking-wider text-emerald-400">
                  Registered Family Members ({activeFamilyMembers.length})
                </p>
              </div>
              <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-3">
                {activeFamilyMembers.map((m: any, idx: number) => (
                  <div key={idx} className="p-3 bg-black/40 border border-white/10 rounded-xl text-xs space-y-1">
                    <p className="font-bold text-white">{m.name}</p>
                    <p className="text-gray-400">
                      {m.relationship || 'Member'} {m.age ? `• Age ${m.age}` : ''}
                    </p>
                    {m.phone && <p className="text-gray-500 font-mono text-[11px]">{m.phone}</p>}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}
