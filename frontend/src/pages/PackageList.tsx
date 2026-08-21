import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { packageAPI, purchaseAPI } from '../api/apiService';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, ShieldCheck, Zap, Sparkles } from 'lucide-react';
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
  
  const navigate = useNavigate();

  useEffect(() => {
    fetchPackages();
    fetchMyPurchases();
  }, []);

  const fetchMyPurchases = async () => {
    try {
      const response = await purchaseAPI.getMy();
      const purchases = response.data.purchases || [];
      const activePurchase = purchases.find((p: any) => p.status === 'paid' || p.status === 'pending');
      if (activePurchase && activePurchase.packageId) {
        setActivePackageId(activePurchase.packageId._id);
      }
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

  const handlePaymentSuccess = () => {
    setIsModalOpen(false);
    navigate('/my-package');
  };

  return (
    <Elements stripe={stripePromise}>
      <div className="pb-20 pt-8 text-white relative min-h-[80vh] flex flex-col justify-center">
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
            Upgrade your fitness journey with our curated, professional training packages designed for maximum results. Unlock your full potential today.
          </motion.p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-7xl mx-auto w-full px-4 relative z-10">
          <AnimatePresence>
            {packages.map((pkg, i) => {
              const isPopular = i === 1 || pkg.name.toLowerCase().includes('premium');
              const isHovered = hoveredPackage === pkg._id;
              const isActive = activePackageId === pkg._id;

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
                    ${isPopular 
                      ? 'bg-gradient-to-b from-gray-900 to-[#111] border-2 border-green-500/50 shadow-[0_0_40px_rgba(34,197,94,0.15)] md:-translate-y-4' 
                      : 'bg-[#111113] border border-white/5 hover:border-green-500/30'
                    }
                  `}
                >
                  {/* Highlight Glow on Hover */}
                  <div 
                    className="absolute inset-0 bg-gradient-to-b from-green-500/10 to-transparent opacity-0 transition-opacity duration-500 pointer-events-none" 
                    style={{ opacity: isHovered ? 1 : 0 }} 
                  />

                  {/* Popular Badge */}
                  {isPopular && (
                    <div className="absolute top-0 left-1/2 -translate-x-1/2 px-4 py-1.5 bg-gradient-to-r from-green-600 to-emerald-400 rounded-b-xl flex items-center gap-1 shadow-lg shadow-green-500/20">
                      <Sparkles className="w-3 h-3 text-white" />
                      <span className="text-xs font-bold text-white uppercase tracking-wider">Most Popular</span>
                    </div>
                  )}
                  
                  <div className={`p-8 pb-6 ${isPopular ? 'pt-10' : ''}`}>
                    <h3 className="text-2xl font-bold mb-3 text-white flex items-center gap-2">
                      {pkg.name}
                      {isPopular && <Zap className="w-5 h-5 text-green-400" />}
                    </h3>
                    <div className="flex items-end gap-1 mb-4">
                      <span className="text-4xl font-black tracking-tight">LKR {(pkg.price || 0).toLocaleString()}</span>
                      <span className="text-gray-400 font-medium mb-1.5">/{pkg.duration}</span>
                    </div>
                    <p className="text-gray-400 text-sm leading-relaxed pb-2">
                      {pkg.description}
                    </p>
                  </div>

                  <div className="h-[1px] w-full bg-gradient-to-r from-transparent via-white/10 to-transparent my-2" />

                  <div className="flex-1 p-8 pt-4 flex flex-col">
                    <h4 className="font-semibold text-sm mb-5 text-gray-300 flex items-center gap-2">
                      What's included
                      <div className="h-[1px] flex-1 bg-white/5 ml-2" />
                    </h4>
                    
                    <div className="space-y-4 mb-8 flex-1">
                      {(pkg.benefits || pkg.features || (pkg.exercises?.map((e: any) => e.name) || [])).slice(0, 6).map((item: any, idx: number) => {
                        const label = typeof item === 'string' ? item : item.name || item;
                        return (
                          <motion.div 
                            key={idx} 
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: (i * 0.1) + (idx * 0.05) }}
                            className="flex items-start gap-3 group/item"
                          >
                            <div className="w-5 h-5 mt-0.5 rounded-full bg-green-500/10 flex items-center justify-center shrink-0 group-hover/item:bg-green-500/20 transition-colors">
                              <Check className="w-3 h-3 text-green-400" strokeWidth={3} />
                            </div>
                            <span className="text-gray-300 text-sm leading-tight pt-0.5 group-hover/item:text-white transition-colors">{label}</span>
                          </motion.div>
                        );
                      })}
                    </div>
                    
                    <button
                      onClick={() => !isActive && handlePurchaseClick(pkg)}
                      disabled={isActive}
                      className={`
                        w-full py-4 rounded-xl font-bold transition-all duration-300 relative overflow-hidden group/btn
                        ${isActive
                          ? 'bg-gray-800 text-gray-500 cursor-not-allowed border border-gray-700'
                          : isPopular 
                            ? 'bg-gradient-to-r from-green-500 to-emerald-400 text-black shadow-[0_0_20px_rgba(34,197,94,0.3)] hover:shadow-[0_0_30px_rgba(34,197,94,0.5)] hover:-translate-y-0.5' 
                            : 'bg-white/5 text-white hover:bg-white/10 border border-white/10 hover:border-white/20'
                        }
                      `}
                    >
                      <span className="relative z-10 flex items-center justify-center gap-2">
                        {isActive ? 'Purchased' : 'Get Started Now'}
                      </span>
                      {!isActive && isPopular && (
                        <div className="absolute inset-0 bg-white/20 translate-y-[100%] group-hover/btn:translate-y-[0%] transition-transform duration-300 ease-out rounded-xl" />
                      )}
                    </button>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
        
        {selectedPkg && (
          <PaymentModal
            isOpen={isModalOpen}
            onClose={() => setIsModalOpen(false)}
            onSuccess={handlePaymentSuccess}
            packageId={selectedPkg._id}
            packageName={selectedPkg.name}
            price={selectedPkg.price}
          />
        )}
      </div>
    </Elements>
  );
}
