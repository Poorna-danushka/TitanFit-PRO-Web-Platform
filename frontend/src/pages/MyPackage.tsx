import { useState, useEffect } from 'react';
import { purchaseAPI } from '../api/apiService';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ShieldAlert, CheckCircle2, Clock, Building2, AlertCircle, ArrowRight, Users } from 'lucide-react';

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

  if (loading) return <div className="text-white text-center py-20">Loading your package details...</div>;

  // Case 1: Pending Bank Transfer & No Active Membership
  if (!activePurchase && pendingPurchase) {
    const pendingPkg = pendingPurchase.packageId;
    const familyMembers = pendingPurchase.familyMembers || [];

    return (
      <div className="pb-12 text-white">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-br from-[#1a150d] via-gray-900 to-[#121110] border border-amber-500/30 rounded-3xl p-8 mb-12 relative overflow-hidden shadow-2xl"
        >
          <div className="absolute top-0 right-0 w-80 h-80 bg-amber-500/10 rounded-full blur-[90px] pointer-events-none" />

          <div className="relative z-10">
            <div className="flex items-center gap-2 mb-4 flex-wrap">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-500/20 text-amber-400 text-xs font-extrabold uppercase tracking-wider rounded-lg border border-amber-500/30">
                <Clock className="w-3.5 h-3.5" /> Payment Pending Verification
              </span>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-white/5 text-gray-300 text-xs font-semibold rounded-lg border border-white/10">
                <Building2 className="w-3.5 h-3.5 text-amber-400" /> Bank Transfer
              </span>
              {pendingPurchase.bankTransferReference && (
                <span className="text-xs font-mono text-amber-300/80 bg-black/40 px-3 py-1 rounded-lg border border-white/5">
                  Ref: {pendingPurchase.bankTransferReference}
                </span>
              )}
            </div>

            <h1 className="text-3xl md:text-4xl font-bold mb-2 text-white">
              Awaiting Administrator Approval
            </h1>
            <p className="text-gray-300 text-sm md:text-base mb-6 max-w-2xl leading-relaxed">
              Your bank transfer payment for <strong className="text-white font-semibold">{pendingPkg?.name || 'Gym Package'}</strong> has been recorded and submitted to gym administration for verification.
            </p>

            <div className="grid sm:grid-cols-3 gap-4 p-5 bg-black/40 border border-white/5 rounded-2xl mb-6">
              <div>
                <p className="text-gray-500 text-xs uppercase font-medium mb-0.5">Purchased Package</p>
                <p className="font-bold text-base text-white">{pendingPkg?.name || 'Selected Package'}</p>
              </div>
              <div>
                <p className="text-gray-500 text-xs uppercase font-medium mb-0.5">Amount Submitted</p>
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
              <div className="mb-6 p-5 bg-black/40 border border-amber-500/20 rounded-2xl">
                <div className="flex items-center gap-2 mb-3">
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

            <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-2xl flex items-start gap-3 text-xs text-amber-200 mb-6">
              <AlertCircle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold mb-0.5">Your bank transfer is awaiting administrator verification.</p>
                <p className="text-gray-300 leading-relaxed">
                  Your package membership features, trainer entitlements, attendance QR pass, and digital receipt will be unlocked immediately once an admin verifies your transfer.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap gap-4">
              <Link
                to="/dashboard"
                className="px-6 py-3 bg-white/10 hover:bg-white/20 text-white font-bold text-xs rounded-xl transition-all flex items-center gap-2 border border-white/10"
              >
                Go to Dashboard <ArrowRight className="w-3.5 h-3.5" />
              </Link>
              <Link
                to="/packages"
                className="px-6 py-3 bg-amber-500 hover:bg-amber-400 text-black font-bold text-xs rounded-xl transition-all shadow-md shadow-amber-500/20"
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
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
        <div className="w-24 h-24 bg-white/5 rounded-full flex items-center justify-center mb-6">
          <ShieldAlert className="w-12 h-12 text-gray-500" />
        </div>
        <h2 className="text-3xl font-bold text-white mb-4">No Active Package</h2>
        <p className="text-gray-400 mb-8 max-w-md">You haven't purchased any gym membership package yet. Browse our plans to get started.</p>
        <Link to="/packages" className="px-8 py-3 bg-green-500 text-black font-bold rounded-xl hover:bg-green-400 transition-colors shadow-[0_0_15px_rgba(34,197,94,0.3)]">
          View Packages
        </Link>
      </div>
    );
  }

  // Case 3: Active Approved Membership Exists
  const pkg = activePurchase.packageId;
  const activeFamilyMembers = activePurchase.familyMembers || [];

  return (
    <div className="pb-12 text-white">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gray-900 border border-white/10 rounded-3xl p-8 mb-12 relative overflow-hidden"
      >
        <div className="absolute top-0 right-0 w-64 h-64 bg-green-500/10 rounded-full blur-[80px]" />
        
        <div className="relative z-10">
          <div className="inline-block px-3 py-1 bg-green-500/20 text-green-400 text-xs font-bold uppercase tracking-wider rounded mb-4">
            Active Membership
          </div>
          <h1 className="text-4xl font-bold mb-4">{pkg.name}</h1>
          <p className="text-gray-400 text-lg mb-6 max-w-2xl">{pkg.description}</p>
          <div className="flex gap-8 mb-6">
            <div>
              <p className="text-gray-500 text-sm mb-1">Duration</p>
              <p className="font-bold text-xl">{pkg.duration || '1 Month'}</p>
            </div>
            <div>
              <p className="text-gray-500 text-sm mb-1">Price</p>
              <p className="font-bold text-xl text-green-400">LKR {(pkg.price || 0).toLocaleString()}</p>
            </div>
            <div>
              <p className="text-gray-500 text-sm mb-1">Status</p>
              <p className="font-bold text-xl text-green-400 uppercase">Paid / Active</p>
            </div>
          </div>

          {/* Features / Benefits */}
          {(pkg.benefits || pkg.features) && (
            <div className="pt-4 border-t border-gray-800 mb-6">
              <p className="text-xs font-semibold text-gray-400 mb-2 uppercase tracking-wider">Included Features & Perks:</p>
              <div className="flex flex-wrap gap-2">
                {(pkg.benefits || pkg.features).map((feat: any, idx: number) => {
                  const label = typeof feat === 'string' ? feat : feat.name || feat;
                  return (
                    <span key={idx} className="inline-flex items-center gap-1.5 px-3 py-1 bg-green-500/10 text-green-400 border border-green-500/20 text-xs font-semibold rounded-lg">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      {label}
                    </span>
                  );
                })}
              </div>
            </div>
          )}

          {/* Registered Family Members if Family Package */}
          {activeFamilyMembers.length > 0 && (
            <div className="pt-4 border-t border-gray-800">
              <div className="flex items-center gap-2 mb-3">
                <Users className="w-4 h-4 text-green-400" />
                <p className="text-xs font-bold uppercase tracking-wider text-green-400">
                  Registered Family Members ({activeFamilyMembers.length})
                </p>
              </div>
              <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-3">
                {activeFamilyMembers.map((m: any, idx: number) => (
                  <div key={idx} className="p-3 bg-gray-950 border border-gray-800 rounded-xl text-xs space-y-1">
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
