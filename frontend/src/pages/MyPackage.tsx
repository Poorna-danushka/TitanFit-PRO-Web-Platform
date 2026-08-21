import { useState, useEffect } from 'react';
import { purchaseAPI, workoutAPI } from '../api/apiService';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { PlayCircle, ShieldAlert, CheckCircle2 } from 'lucide-react';

export default function MyPackage() {
  const [purchase, setPurchase] = useState<any>(null);
  const [todayCompletedIds, setTodayCompletedIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMyPackage();
  }, []);

  const fetchMyPackage = async () => {
    try {
      const [pRes, wRes] = await Promise.all([
        purchaseAPI.getMy(),
        workoutAPI.getMy().catch(() => ({ data: { workouts: [] } }))
      ]);

      if (pRes.data.purchases && pRes.data.purchases.length > 0) {
        setPurchase(pRes.data.purchases[0]);
      }

      const workouts = wRes.data?.workouts || [];
      const todayStr = new Date().toDateString();
      const completedIds = new Set(
        workouts
          .filter((w: any) => new Date(w.date || w.createdAt).toDateString() === todayStr)
          .map((w: any) => w.exerciseId?._id || w.exerciseId)
      );
      setTodayCompletedIds(completedIds as Set<string>);
    } catch (error) {
      console.error('Error fetching my package', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="text-white text-center py-20">Loading your journey...</div>;

  if (!purchase) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
        <div className="w-24 h-24 bg-white/5 rounded-full flex items-center justify-center mb-6">
          <ShieldAlert className="w-12 h-12 text-gray-500" />
        </div>
        <h2 className="text-3xl font-bold text-white mb-4">No Active Package</h2>
        <p className="text-gray-400 mb-8 max-w-md">You haven't purchased any fitness packages yet. Browse our premium plans to start your journey.</p>
        <Link to="/packages" className="px-8 py-3 bg-green-500 text-black font-bold rounded-xl hover:bg-green-400 transition-colors shadow-[0_0_15px_rgba(34,197,94,0.3)]">
          View Packages
        </Link>
      </div>
    );
  }

  const pkg = purchase.packageId;

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
            Active Plan
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
              <p className="text-gray-500 text-sm mb-1">Plan Features</p>
              <p className="font-bold text-xl">{(pkg.benefits || pkg.features || []).length || pkg.exercises?.length || 0}</p>
            </div>
          </div>

          {(pkg.benefits || pkg.features) && (
            <div className="pt-4 border-t border-gray-800">
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
        </div>
      </motion.div>

      <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
        <PlayCircle className="text-green-500" /> Your Workout Plan
      </h2>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {pkg.exercises?.map((ex: any, i: number) => {
          const isCompleted = todayCompletedIds.has(ex._id);
          return (
          <motion.div 
            key={ex._id}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: i * 0.1 }}
            className={`group block bg-gray-900 border ${isCompleted ? 'border-green-500/30 opacity-60 grayscale-[0.8]' : 'border-gray-800 hover:border-green-500 hover:-translate-y-1'} rounded-2xl overflow-hidden transition-all`}
          >
            <div className="h-48 overflow-hidden relative">
              <img src={ex.image || 'https://images.unsplash.com/photo-1517836357463-d25dfeac3438?auto=format&fit=crop&w=800&q=80'} alt={ex.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500 opacity-70 group-hover:opacity-100" />
              <div className="absolute inset-0 bg-gradient-to-t from-gray-900 to-transparent" />
              <div className="absolute bottom-4 left-4 flex gap-2 flex-wrap">
                <span className="px-2 py-1 bg-black/50 backdrop-blur-md text-white text-xs font-bold rounded uppercase tracking-wider border border-white/10">
                  {ex.muscleGroup}
                </span>
                {ex.packageConfig?.difficulty && (
                  <span className={`px-2 py-1 text-xs font-bold rounded uppercase tracking-wider border backdrop-blur-md ${
                    ex.packageConfig.difficulty === 'advanced' 
                      ? 'bg-red-500/30 text-red-300 border-red-500/30'
                      : ex.packageConfig.difficulty === 'intermediate'
                      ? 'bg-orange-500/30 text-orange-300 border-orange-500/30'
                      : 'bg-green-500/30 text-green-300 border-green-500/30'
                  }`}>
                    {ex.packageConfig.difficulty}
                  </span>
                )}
              </div>
            </div>
            <div className="p-6">
              <div className="flex items-start justify-between mb-2">
                <h3 className="text-xl font-bold flex-1">{ex.name}</h3>
                {ex.packageConfig?.order != null && (
                  <span className="text-2xl font-bold text-green-500">{ex.packageConfig.order + 1}</span>
                )}
              </div>
              <p className="text-gray-400 text-sm line-clamp-2 mb-4">{ex.description}</p>
              
              {/* Exercise Config Details */}
              {ex.packageConfig && (
                <div className="mb-4 p-3 bg-gray-800/50 rounded-lg">
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    {ex.packageConfig.reps && (
                      <div>
                        <p className="text-gray-500">Reps</p>
                        <p className="font-bold text-green-400">{ex.packageConfig.reps}</p>
                      </div>
                    )}
                    {ex.packageConfig.sets && (
                      <div>
                        <p className="text-gray-500">Sets</p>
                        <p className="font-bold text-blue-400">{ex.packageConfig.sets}</p>
                      </div>
                    )}
                    {ex.packageConfig.duration && (
                      <div>
                        <p className="text-gray-500">Duration</p>
                        <p className="font-bold text-purple-400">{ex.packageConfig.duration} min</p>
                      </div>
                    )}
                    {ex.packageConfig.notes && (
                      <div className="col-span-2">
                        <p className="text-gray-500">Notes</p>
                        <p className="font-bold text-gray-300 text-xs">{ex.packageConfig.notes}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}
              
              {isCompleted ? (
                <div className="w-full py-3 bg-green-500/10 border border-green-500/30 rounded-xl font-bold flex items-center justify-center gap-2 text-green-400">
                  Completed Today <CheckCircle2 className="w-4 h-4" />
                </div>
              ) : (
                <Link 
                  to={`/exercises/${ex._id}`}
                  state={{ packageConfig: ex.packageConfig }}
                  className="w-full py-3 bg-white/5 border border-white/10 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-green-500 hover:text-black hover:border-green-500 transition-all"
                >
                  Start Exercise <PlayCircle className="w-4 h-4" />
                </Link>
              )}
            </div>
          </motion.div>
        )})}
      </div>
    </div>
  );
}
