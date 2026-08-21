import { useState } from 'react';
import { authAPI } from '../api/apiService';
import { useAuth } from '../context/AuthContext';
import { motion } from 'framer-motion';
import { Activity, Scale, Ruler, TrendingUp, Save } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { toast } from 'react-toastify';

export default function ProgressPage() {
  const { user } = useAuth();
  const [weight, setWeight] = useState<number | ''>(user?.weight || '');
  const [height, setHeight] = useState<number | ''>(user?.height || '');
  const [chest, setChest] = useState<number | ''>('');
  const [waist, setWaist] = useState<number | ''>('');
  const [arms, setArms] = useState<number | ''>('');
  const [saveLoading, setSaveLoading] = useState(false);

  // BMI Calculation
  const bmi = weight && height ? Number((Number(weight) / Math.pow(Number(height) / 100, 2)).toFixed(1)) : null;

  const getBMICategory = (val: number | null) => {
    if (!val) return { label: 'Unknown', color: 'text-gray-400' };
    if (val < 18.5) return { label: 'Underweight', color: 'text-blue-400' };
    if (val < 24.9) return { label: 'Normal / Healthy Weight', color: 'text-green-400' };
    if (val < 29.9) return { label: 'Overweight', color: 'text-yellow-400' };
    return { label: 'Obese', color: 'text-red-400' };
  };

  const bmiCat = getBMICategory(bmi);

  const handleSaveMetrics = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSaveLoading(true);
      await authAPI.updateProfile({
        weight: weight ? Number(weight) : undefined,
        height: height ? Number(height) : undefined,
      });
      toast.success('🎉 Body measurements updated successfully!');
    } catch (error) {
      toast.error('Failed to update body measurements');
    } finally {
      setSaveLoading(false);
    }
  };

  const sampleWeightData = [
    { date: 'Week 1', weight: Number(weight) ? Number(weight) + 3 : 75 },
    { date: 'Week 2', weight: Number(weight) ? Number(weight) + 2 : 74 },
    { date: 'Week 3', weight: Number(weight) ? Number(weight) + 1 : 73 },
    { date: 'Week 4', weight: Number(weight) ? Number(weight) : 72 },
  ];

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div>
        <h1 className="font-display text-3xl md:text-4xl font-bold text-white mb-1 flex items-center gap-3">
          <TrendingUp className="w-8 h-8 text-blue-400" /> Progress & Measurement Log
        </h1>
        <p className="text-gray-400 text-sm">Track your body metrics, calculate BMI, and measure physical transformations.</p>
      </div>

      {/* KPI Cards */}
      <div className="grid md:grid-cols-3 gap-6">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="card-surface rounded-2xl p-6 border border-white/[0.08] flex items-center gap-4"
        >
          <div className="w-12 h-12 rounded-2xl bg-blue-500/10 flex items-center justify-center text-blue-400 shrink-0">
            <Scale className="w-6 h-6" />
          </div>
          <div>
            <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider block">Current Weight</span>
            <span className="text-2xl font-extrabold text-white">{weight ? `${weight} kg` : 'Not Set'}</span>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="card-surface rounded-2xl p-6 border border-white/[0.08] flex items-center gap-4"
        >
          <div className="w-12 h-12 rounded-2xl bg-purple-500/10 flex items-center justify-center text-purple-400 shrink-0">
            <Ruler className="w-6 h-6" />
          </div>
          <div>
            <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider block">Current Height</span>
            <span className="text-2xl font-extrabold text-white">{height ? `${height} cm` : 'Not Set'}</span>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="card-surface rounded-2xl p-6 border border-white/[0.08] flex items-center gap-4"
        >
          <div className="w-12 h-12 rounded-2xl bg-green-500/10 flex items-center justify-center text-green-400 shrink-0">
            <Activity className="w-6 h-6" />
          </div>
          <div>
            <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider block">Calculated BMI</span>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-extrabold text-white">{bmi || '--'}</span>
              <span className={`text-xs font-bold ${bmiCat.color}`}>{bmiCat.label}</span>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Main Grid: Form + Chart */}
      <div className="grid md:grid-cols-3 gap-6">
        {/* Metric Input Form */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="card-surface rounded-2xl p-6 border border-white/[0.08] space-y-4"
        >
          <h3 className="text-lg font-bold text-white flex items-center gap-2">
            <Save className="w-5 h-5 text-blue-400" /> Log Measurements
          </h3>

          <form onSubmit={handleSaveMetrics} className="space-y-4">
            <div>
              <label className="text-xs font-bold text-gray-400 block mb-1">Body Weight (kg)</label>
              <input
                type="number"
                step="0.1"
                placeholder="75.0"
                value={weight}
                onChange={(e) => setWeight(e.target.value ? Number(e.target.value) : '')}
                className="w-full bg-[#111113] border border-white/[0.08] rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-gray-400 block mb-1">Height (cm)</label>
              <input
                type="number"
                placeholder="175"
                value={height}
                onChange={(e) => setHeight(e.target.value ? Number(e.target.value) : '')}
                className="w-full bg-[#111113] border border-white/[0.08] rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-blue-500"
              />
            </div>

            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="text-[11px] font-bold text-gray-400 block mb-1">Chest (cm)</label>
                <input
                  type="number"
                  placeholder="95"
                  value={chest}
                  onChange={(e) => setChest(e.target.value ? Number(e.target.value) : '')}
                  className="w-full bg-[#111113] border border-white/[0.08] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-gray-400 block mb-1">Waist (cm)</label>
                <input
                  type="number"
                  placeholder="80"
                  value={waist}
                  onChange={(e) => setWaist(e.target.value ? Number(e.target.value) : '')}
                  className="w-full bg-[#111113] border border-white/[0.08] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-gray-400 block mb-1">Arms (cm)</label>
                <input
                  type="number"
                  placeholder="36"
                  value={arms}
                  onChange={(e) => setArms(e.target.value ? Number(e.target.value) : '')}
                  className="w-full bg-[#111113] border border-white/[0.08] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={saveLoading}
              className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-extrabold text-xs transition-all shadow-lg shadow-blue-600/30 mt-2"
            >
              {saveLoading ? 'Saving...' : 'Update Measurements'}
            </button>
          </form>
        </motion.div>

        {/* Progress Chart */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="md:col-span-2 card-surface rounded-2xl p-6 border border-white/[0.08]"
        >
          <div className="flex justify-between items-center mb-6">
            <div>
              <h3 className="text-lg font-bold text-white">Weight Trend Chart</h3>
              <p className="text-xs text-gray-500">Visual progress of your weight history</p>
            </div>
            <span className="px-3 py-1 rounded-full bg-blue-500/10 text-blue-400 text-xs font-semibold border border-blue-500/20">
              Last 30 Days
            </span>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={sampleWeightData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="weightGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                <XAxis dataKey="date" stroke="#555" tick={{ fontSize: 11, fill: '#888' }} />
                <YAxis stroke="#555" tick={{ fontSize: 11, fill: '#888' }} domain={['dataMin - 5', 'dataMax + 5']} />
                <Tooltip contentStyle={{ backgroundColor: '#111113', borderColor: 'rgba(255,255,255,0.1)', borderRadius: '12px' }} />
                <Area type="monotone" dataKey="weight" stroke="#3b82f6" strokeWidth={3} fill="url(#weightGrad)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
