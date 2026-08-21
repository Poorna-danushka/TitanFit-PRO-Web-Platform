import { useState, useEffect } from 'react';
import { trainerAPI } from '../api/apiService';
import { motion } from 'framer-motion';
import { Award, Star, Calendar, UserCheck } from 'lucide-react';
import { toast } from 'react-toastify';

interface Trainer {
  _id: string;
  userId: {
    _id: string;
    firstName?: string;
    lastName?: string;
    name?: string;
    email?: string;
    profileImage?: string;
  };
  qualification?: string;
  specialization?: string[];
  experience?: number;
  bio?: string;
  hourlyRate?: number;
  rating?: number;
  reviewsCount?: number;
}

export default function Trainers() {
  const [trainers, setTrainers] = useState<Trainer[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTrainer, setSelectedTrainer] = useState<Trainer | null>(null);
  const [bookingDate, setBookingDate] = useState<string>('');
  const [bookingTime, setBookingTime] = useState<string>('10:00 AM');
  const [bookingModalOpen, setBookingModalOpen] = useState(false);
  const [bookingLoading, setBookingLoading] = useState(false);

  useEffect(() => {
    fetchTrainers();
  }, []);

  const fetchTrainers = async () => {
    try {
      setLoading(true);
      const res = await trainerAPI.getAll();
      setTrainers(res.data.trainers || []);
    } catch (error) {
      toast.error('Failed to load trainers');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenBooking = (trainer: Trainer) => {
    setSelectedTrainer(trainer);
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    setBookingDate(tomorrow.toISOString().split('T')[0]);
    setBookingModalOpen(true);
  };

  const handleConfirmBooking = async () => {
    if (!selectedTrainer || !bookingDate || !bookingTime) {
      toast.error('Please select date and time slot');
      return;
    }

    try {
      setBookingLoading(true);
      await trainerAPI.bookSession({
        trainerId: selectedTrainer.userId?._id || selectedTrainer._id,
        date: bookingDate,
        timeSlot: bookingTime,
      });

      toast.success('🎉 Personal Training session requested successfully!');
      setBookingModalOpen(false);
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Failed to book PT session');
    } finally {
      setBookingLoading(false);
    }
  };

  const timeSlots = ['08:00 AM', '09:30 AM', '11:00 AM', '02:00 PM', '04:00 PM', '05:30 PM', '07:00 PM'];

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div>
        <h1 className="font-display text-3xl md:text-4xl font-bold text-white mb-1 flex items-center gap-3">
          <Award className="w-8 h-8 text-purple-400" /> Personal Trainers
        </h1>
        <p className="text-gray-400 text-sm">Work 1-on-1 with certified fitness experts to crush your personal goals.</p>
      </div>

      {/* Trainers List */}
      {loading ? (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-72 rounded-2xl bg-white/[0.03] animate-pulse" />
          ))}
        </div>
      ) : trainers.length === 0 ? (
        <div className="card-surface rounded-2xl p-12 text-center max-w-md mx-auto">
          <UserCheck className="w-12 h-12 text-gray-600 mx-auto mb-3" />
          <h3 className="text-white font-bold text-lg">No trainers listed yet</h3>
          <p className="text-gray-400 text-xs mt-1">Check back soon for trainer availability.</p>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {trainers.map((t, idx) => {
            const name = t.userId?.firstName ? `${t.userId.firstName} ${t.userId.lastName || ''}` : t.userId?.name || 'Certified Trainer';
            const img = t.userId?.profileImage || `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=7c3aed&color=fff`;

            return (
              <motion.div
                key={t._id}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.07 }}
                className="card-surface rounded-2xl overflow-hidden p-6 flex flex-col justify-between border border-white/[0.08] hover:border-purple-500/40 transition-all group"
              >
                <div>
                  <div className="flex items-center gap-4 mb-4">
                    <img src={img} alt={name} className="w-16 h-16 rounded-2xl object-cover border-2 border-purple-500/30" />
                    <div>
                      <h3 className="text-lg font-bold text-white leading-tight">{name}</h3>
                      <p className="text-xs text-purple-400 font-semibold">{t.qualification || 'Certified Personal Trainer'}</p>
                      <div className="flex items-center gap-1 mt-1 text-xs text-yellow-400 font-bold">
                        <Star className="w-3.5 h-3.5 fill-yellow-400" />
                        <span>{t.rating || 4.9}</span>
                        <span className="text-gray-500 font-normal">({t.reviewsCount || 24} reviews)</span>
                      </div>
                    </div>
                  </div>

                  <p className="text-xs text-gray-400 leading-relaxed mb-4 line-clamp-3">{t.bio || 'Dedicated coach helping clients achieve sustainable transformation.'}</p>

                  <div className="flex flex-wrap gap-1.5 mb-4">
                    {(t.specialization || ['Strength', 'Weight Loss', 'Flexibility']).map((spec) => (
                      <span key={spec} className="px-2.5 py-0.5 rounded-full bg-purple-500/10 text-purple-300 text-[10px] font-semibold border border-purple-500/20">
                        {spec}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="pt-4 border-t border-white/[0.06] flex items-center justify-between">
                  <div>
                    <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider block">Hourly Rate</span>
                    <span className="text-lg font-extrabold text-white">LKR {(t.hourlyRate || 4500).toLocaleString()}</span>
                  </div>

                  <button
                    onClick={() => handleOpenBooking(t)}
                    className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold transition-all shadow-lg shadow-purple-600/20"
                  >
                    Book Session
                  </button>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Booking Modal */}
      {bookingModalOpen && selectedTrainer && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-[#111113] border border-white/[0.1] rounded-2xl p-6 max-w-md w-full space-y-4"
          >
            <h3 className="text-xl font-bold text-white flex items-center gap-2">
              <Calendar className="w-5 h-5 text-purple-400" /> Book Personal Session
            </h3>

            <p className="text-xs text-gray-400">
              Booking 1-on-1 session with <strong className="text-white">{selectedTrainer.userId?.firstName || selectedTrainer.userId?.name}</strong>.
            </p>

            <div>
              <label className="text-xs font-bold text-gray-400 block mb-1">Select Date</label>
              <input
                type="date"
                value={bookingDate}
                onChange={(e) => setBookingDate(e.target.value)}
                className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-purple-500"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-gray-400 block mb-1">Select Time Slot</label>
              <div className="grid grid-cols-3 gap-2">
                {timeSlots.map((slot) => (
                  <button
                    key={slot}
                    type="button"
                    onClick={() => setBookingTime(slot)}
                    className={`py-2 rounded-xl text-xs font-semibold transition-all ${
                      bookingTime === slot
                        ? 'bg-purple-600 text-white shadow-md shadow-purple-600/30'
                        : 'bg-white/[0.04] text-gray-400 hover:text-white'
                    }`}
                  >
                    {slot}
                  </button>
                ))}
              </div>
            </div>

            <div className="pt-4 flex gap-3">
              <button
                onClick={() => setBookingModalOpen(false)}
                className="flex-1 py-2.5 rounded-xl bg-white/[0.05] text-gray-300 text-xs font-semibold hover:bg-white/[0.1]"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmBooking}
                disabled={bookingLoading}
                className="flex-1 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold transition-all shadow-lg shadow-purple-600/30"
              >
                {bookingLoading ? 'Confirming...' : 'Confirm Booking'}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
