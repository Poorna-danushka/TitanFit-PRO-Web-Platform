import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { packageAPI, purchaseAPI } from '../api/apiService';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, X, ShieldCheck, Zap, Sparkles, Award, Clock } from 'lucide-react';
import { Elements } from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';
import PaymentModal from '../components/PaymentModal';

// Initialize Stripe outside component to avoid recreating the Stripe object on every render
const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || 'pk_test_placeholder');

export default function PackageList() {
  const [packages, setPackages] = useState<any[]>([]);
  const [selectedPkg, setSelectedPkg] = useState<any | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [hoveredPackage, setHoveredPackage] = useState<string | null>(null);
  const [activePackageId, setActivePackageId] = useState<string | null>(null);
  const [pendingPackageIds, setPendingPackageIds] = useState<string[]>([]);
  
  const navigate = useNavigate();

  useEffect(() => {
    fetchPackages();
    fetchMyPurchases();
  }, []);

  const fetchMyPurchases = async () => {
    try {
      const response = await purchaseAPI.getMy();
      const purchases = response.data?.purchases || [];
      const activePurchases = response.data?.activePurchases || purchases.filter((p: any) => p.status === 'paid');
      const pendingPurchases = response.data?.pendingPurchases || purchases.filter(
        (p: any) => ['pending_approval', 'pending_verification', 'pending'].includes(p.status) && p.paymentMethod === 'bank_transfer'
      );

      if (activePurchases.length > 0 && activePurchases[0].packageId) {
        setActivePackageId(activePurchases[0].packageId._id || activePurchases[0].packageId);
      } else {
        setActivePackageId(null);
      }

      const pendingIds = pendingPurchases
        .map((p: any) => p.packageId?._id || p.packageId)
        .filter(Boolean);
      setPendingPackageIds(pendingIds);
    } catch (error) {
      console.error('Error fetching my purchases', error);
    }
  };

  const fetchPackages = async () => {
    try {
      const response = await packageAPI.getAll();
      setPackages(response.data.packages || []);
    } catch (error) {
      console.error('Error fetching packages', error);
    }
  };

  const handlePurchaseClick = (pkg: any) => {
    setSelectedPkg(pkg);
    setIsModalOpen(true);
  };

  const handlePaymentSuccess = (data?: any) => {
    setIsModalOpen(false);
    fetchMyPurchases();

    // Check if this was a bank transfer (pending verification)
    const isBankTransfer = data?.purchase?.paymentMethod === 'bank_transfer' || data?.purchase?.status === 'pending_approval';

    if (isBankTransfer) {
      navigate('/my-package');
      return;
    }

    // Card payment (instant activation)
    const hasPT = Boolean(
      data?.hasPersonalTrainer ||
      data?.isEligibleForTrainer ||
      data?.hasPersonalTrainerAccess ||
      selectedPkg?.hasPersonalTrainer ||
      (selectedPkg?.benefits || []).some((b: string) => /trainer|1-on-1|pt/i.test(b)) ||
      /vip|pro|elite|trainer/i.test(selectedPkg?.name || '')
    );

    if (hasPT) {
      navigate('/trainers');
    } else {
      navigate('/dashboard');
    }
  };

  return (
    <Elements stripe={stripePromise}>
      <div className="pb-24 pt-8 text-white relative min-h-[80vh] flex flex-col justify-center">
        {/* Background Ambient Glows */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-4xl h-96 bg-green-500/10 blur-[120px] rounded-full pointer-events-none -z-10" />
        <div className="absolute bottom-0 right-0 w-96 h-96 bg-emerald-600/10 blur-[100px] rounded-full pointer-events-none -z-10" />

        <div className="mb-16 text-center max-w-3xl mx-auto relative z-10">
          <motion.div 
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", stiffness: 200, damping: 15 }}
            className="inline-flex items-center justify-center p-3 bg-green-500/10 rounded-2xl mb-6 ring-1 ring-green-500/30"
          >
            <ShieldCheck className="w-8 h-8 text-green-400" />
          </motion.div>
          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-5xl md:text-6xl font-extrabold mb-6 tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white via-gray-200 to-gray-500"
          >
            Select Your Plan
          </motion.h1>
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-lg text-gray-400 leading-relaxed"
          >
            Upgrade your fitness journey with our curated packages. Clearly compare features, including dedicated 1-on-1 Personal Trainer entitlements.
          </motion.p>
        </div>

        {/* ─── PACKAGE CARDS ─────────────────────────────────────────────── */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-7xl mx-auto w-full px-4 relative z-10 mb-20">
          <AnimatePresence>
            {packages.map((pkg, i) => {
              const isPopular = i === 1 || pkg.name.toLowerCase().includes('premium') || pkg.name.toLowerCase().includes('pro');
              const isHovered = hoveredPackage === pkg._id;
              const isActive = activePackageId === pkg._id;
              const isPending = pendingPackageIds.includes(pkg._id);
              const hasPT = Boolean(
                pkg.hasPersonalTrainer === true ||
                pkg.maxPTSessions > 0 ||
                (pkg.benefits || []).some((b: string) => /trainer|1-on-1|pt/i.test(b)) ||
                /vip|pro|elite|trainer/i.test(pkg.name)
              );

              return (
                <motion.div
                  key={pkg._id}
                  initial={{ opacity: 0, y: 40 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.15, type: "spring", stiffness: 100 }}
                  onHoverStart={() => setHoveredPackage(pkg._id)}
                  onHoverEnd={() => setHoveredPackage(null)}
                  className={`
                    relative rounded-3xl flex flex-col overflow-hidden transition-all duration-500
                    ${hasPT
                      ? 'bg-gradient-to-b from-[#161224] to-[#0c0c10] border-2 border-purple-500/40 shadow-[0_0_40px_rgba(147,51,234,0.12)] md:-translate-y-2'
                      : isPopular 
                      ? 'bg-gradient-to-b from-gray-900 to-[#111] border-2 border-green-500/50 shadow-[0_0_40px_rgba(34,197,94,0.15)] md:-translate-y-2' 
                      : 'bg-[#111113] border border-white/5 hover:border-green-500/30'
                    }
                  `}
                >
                  {/* Highlight Glow on Hover */}
                  <div 
                    className="absolute inset-0 bg-gradient-to-b from-green-500/10 to-transparent opacity-0 transition-opacity duration-500 pointer-events-none" 
                    style={{ opacity: isHovered ? 1 : 0 }} 
                  />

                  {/* Badges */}
                  {isPending ? (
                    <div className="absolute top-0 left-1/2 -translate-x-1/2 px-4 py-1 bg-amber-500 text-black rounded-b-xl flex items-center gap-1.5 shadow-lg shadow-amber-500/20">
                      <Clock className="w-3 h-3" />
                      <span className="text-[10px] font-black uppercase tracking-wider">Pending Verification</span>
                    </div>
                  ) : hasPT ? (
                    <div className="absolute top-0 left-1/2 -translate-x-1/2 px-4 py-1 bg-gradient-to-r from-purple-600 to-indigo-600 rounded-b-xl flex items-center gap-1.5 shadow-lg shadow-purple-500/20">
                      <Award className="w-3.5 h-3.5 text-yellow-300" />
                      <span className="text-[10px] font-black text-white uppercase tracking-wider">Personal Trainer Included</span>
                    </div>
                  ) : isPopular ? (
                    <div className="absolute top-0 left-1/2 -translate-x-1/2 px-4 py-1 bg-gradient-to-r from-green-600 to-emerald-400 rounded-b-xl flex items-center gap-1 shadow-lg shadow-green-500/20">
                      <Sparkles className="w-3 h-3 text-white" />
                      <span className="text-[10px] font-black text-white uppercase tracking-wider">Most Popular</span>
                    </div>
                  ) : null}
                  
                  <div className={`p-8 pb-5 ${hasPT || isPopular || isPending ? 'pt-9' : ''}`}>
                    <h3 className="text-2xl font-bold mb-2 text-white flex items-center gap-2">
                      {pkg.name}
                      {isPopular && !hasPT && <Zap className="w-5 h-5 text-green-400" />}
                      {hasPT && <Award className="w-5 h-5 text-purple-400" />}
                    </h3>
                    <div className="flex items-end gap-1 mb-3">
                      <span className="text-3xl font-black tracking-tight">LKR {(pkg.price || 0).toLocaleString()}</span>
                      <span className="text-gray-400 font-medium mb-1 text-xs">/{pkg.duration || '1 Month'}</span>
                    </div>
                    <p className="text-gray-400 text-xs leading-relaxed">
                      {pkg.description || 'Comprehensive gym access and structured progression.'}
                    </p>
                  </div>

                  <div className="h-[1px] w-full bg-gradient-to-r from-transparent via-white/10 to-transparent my-1" />

                  <div className="flex-1 p-8 pt-4 flex flex-col justify-between">
                    <div>
                      <h4 className="font-bold text-xs uppercase tracking-wider mb-4 text-gray-400 flex items-center gap-2">
                        Plan Features & Entitlements
                      </h4>
                      
                      <div className="space-y-3 mb-6">
                        {/* Standard Base Features */}
                        <div className="flex items-center gap-3">
                          <div className="w-4 h-4 rounded-full bg-green-500/10 flex items-center justify-center shrink-0">
                            <Check className="w-3 h-3 text-green-400" strokeWidth={3} />
                          </div>
                          <span className="text-gray-300 text-xs">Full Gym Floor & Equipment Access</span>
                        </div>

                        <div className="flex items-center gap-3">
                          <div className="w-4 h-4 rounded-full bg-green-500/10 flex items-center justify-center shrink-0">
                            <Check className="w-3 h-3 text-green-400" strokeWidth={3} />
                          </div>
                          <span className="text-gray-300 text-xs">Workout Library & Mobile App Tracking</span>
                        </div>

                        {/* Explicit Personal Trainer Feature */}
                        <div className="flex items-center gap-3">
                          <div className={`w-4 h-4 rounded-full flex items-center justify-center shrink-0 ${hasPT ? 'bg-purple-500/20 text-purple-400' : 'bg-red-500/10 text-red-400'}`}>
                            {hasPT ? (
                              <Check className="w-3 h-3 text-purple-400" strokeWidth={3} />
                            ) : (
                              <X className="w-3 h-3 text-red-400" strokeWidth={3} />
                            )}
                          </div>
                          <span className={`text-xs font-semibold ${hasPT ? 'text-purple-300' : 'text-gray-500 line-through'}`}>
                            {hasPT ? 'Dedicated 1-on-1 Personal Trainer' : 'Personal Trainer (Not Included)'}
                          </span>
                        </div>

                        {/* Explicit Trainer Sessions Feature */}
                        <div className="flex items-center gap-3">
                          <div className={`w-4 h-4 rounded-full flex items-center justify-center shrink-0 ${hasPT ? 'bg-purple-500/20 text-purple-400' : 'bg-red-500/10 text-red-400'}`}>
                            {hasPT ? (
                              <Check className="w-3 h-3 text-purple-400" strokeWidth={3} />
                            ) : (
                              <X className="w-3 h-3 text-red-400" strokeWidth={3} />
                            )}
                          </div>
                          <span className={`text-xs font-semibold ${hasPT ? 'text-purple-300' : 'text-gray-500 line-through'}`}>
                            {hasPT ? `${pkg.maxPTSessions || 8} 1-on-1 Trainer Sessions / Month` : 'Trainer Sessions (Not Included)'}
                          </span>
                        </div>

                        {/* Additional benefits from package */}
                        {(pkg.benefits || []).filter((b: string) => !/trainer|1-on-1|pt/i.test(b)).slice(0, 2).map((item: string, idx: number) => (
                          <div key={idx} className="flex items-center gap-3">
                            <div className="w-4 h-4 rounded-full bg-green-500/10 flex items-center justify-center shrink-0">
                              <Check className="w-3 h-3 text-green-400" strokeWidth={3} />
                            </div>
                            <span className="text-gray-300 text-xs">{item}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                    
                    <button
                      onClick={() => {
                        if (isPending) {
                          navigate('/my-package');
                        } else if (!isActive) {
                          handlePurchaseClick(pkg);
                        }
                      }}
                      disabled={isActive}
                      className={`
                        w-full py-3.5 rounded-xl font-bold text-xs transition-all duration-300 relative overflow-hidden group/btn
                        ${isActive
                          ? 'bg-gray-800 text-gray-500 cursor-not-allowed border border-gray-700'
                          : isPending
                            ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 hover:bg-amber-500/30'
                            : hasPT
                              ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-lg shadow-purple-600/30 hover:shadow-purple-600/50 hover:-translate-y-0.5'
                              : isPopular 
                              ? 'bg-gradient-to-r from-green-500 to-emerald-400 text-black shadow-[0_0_20px_rgba(34,197,94,0.3)] hover:shadow-[0_0_30px_rgba(34,197,94,0.5)] hover:-translate-y-0.5' 
                              : 'bg-white/5 text-white hover:bg-white/10 border border-white/10 hover:border-white/20'
                        }
                      `}
                    >
                      <span className="relative z-10 flex items-center justify-center gap-2">
                        {isActive ? (
                          'Current Plan'
                        ) : isPending ? (
                          <>
                            <Clock className="w-3.5 h-3.5 text-amber-400" /> Pending Verification
                          </>
                        ) : hasPT ? (
                          'Get PT Plan'
                        ) : (
                          'Choose Plan'
                        )}
                      </span>
                    </button>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>

        {/* ─── FEATURE COMPARISON TABLE ──────────────────────────────────── */}
        <div className="max-w-5xl mx-auto w-full px-4 relative z-10">
          <div className="bg-[#111115]/90 border border-white/10 rounded-3xl p-6 md:p-8 shadow-2xl overflow-hidden">
            <div className="mb-6 text-center">
              <h3 className="text-xl md:text-2xl font-bold text-white mb-1">
                Plan Entitlement Comparison
              </h3>
              <p className="text-xs text-gray-400">
                Transparent feature breakdown. Personal Trainer access is strictly plan-entitled.
              </p>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-white/10 text-gray-400 font-bold uppercase tracking-wider">
                    <th className="py-3 px-4">Feature</th>
                    <th className="py-3 px-4 text-center">Basic / Standard</th>
                    <th className="py-3 px-4 text-center text-purple-400">Pro / VIP (PT Included)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 text-gray-300">
                  <tr>
                    <td className="py-3 px-4 font-semibold text-white">Full Gym Floor Access</td>
                    <td className="py-3 px-4 text-center text-green-400 font-bold">✓ Included</td>
                    <td className="py-3 px-4 text-center text-green-400 font-bold">✓ Included</td>
                  </tr>
                  <tr>
                    <td className="py-3 px-4 font-semibold text-white">Workout & Routine Tracking</td>
                    <td className="py-3 px-4 text-center text-green-400 font-bold">✓ Included</td>
                    <td className="py-3 px-4 text-center text-green-400 font-bold">✓ Included</td>
                  </tr>
                  <tr>
                    <td className="py-3 px-4 font-semibold text-white">Progress & Streak Analytics</td>
                    <td className="py-3 px-4 text-center text-green-400 font-bold">✓ Included</td>
                    <td className="py-3 px-4 text-center text-green-400 font-bold">✓ Included</td>
                  </tr>
                  <tr className="bg-purple-950/20">
                    <td className="py-3 px-4 font-bold text-purple-300">Dedicated 1-on-1 Personal Trainer</td>
                    <td className="py-3 px-4 text-center text-red-400 font-bold">✕ No Access</td>
                    <td className="py-3 px-4 text-center text-purple-400 font-bold">✓ Unlocked</td>
                  </tr>
                  <tr className="bg-purple-950/20">
                    <td className="py-3 px-4 font-bold text-purple-300">Included 1-on-1 PT Sessions</td>
                    <td className="py-3 px-4 text-center text-red-400 font-bold">✕ 0 Sessions</td>
                    <td className="py-3 px-4 text-center text-purple-400 font-bold">✓ 8 – 16 Sessions / Mo</td>
                  </tr>
                  <tr>
                    <td className="py-3 px-4 font-semibold text-white">Coach Slot Availability & Booking</td>
                    <td className="py-3 px-4 text-center text-red-400 font-bold">✕ Inactive</td>
                    <td className="py-3 px-4 text-center text-purple-400 font-bold">✓ Live Booking</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
        
        {selectedPkg && (
          <PaymentModal
            isOpen={isModalOpen}
            onClose={() => setIsModalOpen(false)}
            onSuccess={handlePaymentSuccess}
            packageId={selectedPkg._id}
            packageName={selectedPkg.name}
            price={selectedPkg.price}
            isFamilyPackage={Boolean(selectedPkg.isFamilyPackage || selectedPkg.name?.toLowerCase().includes('family'))}
          />
        )}
      </div>
    </Elements>
  );
}

