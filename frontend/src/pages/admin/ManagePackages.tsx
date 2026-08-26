import { useState, useEffect } from 'react';
import { packageAPI } from '../../api/apiService';
import PackageForm from '../../components/PackageForm';
import { Trash2, Plus, Edit2, Package as PackageIcon, CheckCircle2 } from 'lucide-react';
import { motion } from 'framer-motion';

export default function ManagePackages() {
  const [packages, setPackages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedPackageId, setSelectedPackageId] = useState<string | null>(null);

  useEffect(() => {
    fetchPackages();
  }, []);

  const fetchPackages = async () => {
    try {
      setLoading(true);
      const response = await packageAPI.getAll();
      setPackages(response.data.packages || []);
    } catch (error) {
      console.error('Error fetching packages:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateNew = () => {
    setSelectedPackageId(null);
    setIsFormOpen(true);
  };

  const handleEdit = (id: string) => {
    setSelectedPackageId(id);
    setIsFormOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this package?')) {
      try {
        await packageAPI.delete(id);
        setPackages(packages.filter(p => p._id !== id));
      } catch (error) {
        console.error('Error deleting package:', error);
        alert('Error deleting package');
      }
    }
  };

  const handleSave = () => {
    setIsFormOpen(false);
    fetchPackages();
  };

  return (
    <div className="text-white">
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold mb-2 flex items-center gap-3">
              <PackageIcon className="w-10 h-10 text-green-500" />
              Manage Gym Packages & Membership Plans
            </h1>
            <p className="text-gray-400">Create, customize, and manage active gym membership tiers and training plans</p>
          </div>
          <button
            onClick={handleCreateNew}
            className="flex items-center gap-2 px-6 py-3 bg-green-500 text-black font-bold rounded-lg hover:bg-green-400 transition-colors shadow-[0_0_20px_rgba(34,197,94,0.3)]"
          >
            <Plus className="w-5 h-5" />
            Create Package
          </button>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12">
          <div className="inline-block animate-spin">
            <div className="w-8 h-8 border-4 border-green-500 border-t-transparent rounded-full" />
          </div>
          <p className="text-gray-400 mt-2">Loading packages...</p>
        </div>
      ) : (
        <>
          {packages.length === 0 ? (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-gray-900 rounded-2xl border border-gray-800 p-12 text-center"
            >
              <PackageIcon className="w-16 h-16 text-gray-600 mx-auto mb-4" />
              <h3 className="text-xl font-bold mb-2">No Packages Found</h3>
              <p className="text-gray-400 mb-6">Create your first gym membership or fitness package to get started</p>
              <button
                onClick={handleCreateNew}
                className="inline-flex items-center gap-2 px-6 py-3 bg-green-500 text-black font-bold rounded-lg hover:bg-green-400 transition-colors"
              >
                <Plus className="w-5 h-5" />
                Create First Package
              </button>
            </motion.div>
          ) : (
            <div className="grid gap-6">
              {packages.map((pkg, i) => {
                const itemsList = pkg.benefits || pkg.features || (pkg.exercises?.map((e: any) => e.name) || []);

                return (
                  <motion.div
                    key={pkg._id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05 }}
                    className="bg-gray-900 rounded-2xl border border-gray-800 hover:border-green-500/30 p-6 transition-all"
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="text-xl font-bold text-white">{pkg.name}</h3>
                          <span className="px-3 py-0.5 bg-green-500/20 text-green-400 text-xs font-bold rounded-full border border-green-500/30">
                            LKR {(pkg.price || 0).toLocaleString()} / {pkg.duration || 'Month'}
                          </span>
                        </div>
                        <p className="text-gray-400 text-sm mb-4">{pkg.description}</p>
                        
                        <div className="flex flex-wrap gap-2 items-center mb-4">
                          <span className="inline-block px-3 py-1 bg-blue-500/20 text-blue-400 rounded-full text-xs font-medium capitalize">
                            {pkg.level || 'Intermediate'} Level
                          </span>
                          {(pkg.isFamilyPackage || pkg.name?.toLowerCase().includes('family')) && (
                            <span className="inline-block px-3 py-1 bg-green-500/20 text-green-400 rounded-full text-xs font-bold">
                              Family Package
                            </span>
                          )}
                          {pkg.hasPersonalTrainer && (
                            <span className="inline-block px-3 py-1 bg-purple-500/20 text-purple-400 rounded-full text-xs font-bold">
                              Includes Personal Trainer
                            </span>
                          )}
                          {itemsList.length > 0 && (
                            <span className="inline-block px-3 py-1 bg-emerald-500/20 text-emerald-400 rounded-full text-xs font-medium">
                              {itemsList.length} Included Features
                            </span>
                          )}
                        </div>

                        {/* Benefits list */}
                        {itemsList.length > 0 && (
                          <div className="mt-3 pt-3 border-t border-gray-800/80">
                            <p className="text-xs font-semibold text-gray-400 mb-2 uppercase tracking-wider">Plan Features:</p>
                            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-2">
                              {itemsList.map((item: any, idx: number) => {
                                const label = typeof item === 'string' ? item : item.name || item;
                                return (
                                  <div key={idx} className="flex items-center gap-2 text-xs bg-gray-800/60 rounded-lg p-2 text-gray-300 border border-gray-800">
                                    <CheckCircle2 className="w-3.5 h-3.5 text-green-400 shrink-0" />
                                    <span>{label}</span>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </div>

                      <div className="flex gap-2 ml-4">
                        <button
                          onClick={() => handleEdit(pkg._id)}
                          className="p-2 bg-blue-500/20 text-blue-400 rounded-lg hover:bg-blue-500/30 transition-colors"
                          title="Edit Package"
                        >
                          <Edit2 className="w-5 h-5" />
                        </button>
                        <button
                          onClick={() => handleDelete(pkg._id)}
                          className="p-2 bg-red-500/20 text-red-400 rounded-lg hover:bg-red-500/30 transition-colors"
                          title="Delete Package"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </>
      )}

      {isFormOpen && (
        <PackageForm
          packageId={selectedPackageId || undefined}
          onClose={() => setIsFormOpen(false)}
          onSave={handleSave}
        />
      )}
    </div>
  );
}
