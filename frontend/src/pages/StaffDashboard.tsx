import { useState, useEffect } from 'react';
import { attendanceAPI } from '../api/apiService';
import { useAuth } from '../context/AuthContext';
import { motion } from 'framer-motion';
import { QrCode, UserCheck, CheckCircle2, History } from 'lucide-react';
import { toast } from 'react-toastify';

export default function StaffDashboard() {
  const { user } = useAuth();
  const [scanInput, setScanInput] = useState('');
  const [scanLoading, setScanLoading] = useState(false);
  const [memberSearchResult, setMemberSearchResult] = useState<any>(null);
  const [attendanceLogs, setAttendanceLogs] = useState<any[]>([]);

  useEffect(() => {
    fetchLogs();
  }, []);

  const fetchLogs = async () => {
    try {
      const res = await attendanceAPI.getMyHistory();
      setAttendanceLogs(res.data.history || res.data.attendances || []);
    } catch (err) {
      console.error(err);
    }
  };

  const handleManualScan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!scanInput.trim()) return;

    setScanLoading(true);
    setMemberSearchResult(null);

    try {
      const res = await attendanceAPI.checkInQR(scanInput.trim());
      setMemberSearchResult(res.data);
      toast.success(res.data.message || 'Check-in recorded successfully!');
      fetchLogs();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Check-in failed. Invalid QR code or inactive member.');
    } finally {
      setScanLoading(false);
    }
  };

  return (
    <div className="pb-16 text-white space-y-8">
      {/* Header Banner */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gradient-to-r from-blue-900/60 via-indigo-900/40 to-black p-8 rounded-3xl border border-blue-500/20 shadow-2xl relative overflow-hidden flex flex-col md:flex-row items-start md:items-center justify-between gap-6"
      >
        <div className="flex items-center gap-5 z-10">
          <div className="w-16 h-16 rounded-2xl bg-blue-500/20 border border-blue-500/30 flex items-center justify-center text-blue-400">
            <UserCheck className="w-8 h-8" />
          </div>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="px-3 py-0.5 bg-blue-500/20 text-blue-400 text-xs font-bold uppercase rounded-full border border-blue-500/30">
                Staff / Reception Portal
              </span>
            </div>
            <h1 className="text-3xl font-bold tracking-tight">Welcome, {user?.name || 'Staff Member'}</h1>
            <p className="text-gray-400 text-sm">Scan digital QR entry passes & manage reception desk check-ins</p>
          </div>
        </div>

        <div className="flex items-center gap-4 z-10">
          <div className="bg-gray-900/80 border border-gray-800 rounded-xl px-4 py-2 text-center">
            <p className="text-xs text-gray-500 uppercase font-semibold">Today's Visits</p>
            <p className="text-2xl font-black text-blue-400">{attendanceLogs.length}</p>
          </div>
        </div>
      </motion.div>

      {/* Reception Desk Check-in Scanner */}
      <div className="grid lg:grid-cols-3 gap-8">
        <div className="lg:col-span-1 bg-gray-900 border border-gray-800 rounded-3xl p-6 shadow-xl space-y-6">
          <div className="flex items-center gap-3">
            <QrCode className="w-6 h-6 text-green-400" />
            <h2 className="text-xl font-bold">QR Entry Scanner</h2>
          </div>

          <form onSubmit={handleManualScan} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold uppercase text-gray-400 mb-2">Member ID or QR Code</label>
              <input
                type="text"
                value={scanInput}
                onChange={(e) => setScanInput(e.target.value)}
                placeholder="e.g. GYM_MEMBER_64b..."
                className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-green-500"
              />
            </div>
            <button
              type="submit"
              disabled={scanLoading || !scanInput.trim()}
              className="w-full py-3.5 bg-green-500 text-black font-bold rounded-xl hover:bg-green-400 transition-all disabled:opacity-50"
            >
              {scanLoading ? 'Verifying...' : 'Process Member Check-in'}
            </button>
          </form>

          {memberSearchResult && (
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="p-4 bg-green-500/10 border border-green-500/30 rounded-2xl space-y-2">
              <div className="flex items-center gap-2 text-green-400 font-bold">
                <CheckCircle2 className="w-5 h-5" /> Active Member Verified
              </div>
              <p className="text-sm font-semibold text-white">{memberSearchResult.member?.name || 'Gym Member'}</p>
              <p className="text-xs text-gray-400">Status: {memberSearchResult.status || 'CHECKED_IN'}</p>
            </motion.div>
          )}
        </div>

        {/* Live Reception Entry Logs */}
        <div className="lg:col-span-2 bg-gray-900 border border-gray-800 rounded-3xl p-6 shadow-xl space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <History className="w-6 h-6 text-blue-400" />
              <h2 className="text-xl font-bold">Recent Reception Attendance Logs</h2>
            </div>
            <button onClick={fetchLogs} className="text-xs text-blue-400 font-semibold hover:underline">
              Refresh Logs
            </button>
          </div>

          <div className="space-y-3 max-h-96 overflow-y-auto">
            {attendanceLogs.length === 0 ? (
              <div className="text-center py-12 text-gray-500">No check-in activity logged today yet.</div>
            ) : (
              attendanceLogs.map((log: any, idx: number) => (
                <div key={idx} className="flex items-center justify-between p-4 bg-gray-800/60 border border-gray-800 rounded-xl">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-blue-500/10 text-blue-400 flex items-center justify-center font-bold">
                      {(log.memberId?.name || 'M').charAt(0)}
                    </div>
                    <div>
                      <p className="font-bold text-white text-sm">{log.memberId?.name || log.memberName || 'Gym Member'}</p>
                      <p className="text-xs text-gray-400">{log.memberId?.email || 'Member ID: ' + (log.memberId?._id || 'N/A')}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-semibold text-green-400">{new Date(log.checkInTime || log.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                    <p className="text-[10px] text-gray-500">{log.method || 'QR Scanner'}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
