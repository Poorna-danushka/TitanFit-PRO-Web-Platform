import { useState, useEffect } from 'react';
import { attendanceAPI } from '../api/apiService';
import { useAuth } from '../context/AuthContext';
import { motion } from 'framer-motion';
import { QrCode, Scan, CheckCircle2, History, ShieldCheck, Clock } from 'lucide-react';
import { toast } from 'react-toastify';

export default function AttendanceQR() {
  const { user } = useAuth();
  const [qrCodeData, setQrCodeData] = useState<string>('');
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [scanInput, setScanInput] = useState('');
  const [scanLoading, setScanLoading] = useState(false);

  const isStaff = user?.role === 'admin' || (user as any)?.role === 'STAFF' || (user as any)?.role === 'TRAINER';

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [qrRes, histRes] = await Promise.all([
        attendanceAPI.getQRCode().catch(() => ({ data: {} })),
        attendanceAPI.getMyHistory().catch(() => ({ data: {} })),
      ]);

      const qrDataPayload = qrRes.data?.data?.qrCodeData || qrRes.data?.qrCodeData || `GYM_MEMBER_${user?.id || 'DEMO'}`;
      setQrCodeData(qrDataPayload);
      setHistory(histRes.data?.history || histRes.data?.data || []);
    } catch (error) {
      toast.error('Failed to load attendance records');
    } finally {
      setLoading(false);
    }
  };

  const handleScanQR = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!scanInput.trim()) return;

    try {
      setScanLoading(true);
      const res = await attendanceAPI.checkInQR(scanInput.trim());
      toast.success(`✅ ${res.data.message || 'Member checked in successfully!'}`);
      setScanInput('');
      fetchData();
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Invalid or expired QR code');
    } finally {
      setScanLoading(false);
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div>
        <h1 className="font-display text-3xl md:text-4xl font-bold text-white mb-1 flex items-center gap-3">
          <QrCode className="w-8 h-8 text-green-400" /> Gym Check-in & QR Pass
        </h1>
        <p className="text-gray-400 text-sm">Scan your digital entry pass at reception or view your gym attendance log.</p>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Digital Entry Pass */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="card-surface rounded-2xl p-6 border border-white/[0.08] flex flex-col items-center text-center justify-between"
        >
          <div className="w-full">
            <div className="flex items-center justify-between mb-4 text-xs">
              <span className="font-bold text-green-400 uppercase tracking-wider flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4" /> Active Member Pass
              </span>
              <span className="px-2.5 py-0.5 rounded-full bg-green-500/10 text-green-400 border border-green-500/20 font-semibold">
                VALID
              </span>
            </div>

            <h3 className="text-xl font-bold text-white mb-1">{user?.name}</h3>
            <p className="text-xs text-gray-400 mb-6">{user?.email}</p>

            {/* QR Code Container */}
            <div className="bg-white p-6 rounded-2xl inline-block shadow-2xl shadow-green-500/10 border-4 border-green-500/20 my-2">
              <img
                src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(qrCodeData)}`}
                alt="Member Entry QR Pass"
                className="w-44 h-44 object-contain"
              />
            </div>

            <p className="text-[11px] text-gray-500 mt-4">Show this QR code to reception scanner to record entry/exit.</p>
          </div>
        </motion.div>

        {/* Staff Scanner (if Staff/Admin) or Check-in Status */}
        <div className="space-y-6">
          {isStaff && (
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="card-surface rounded-2xl p-6 border border-purple-500/30 bg-purple-900/10"
            >
              <h3 className="text-lg font-bold text-white mb-2 flex items-center gap-2">
                <Scan className="w-5 h-5 text-purple-400" /> Reception Check-in Scanner
              </h3>
              <p className="text-xs text-gray-400 mb-4">Scan or enter member QR payload to check member in/out.</p>

              <form onSubmit={handleScanQR} className="flex gap-2">
                <input
                  type="text"
                  placeholder="Enter or scan QR data (e.g. GYM_MEMBER_...)"
                  value={scanInput}
                  onChange={(e) => setScanInput(e.target.value)}
                  className="flex-1 bg-[#111113] border border-white/[0.1] rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-purple-500"
                />
                <button
                  type="submit"
                  disabled={scanLoading}
                  className="px-4 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs transition-all shadow-md shadow-purple-600/30"
                >
                  {scanLoading ? 'Checking...' : 'Check In'}
                </button>
              </form>
            </motion.div>
          )}

          {/* Attendance Log */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="card-surface rounded-2xl p-6 border border-white/[0.08]"
          >
            <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
              <History className="w-5 h-5 text-blue-400" /> Recent Attendance History
            </h3>

            {loading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-12 rounded-xl bg-white/[0.03] animate-pulse" />
                ))}
              </div>
            ) : history.length === 0 ? (
              <div className="text-center py-8">
                <Clock className="w-10 h-10 text-gray-600 mx-auto mb-2" />
                <p className="text-gray-400 text-xs">No check-in records found yet.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {history.slice(0, 6).map((rec, idx) => {
                  const checkIn = new Date(rec.checkInTime || rec.createdAt);
                  return (
                    <div key={rec._id || idx} className="flex items-center justify-between p-3 rounded-xl bg-white/[0.03] border border-white/[0.05]">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-green-500/10 flex items-center justify-center text-green-400">
                          <CheckCircle2 className="w-4 h-4" />
                        </div>
                        <div>
                          <p className="text-xs font-semibold text-white">Check-in Verified</p>
                          <p className="text-[10px] text-gray-400">{checkIn.toLocaleDateString()} at {checkIn.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                        </div>
                      </div>

                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20">
                        {rec.method || 'QR Scanner'}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </motion.div>
        </div>
      </div>
    </div>
  );
}
