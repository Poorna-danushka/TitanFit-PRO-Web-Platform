import React, { useState, useEffect } from 'react';
import { Check, AlertCircle, Sparkles } from 'lucide-react';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { packageAPI, membershipAPI } from '../api/apiService';
import { useNavigate } from 'react-router-dom';

interface Package {
  _id: string;
  name: string;
  price: number;
  duration: string;
  description: string;
  benefits?: string[];
  features?: string[];
}

export const Pricing: React.FC = () => {
  const [packages, setPackages] = useState<Package[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    fetchPlans();
  }, []);

  const fetchPlans = async () => {
    try {
      setLoading(true);
      const response = await packageAPI.getAll();
      let list = response.data.packages || [];
      if (list.length === 0) {
        const memRes = await membershipAPI.getPlans();
        list = memRes.data.plans || [];
      }
      setPackages(list);
    } catch (error) {
      console.error('Failed to fetch pricing plans:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectPackage = () => {
    navigate('/packages');
  };

  if (loading) return <LoadingSpinner fullScreen message="Loading membership plans..." />;

  return (
    <div className="min-h-screen bg-black text-white py-16 px-4">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-green-500/10 border border-green-500/20 text-green-400 text-sm font-semibold mb-4">
            <Sparkles className="w-4 h-4" /> GymFit Pro Memberships
          </div>
          <h1 className="text-4xl md:text-5xl font-extrabold mb-4 tracking-tight">
            Transparent Gym Membership Pricing
          </h1>
          <p className="text-xl text-gray-400 max-w-2xl mx-auto">
            Choose the ideal membership plan tailored to your fitness goals and workout preferences.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 mb-16">
          {packages.map((pkg) => {
            const features = pkg.benefits || pkg.features || ['Gym Access', 'Locker Access', 'Fitness Assessment'];
            return (
              <div
                key={pkg._id}
                className="relative bg-gray-900/80 rounded-3xl border border-gray-800 p-8 flex flex-col hover:border-green-500/40 transition-all duration-300 shadow-xl"
              >
                <div className="mb-6">
                  <h3 className="text-2xl font-bold text-white mb-2">{pkg.name}</h3>
                  <p className="text-gray-400 text-sm leading-relaxed mb-6">{pkg.description}</p>

                  <div className="flex items-end gap-1 mb-6">
                    <span className="text-4xl font-extrabold text-white">LKR {(pkg.price || 0).toLocaleString()}</span>
                    <span className="text-gray-400 text-sm mb-1">/ {pkg.duration || 'Month'}</span>
                  </div>

                  <button
                    onClick={handleSelectPackage}
                    className="w-full py-3 bg-green-500 text-black font-bold rounded-xl hover:bg-green-400 transition-all shadow-[0_0_20px_rgba(34,197,94,0.3)] mb-8"
                  >
                    Select Plan
                  </button>

                  <div className="space-y-3 border-t border-gray-800 pt-6">
                    {features.map((feat: any, idx: number) => {
                      const label = typeof feat === 'string' ? feat : feat.name || feat;
                      return (
                        <div key={idx} className="flex items-center gap-3">
                          <Check className="w-4 h-4 text-green-400 shrink-0" />
                          <span className="text-gray-300 text-sm">{label}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="bg-gray-900 border border-gray-800 p-6 rounded-2xl max-w-3xl mx-auto flex items-start gap-4">
          <AlertCircle className="w-6 h-6 text-green-400 shrink-0 mt-0.5" />
          <div>
            <h4 className="font-bold text-white mb-1">Need help selecting a plan?</h4>
            <p className="text-gray-400 text-sm">
              Ask our database-aware FitBot AI Assistant anytime or visit our reception desk for guidance!
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Pricing;
