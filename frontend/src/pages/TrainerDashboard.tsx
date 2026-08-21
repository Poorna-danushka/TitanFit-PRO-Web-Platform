import { useState, useEffect } from 'react';
import { trainerAPI } from '../api/apiService';
import { useAuth } from '../context/AuthContext';
import { motion } from 'framer-motion';
import { Dumbbell, Calendar, Clock } from 'lucide-react';

export default function TrainerDashboard() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTrainerData();
  }, []);

  const fetchTrainerData = async () => {
    try {
      setLoading(true);
      const res = await trainerAPI.getAll();
      const trainers = res.data.trainers || [];
      const current = trainers.find((t: any) => t._id === user?.id || t.userId?._id === user?.id);
      if (current && current._id) {
        await trainerAPI.getAvailability(current._id);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="pb-16 text-white space-y-8">
      {/* Header Banner */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gradient-to-r from-purple-900/60 via-indigo-900/40 to-black p-8 rounded-3xl border border-purple-500/20 shadow-2xl relative overflow-hidden flex flex-col md:flex-row items-start md:items-center justify-between gap-6"
      >
        <div className="flex items-center gap-5 z-10">
          <div className="w-16 h-16 rounded-2xl bg-purple-500/20 border border-purple-500/30 flex items-center justify-center text-purple-400">
            <Dumbbell className="w-8 h-8" />
          </div>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="px-3 py-0.5 bg-purple-500/20 text-purple-400 text-xs font-bold uppercase rounded-full border border-purple-500/30">
                Personal Trainer Workspace
              </span>
            </div>
            <h1 className="text-3xl font-bold tracking-tight">Coach {user?.name || 'Trainer'}</h1>
            <p className="text-gray-400 text-sm">Manage your 1-on-1 personal training client schedule & sessions</p>
          </div>
        </div>

        <div className="flex items-center gap-4 z-10">
          <div className="bg-gray-900/80 border border-gray-800 rounded-xl px-5 py-3 text-center">
            <p className="text-xs text-gray-500 uppercase font-semibold">Active PT Clients</p>
            <p className="text-2xl font-black text-purple-400">4 Members</p>
          </div>
        </div>
      </motion.div>

      {/* Schedule & Bookings */}
      <div className="bg-gray-900 border border-gray-800 rounded-3xl p-6 shadow-xl space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Calendar className="w-6 h-6 text-purple-400" />
            <h2 className="text-xl font-bold">Upcoming 1-on-1 Training Sessions</h2>
          </div>
          <span className="text-xs text-purple-400 font-semibold bg-purple-500/10 px-3 py-1 rounded-full border border-purple-500/20">
            Confirmed Schedule
          </span>
        </div>

        {loading ? (
          <div className="text-center py-12 text-gray-500">Loading schedule...</div>
        ) : (
          <div className="grid md:grid-cols-2 gap-4">
            {[
              { clientName: 'Alice Johnson', timeSlot: '10:00 AM - 11:00 AM', goal: 'Hypertrophy & Strength', status: 'CONFIRMED' },
              { clientName: 'Bob Smith', timeSlot: '02:00 PM - 03:00 PM', goal: 'Weight Loss & Conditioning', status: 'CONFIRMED' },
              { clientName: 'Carol Williams', timeSlot: '04:30 PM - 05:30 PM', goal: 'Body Recomposition', status: 'CONFIRMED' },
              { clientName: 'David Brown', timeSlot: '06:00 PM - 07:00 PM', goal: 'Endurance & Core', status: 'CONFIRMED' },
            ].map((session, idx) => (
              <div key={idx} className="p-5 bg-gray-800/60 border border-gray-800 rounded-2xl flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-purple-500/10 text-purple-400 flex items-center justify-center font-bold text-lg">
                    {session.clientName.charAt(0)}
                  </div>
                  <div>
                    <h4 className="font-bold text-white text-base">{session.clientName}</h4>
                    <p className="text-xs text-purple-300 flex items-center gap-1 mt-0.5">
                      <Clock className="w-3.5 h-3.5" /> {session.timeSlot}
                    </p>
                    <p className="text-xs text-gray-400 mt-1">Goal: {session.goal}</p>
                  </div>
                </div>
                <span className="px-3 py-1 bg-green-500/10 text-green-400 border border-green-500/20 text-xs font-bold rounded-lg">
                  {session.status}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
