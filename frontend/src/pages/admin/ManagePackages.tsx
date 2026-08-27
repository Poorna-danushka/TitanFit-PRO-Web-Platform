import { useState, useEffect } from 'react';
import { packageAPI } from '../../api/apiService';
import PackageForm from '../../components/PackageForm';
import Pagination from '../../components/Pagination';
import { Trash2, Plus, Edit2, Package as PackageIcon, CheckCircle2, Search } from 'lucide-react';
import { motion } from 'framer-motion';
import { toast } from 'react-toastify';
import BackButton from '../../components/BackButton';

export default function ManagePackages() {
  const [packages, setPackages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedPackageId, setSelectedPackageId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [levelFilter, setLevelFilter] = useState('ALL');

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 6;

  useEffect(() => {
    fetchPackages();
  }, []);

  const fetchPackages = async () => {
    try {
      setLoading(true);
      const response = await packageAPI.getAll();
      setPackages(response.data.packages || response.data.data || (Array.isArray(response.data) ? response.data : []));
    } catch (error) {
      console.error('Error fetching packages:', error);
      toast.error('Failed to load fitness packages.');
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
    if (confirm('Are you sure you want to delete this gym package?')) {
      try {
        await packageAPI.delete(id);
        toast.success('Package deleted successfully');
        setPackages(packages.filter(p => p._id !== id));
      } catch (error) {
        console.error('Error deleting package:', error);
        toast.error('Failed to delete package.');
      }
    }
  };

  const handleSave = () => {
    setIsFormOpen(false);
    fetchPackages();
  };

  const filteredPackages = packages.filter((pkg) => {
    const name = (pkg.name || '').toLowerCase();
    const desc = (pkg.description || '').toLowerCase();
    const q = searchQuery.toLowerCase().trim();
    const matchesSearch = !q || name.includes(q) || desc.includes(q);

    let matchesLevel = true;
    if (levelFilter !== 'ALL') {
      matchesLevel = (pkg.level || '').toUpperCase() === levelFilter;
    }

    return matchesSearch && matchesLevel;
  });

  const totalPages = Math.ceil(filteredPackages.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedPackages = filteredPackages.slice(startIndex, startIndex + itemsPerPage);

  return (
    <div className="pb-16 space-y-8 relative text-white min-h-[85vh]">
      <div className="flex items-center justify-between">
        <BackButton fallbackPath="/admin/dashboard" />
      </div>

      {/* Background glow graphics */}
      <div className="absolute top-0 left-10 w-80 h-80 bg-emerald-500/10 blur-[130px] rounded-full pointer-events-none -z-10" />
      <div className="absolute top-48 right-10 w-96 h-96 bg-purple-500/10 blur-[130px] rounded-full pointer-events-none -z-10" />

      {/* Header Banner */}
      <motion.div
        initial={{ opacity: 0, y: -16 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 bg-[#0f0e13]/90 backdrop-blur-md p-7 md:p-8 rounded-3xl border border-white/10 shadow-2xl relative overflow-hidden"
      >
        <div className="flex items-center gap-5 relative z-10">
          <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shadow-[0_0_30px_rgba(16,185,129,0.15)] shrink-0">
            <PackageIcon className="w-8 h-8 text-emerald-400" />
          </div>
          <div>
            <h1 className="text-3xl font-display font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-white via-gray-100 to-gray-400 tracking-tight">
              Manage Gym Packages & Plans
            </h1>
            <p className="text-gray-400 text-sm font-medium mt-0.5">
              Create, configure, and customize active membership plans, PT tiers, and pricing options.
            </p>
          </div>
        </div>

        <div className="relative z-10 flex items-center gap-3">
          <button
            onClick={handleCreateNew}
            className="px-5 py-3 bg-gradient-to-r from-emerald-500 to-green-400 text-black font-bold text-xs rounded-xl hover:from-emerald-400 hover:to-green-300 transition-all flex items-center gap-2 shadow-lg shadow-emerald-500/20 active:scale-95"
          >
            <Plus className="w-4 h-4" /> Create New Package
          </button>
        </div>
      </motion.div>

      {/* Search & Level Filter Bar */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.08 }}
        className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4"
      >
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-gray-500 absolute left-4 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search packages by name or description..."
            className="w-full pl-11 pr-4 py-2.5 rounded-xl bg-[#0f0e13]/80 border border-white/10 text-white text-xs placeholder-gray-500 focus:outline-none focus:border-emerald-500 transition-colors"
          />
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0 custom-scrollbar">
          {(['ALL', 'BEGINNER', 'INTERMEDIATE', 'ADVANCED'] as const).map((lvl) => {
            const isActive = levelFilter === lvl;
            return (
              <button
                key={lvl}
                onClick={() => setLevelFilter(lvl)}
                className={`px-3 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap border ${
                  isActive
                    ? 'bg-emerald-500 text-black border-emerald-400 shadow-md shadow-emerald-500/20'
                    : 'bg-white/[0.03] text-gray-400 border-white/[0.08] hover:text-white hover:bg-white/[0.06]'
                }`}
              >
                {lvl === 'ALL' ? 'All Tiers' : lvl}
              </button>
            );
          })}
        </div>
      </motion.div>

      {/* Package Cards List */}
      {loading ? (
        <div className="py-20 text-center text-gray-500 space-y-3">
          <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs">Loading gym packages...</p>
        </div>
      ) : filteredPackages.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-12 rounded-3xl bg-[#0f0e13]/90 border border-white/10 text-center space-y-4 shadow-xl"
        >
          <PackageIcon className="w-12 h-12 text-gray-600 mx-auto" />
          <div>
            <h3 className="font-bold text-base text-white">No Packages Found</h3>
            <p className="text-xs text-gray-500 mt-1">No packages match your search criteria or none have been created yet.</p>
          </div>
          <button
            onClick={handleCreateNew}
            className="px-4 py-2.5 bg-emerald-500 text-black font-bold text-xs rounded-xl hover:bg-emerald-400 transition-all inline-flex items-center gap-2"
          >
            <Plus className="w-4 h-4" /> Create First Package
          </button>
        </motion.div>
      ) : (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {paginatedPackages.map((pkg, i) => {
                const itemsList = pkg.benefits || pkg.features || (pkg.exercises?.map((e: any) => e.name) || []);

            return (
              <motion.div
                key={pkg._id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="p-6 rounded-3xl bg-[#0f0e13]/90 backdrop-blur-md border border-white/10 hover:border-emerald-500/30 transition-all duration-300 shadow-xl flex flex-col justify-between group"
              >
                <div>
                  <div className="flex items-start justify-between gap-4 mb-3">
                    <div>
                      <h3 className="text-xl font-bold text-white group-hover:text-emerald-300 transition-colors">
                        {pkg.name}
                      </h3>
                      <p className="text-xs text-gray-400 mt-1 leading-relaxed line-clamp-2">
                        {pkg.description || 'No description provided.'}
                      </p>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        onClick={() => handleEdit(pkg._id)}
                        className="p-2.5 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20 hover:bg-blue-500/20 transition-all"
                        title="Edit Package"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(pkg._id)}
                        className="p-2.5 rounded-xl bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20 transition-all"
                        title="Delete Package"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Price Banner */}
                  <div className="my-4 p-4 rounded-2xl bg-white/[0.03] border border-white/[0.08] flex items-center justify-between">
                    <div className="flex items-baseline gap-1">
                      <span className="text-xs text-gray-400 font-medium">LKR</span>
                      <span className="text-2xl font-black text-emerald-400">{(pkg.price || 0).toLocaleString()}</span>
                      <span className="text-xs text-gray-500">/ {pkg.duration || 'Month'}</span>
                    </div>

                    <span className="px-3 py-1 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20 text-[10px] font-bold uppercase tracking-wider">
                      {pkg.level || 'Intermediate'}
                    </span>
                  </div>

                  {/* Badges */}
                  <div className="flex flex-wrap gap-2 mb-4">
                    {(pkg.isFamilyPackage || pkg.name?.toLowerCase().includes('family')) && (
                      <span className="px-2.5 py-1 rounded-lg bg-amber-500/10 text-amber-300 border border-amber-500/20 text-[10px] font-bold">
                        Family Membership
                      </span>
                    )}
                    {pkg.hasPersonalTrainer && (
                      <span className="px-2.5 py-1 rounded-lg bg-purple-500/10 text-purple-300 border border-purple-500/20 text-[10px] font-bold">
                        Includes Trainer
                      </span>
                    )}
                  </div>

                  {/* Features List */}
                  {itemsList.length > 0 && (
                    <div className="space-y-2 pt-2 border-t border-white/[0.06]">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-gray-500">Included Plan Features:</p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {itemsList.slice(0, 6).map((item: any, idx: number) => {
                          const label = typeof item === 'string' ? item : item.name || item;
                          return (
                            <div key={idx} className="flex items-center gap-2 text-xs text-gray-300 bg-white/[0.02] p-2 rounded-xl border border-white/[0.04]">
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                              <span className="truncate">{label}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              </motion.div>
            );
          })}
          </div>

          <div className="p-4 bg-[#0f0e13]/90 border border-white/10 rounded-2xl">
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              totalItems={filteredPackages.length}
              itemsPerPage={itemsPerPage}
              onPageChange={setCurrentPage}
            />
          </div>
        </div>
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
