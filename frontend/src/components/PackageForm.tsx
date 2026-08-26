import React, { useState, useEffect } from 'react';
import { packageAPI } from '../api/apiService';
import { motion } from 'framer-motion';
import { Plus, Trash2 } from 'lucide-react';

interface PackageFormProps {
  onClose: () => void;
  onSave: () => void;
  packageId?: string;
}

export default function PackageForm({ onClose, onSave, packageId }: PackageFormProps) {
  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    price: 0,
    duration: '30 days',
    description: '',
    level: 'intermediate',
    image: '',
    benefits: ['Gym Floor Access', 'Locker Room Access'] as string[],
    hasPersonalTrainer: false,
    maxPTSessions: 0,
    isFamilyPackage: false,
    maxFamilyMembers: 4,
  });

  useEffect(() => {
    if (packageId) {
      fetchPackage();
    }
  }, [packageId]);

  const fetchPackage = async () => {
    try {
      const response = await packageAPI.getById(packageId || '');
      const pkg = response.data.package;
      setFormData({
        name: pkg.name || '',
        price: pkg.price || 0,
        duration: pkg.duration || '30 days',
        description: pkg.description || '',
        level: pkg.level || 'intermediate',
        image: pkg.image || '',
        benefits: pkg.benefits?.length ? pkg.benefits : ['Gym Floor Access'],
        hasPersonalTrainer: Boolean(pkg.hasPersonalTrainer),
        maxPTSessions: pkg.maxPTSessions || 0,
        isFamilyPackage: Boolean(pkg.isFamilyPackage || pkg.name?.toLowerCase().includes('family')),
        maxFamilyMembers: pkg.maxFamilyMembers || 4,
      });
    } catch (error) {
      console.error('Error fetching package:', error);
    }
  };

  const handleAddBenefit = () => {
    setFormData({ ...formData, benefits: [...formData.benefits, ''] });
  };

  const handleUpdateBenefit = (index: number, value: string) => {
    const updated = [...formData.benefits];
    updated[index] = value;
    setFormData({ ...formData, benefits: updated });
  };

  const handleRemoveBenefit = (index: number) => {
    setFormData({
      ...formData,
      benefits: formData.benefits.filter((_, i) => i !== index),
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const payload = {
        ...formData,
        benefits: formData.benefits.filter((b) => b.trim()),
      };

      if (packageId) {
        await packageAPI.update(packageId, payload);
      } else {
        await packageAPI.create(payload);
      }

      onSave();
    } catch (error) {
      console.error('Error saving package:', error);
      alert('Error saving package');
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 overflow-y-auto"
    >
      <div className="min-h-screen flex items-center justify-center p-4">
        <motion.div
          initial={{ scale: 0.95, y: 20 }}
          animate={{ scale: 1, y: 0 }}
          className="bg-gray-900 rounded-3xl border border-gray-800 w-full max-w-2xl max-h-[90vh] overflow-y-auto"
        >
          <div className="sticky top-0 bg-gray-900 border-b border-gray-800 p-6 flex items-center justify-between z-10">
            <h2 className="text-2xl font-bold text-white">
              {packageId ? 'Edit Gym Package' : 'Create New Gym Package'}
            </h2>
            <button onClick={onClose} className="text-gray-400 hover:text-white text-2xl">
              ✕
            </button>
          </div>

          <form onSubmit={handleSubmit} className="p-6 space-y-6">
            {/* Basic Info */}
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">Package Name *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g. Family Pro Membership"
                  className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-green-500 text-sm"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">Price (LKR) *</label>
                <input
                  type="number"
                  value={formData.price}
                  onChange={(e) => setFormData({ ...formData, price: parseFloat(e.target.value) || 0 })}
                  className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-green-500 text-sm"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">Duration *</label>
                <input
                  type="text"
                  value={formData.duration}
                  onChange={(e) => setFormData({ ...formData, duration: e.target.value })}
                  placeholder="e.g., 30 days, 1 Month"
                  className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-green-500 text-sm"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">Tier Level</label>
                <select
                  value={formData.level}
                  onChange={(e) => setFormData({ ...formData, level: e.target.value })}
                  className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-green-500 text-sm"
                >
                  <option value="beginner">Standard</option>
                  <option value="intermediate">Pro / Plus</option>
                  <option value="advanced">VIP Elite</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">Description *</label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={3}
                placeholder="Describe membership access, amenities, and features..."
                className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-green-500 text-sm"
                required
              />
            </div>

            {/* Package Type Switches */}
            <div className="grid md:grid-cols-2 gap-4 p-4 bg-gray-950 rounded-2xl border border-gray-800">
              <div className="space-y-2">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.isFamilyPackage}
                    onChange={(e) => setFormData({ ...formData, isFamilyPackage: e.target.checked })}
                    className="w-4 h-4 rounded text-green-500 focus:ring-green-500 bg-gray-800 border-gray-700"
                  />
                  <span className="text-sm font-bold text-white">Is Family Package</span>
                </label>
                <p className="text-xs text-gray-500 pl-7">
                  Requires member to complete family details form during purchase.
                </p>
              </div>

              <div className="space-y-2">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.hasPersonalTrainer}
                    onChange={(e) => setFormData({ ...formData, hasPersonalTrainer: e.target.checked })}
                    className="w-4 h-4 rounded text-purple-500 focus:ring-purple-500 bg-gray-800 border-gray-700"
                  />
                  <span className="text-sm font-bold text-purple-400">Includes Personal Trainer</span>
                </label>
                <p className="text-xs text-gray-500 pl-7">
                  Unlocks 1-on-1 coach scheduling & reservation space.
                </p>
              </div>
            </div>

            {/* Benefits List */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                  Features & Perks ({formData.benefits.length})
                </h3>
                <button
                  type="button"
                  onClick={handleAddBenefit}
                  className="px-3 py-1 bg-green-500/20 text-green-400 border border-green-500/30 rounded-lg text-xs font-semibold hover:bg-green-500/30 transition-all flex items-center gap-1"
                >
                  <Plus className="w-3.5 h-3.5" /> Add Perk
                </button>
              </div>

              <div className="space-y-2">
                {formData.benefits.map((benefit, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <input
                      type="text"
                      value={benefit}
                      onChange={(e) => handleUpdateBenefit(idx, e.target.value)}
                      placeholder="e.g. Full Gym Floor Access, Locker Room"
                      className="flex-1 px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-xs text-white focus:outline-none focus:border-green-500"
                    />
                    <button
                      type="button"
                      onClick={() => handleRemoveBenefit(idx)}
                      className="p-2 text-red-400 hover:text-red-300"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Form Action Buttons */}
            <div className="flex gap-4 pt-4 border-t border-gray-800">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 px-4 py-2.5 bg-gray-800 text-white rounded-xl text-xs font-bold hover:bg-gray-700 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading || !formData.name.trim()}
                className="flex-1 px-4 py-2.5 bg-green-500 text-black font-bold rounded-xl text-xs hover:bg-green-400 transition-colors disabled:opacity-50"
              >
                {loading ? 'Saving...' : packageId ? 'Update Package' : 'Create Package'}
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </motion.div>
  );
}
