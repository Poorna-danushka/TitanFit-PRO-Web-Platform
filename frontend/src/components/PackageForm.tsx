import React, { useState, useEffect } from 'react';
import { exerciseAPI, packageAPI } from '../api/apiService';
import { motion } from 'framer-motion';
import { Plus, Trash2, GripVertical, ChevronDown } from 'lucide-react';

interface PackageFormProps {
  onClose: () => void;
  onSave: () => void;
  packageId?: string;
}

export default function PackageForm({ onClose, onSave, packageId }: PackageFormProps) {
  const [loading, setLoading] = useState(false);
  const [allExercises, setAllExercises] = useState<any[]>([]);
  const [selectedExercises, setSelectedExercises] = useState<any[]>([]);
  const [expandedExercise, setExpandedExercise] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    price: 0,
    duration: '30 days',
    description: '',
    level: 'intermediate',
    image: '',
    benefits: [''] as string[],
  });

  useEffect(() => {
    fetchExercises();
    if (packageId) {
      fetchPackage();
    }
  }, [packageId]);

  const fetchExercises = async () => {
    try {
      const response = await exerciseAPI.getAll();
      setAllExercises(response.data.exercises || []);
    } catch (error) {
      console.error('Error fetching exercises:', error);
    }
  };

  const fetchPackage = async () => {
    try {
      const response = await packageAPI.getById(packageId || '');
      const pkg = response.data.package;
      setFormData({
        name: pkg.name,
        price: pkg.price,
        duration: pkg.duration,
        description: pkg.description,
        level: pkg.level,
        image: pkg.image,
        benefits: pkg.benefits || [''],
      });
      setSelectedExercises(pkg.exercises || []);
    } catch (error) {
      console.error('Error fetching package:', error);
    }
  };

  const handleAddExercise = (exercise: any) => {
    if (!selectedExercises.find(se => se._id === exercise._id)) {
      const reps = exercise[`${formData.level}Reps`] || 'As prescribed';
      setSelectedExercises([
        ...selectedExercises,
        {
          ...exercise,
          packageConfig: {
            reps,
            sets: 3,
            restTime: 60,
            duration: 15,
            difficulty: formData.level,
            notes: '',
            order: selectedExercises.length,
          },
        },
      ]);
    }
  };

  const handleRemoveExercise = (exerciseId: string) => {
    const updated = selectedExercises.filter(se => se._id !== exerciseId);
    // Reorder
    updated.forEach((ex, idx) => {
      ex.packageConfig.order = idx;
    });
    setSelectedExercises(updated);
  };

  const handleUpdateExerciseConfig = (exerciseId: string, field: string, value: any) => {
    setSelectedExercises(
      selectedExercises.map(ex => {
        if (ex._id === exerciseId) {
          return {
            ...ex,
            packageConfig: {
              ...ex.packageConfig,
              [field]: value,
            },
          };
        }
        return ex;
      })
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const payload = {
        ...formData,
        benefits: formData.benefits.filter(b => b.trim()),
        exercises: selectedExercises.map(ex => ({
          exerciseId: ex._id,
          reps: ex.packageConfig.reps,
          sets: ex.packageConfig.sets,
          restTime: ex.packageConfig.restTime,
          duration: ex.packageConfig.duration,
          difficulty: ex.packageConfig.difficulty,
          notes: ex.packageConfig.notes,
        })),
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
          className="bg-gray-900 rounded-3xl border border-gray-800 w-full max-w-4xl max-h-[90vh] overflow-y-auto"
        >
          <div className="sticky top-0 bg-gray-900 border-b border-gray-800 p-6 flex items-center justify-between">
            <h2 className="text-2xl font-bold text-white">
              {packageId ? 'Edit Package' : 'Create New Package'}
            </h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-white text-2xl"
            >
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
                  className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-green-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">Price (LKR) *</label>
                <input
                  type="number"
                  value={formData.price}
                  onChange={(e) => setFormData({ ...formData, price: parseFloat(e.target.value) || 0 })}
                  className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-green-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">Duration *</label>
                <input
                  type="text"
                  value={formData.duration}
                  onChange={(e) => setFormData({ ...formData, duration: e.target.value })}
                  placeholder="e.g., 30 days, 3 months"
                  className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-green-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">Level</label>
                <select
                  value={formData.level}
                  onChange={(e) => setFormData({ ...formData, level: e.target.value })}
                  className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-green-500"
                >
                  <option value="beginner">Beginner</option>
                  <option value="intermediate">Intermediate</option>
                  <option value="advanced">Advanced</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">Description *</label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={3}
                className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-green-500"
                required
              />
            </div>

            {/* Selected Exercises */}
            <div>
              <h3 className="text-lg font-bold text-white mb-4">Selected Exercises ({selectedExercises.length})</h3>
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {selectedExercises.length === 0 ? (
                  <p className="text-gray-400 text-sm">No exercises selected yet. Add exercises from the list below.</p>
                ) : (
                  selectedExercises.map((ex, idx) => (
                    <motion.div
                      key={ex._id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="bg-gray-800 rounded-lg p-4 border border-gray-700"
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-start gap-3">
                          <GripVertical className="w-4 h-4 text-gray-500 mt-1 shrink-0" />
                          <div>
                            <p className="font-bold text-white">{idx + 1}. {ex.name}</p>
                            <p className="text-xs text-gray-400">{ex.muscleGroup}</p>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleRemoveExercise(ex._id)}
                          className="text-red-400 hover:text-red-300 p-2"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>

                      <button
                        type="button"
                        onClick={() => setExpandedExercise(expandedExercise === ex._id ? null : ex._id)}
                        className="flex items-center gap-2 text-xs text-gray-400 hover:text-gray-300 mb-3"
                      >
                        <ChevronDown className={`w-4 h-4 transition-transform ${expandedExercise === ex._id ? 'rotate-180' : ''}`} />
                        Configuration
                      </button>

                      {expandedExercise === ex._id && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          className="grid grid-cols-2 md:grid-cols-3 gap-3 mt-3 pt-3 border-t border-gray-700"
                        >
                          <div>
                            <label className="text-xs text-gray-400">Reps</label>
                            <input
                              type="text"
                              value={ex.packageConfig.reps}
                              onChange={(e) => handleUpdateExerciseConfig(ex._id, 'reps', e.target.value)}
                              className="w-full px-2 py-1 bg-gray-700 border border-gray-600 rounded text-white text-sm mt-1"
                            />
                          </div>
                          <div>
                            <label className="text-xs text-gray-400">Sets</label>
                            <input
                              type="number"
                              value={ex.packageConfig.sets}
                              onChange={(e) => handleUpdateExerciseConfig(ex._id, 'sets', parseInt(e.target.value))}
                              className="w-full px-2 py-1 bg-gray-700 border border-gray-600 rounded text-white text-sm mt-1"
                            />
                          </div>
                          <div>
                            <label className="text-xs text-gray-400">Duration (min)</label>
                            <input
                              type="number"
                              value={ex.packageConfig.duration}
                              onChange={(e) => handleUpdateExerciseConfig(ex._id, 'duration', parseInt(e.target.value))}
                              className="w-full px-2 py-1 bg-gray-700 border border-gray-600 rounded text-white text-sm mt-1"
                            />
                          </div>
                          <div>
                            <label className="text-xs text-gray-400">Rest (sec)</label>
                            <input
                              type="number"
                              value={ex.packageConfig.restTime}
                              onChange={(e) => handleUpdateExerciseConfig(ex._id, 'restTime', parseInt(e.target.value))}
                              className="w-full px-2 py-1 bg-gray-700 border border-gray-600 rounded text-white text-sm mt-1"
                            />
                          </div>
                          <div>
                            <label className="text-xs text-gray-400">Difficulty</label>
                            <select
                              value={ex.packageConfig.difficulty}
                              onChange={(e) => handleUpdateExerciseConfig(ex._id, 'difficulty', e.target.value)}
                              className="w-full px-2 py-1 bg-gray-700 border border-gray-600 rounded text-white text-sm mt-1"
                            >
                              <option value="beginner">Beginner</option>
                              <option value="intermediate">Intermediate</option>
                              <option value="advanced">Advanced</option>
                            </select>
                          </div>
                          <div className="md:col-span-3">
                            <label className="text-xs text-gray-400">Notes</label>
                            <textarea
                              value={ex.packageConfig.notes}
                              onChange={(e) => handleUpdateExerciseConfig(ex._id, 'notes', e.target.value)}
                              rows={2}
                              className="w-full px-2 py-1 bg-gray-700 border border-gray-600 rounded text-white text-sm mt-1"
                              placeholder="e.g., Focus on form, control the weight..."
                            />
                          </div>
                        </motion.div>
                      )}
                    </motion.div>
                  ))
                )}
              </div>
            </div>

            {/* Available Exercises */}
            <div>
              <h3 className="text-lg font-bold text-white mb-4">Available Exercises</h3>
              <div className="grid md:grid-cols-2 gap-3 max-h-96 overflow-y-auto">
                {allExercises.map(ex => (
                  <button
                    key={ex._id}
                    type="button"
                    onClick={() => handleAddExercise(ex)}
                    disabled={selectedExercises.some(se => se._id === ex._id)}
                    className={`p-3 rounded-lg border text-left text-sm transition-all ${
                      selectedExercises.some(se => se._id === ex._id)
                        ? 'bg-green-500/20 border-green-500/30 text-gray-400 cursor-not-allowed'
                        : 'bg-gray-800 border-gray-700 text-gray-300 hover:border-green-500 hover:bg-gray-700'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <Plus className="w-4 h-4" />
                      <div>
                        <p className="font-medium">{ex.name}</p>
                        <p className="text-xs text-gray-500">{ex.muscleGroup}</p>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Buttons */}
            <div className="flex gap-4 sticky bottom-0 bg-gray-900 border-t border-gray-800 p-4 -m-6 mt-0">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 px-4 py-2 bg-gray-800 text-white rounded-lg hover:bg-gray-700 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading || !formData.name.trim()}
                className="flex-1 px-4 py-2 bg-green-500 text-black font-bold rounded-lg hover:bg-green-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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
