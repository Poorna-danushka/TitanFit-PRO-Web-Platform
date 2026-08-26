import { useState, useEffect } from 'react';
import { attendanceAPI, purchaseAPI } from '../api/apiService';
import { useAuth } from '../context/AuthContext';
import { motion } from 'framer-motion';
import { QrCode, Scan, CheckCircle2, History, ShieldCheck, Clock, AlertCircle, Building2, ArrowRight } from 'lucide-react';
import { toast } from 'react-toastify';
import { Link } from 'react-router-dom';

export default function AttendanceQR() {
  const { user } = useAuth();
  const [qrCodeData, setQrCodeData] = useState<string>('');
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [scanInput, setScanInput] = useState('');
  const [scanLoading, setScanLoading] = useState(false);
  const [isPendingVerification, setIsPendingVerification] = useState(false);
  const [hasActivePass, setHasActivePass] = useState(false);

  const isStaff = user?.role === 'admin' || (user as any)?.role === 'STAFF' || (user as any)?.role === 'TRAINER';

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [qrRes, histRes, purchaseRes] = await Promise.all([
        attendanceAPI.getQRCode().catch((err) => ({ error: err })),
        attendanceAPI.getMyHistory().catch(() => ({ data: {} })),
        purchaseAPI.getMy().catch(() => ({ data: {} })),
      ]);

      const purchases = (purchaseRes as any).data?.purchases || [];
      const pendingPurchases = (purchaseRes as any).data?.pendingPurchases || purchases.filter(
        (p: any) => ['pending_approval', 'pending_verification', 'pending'].includes(p.status) && p.paymentMethod === 'bank_transfer'
      );

      if ((qrRes as any).data?.success && ((qrRes as any).data?.data?.qrCodeData || (qrRes as any).data?.qrCodeData)) {
        setQrCodeData((qrRes as any).data?.data?.qrCodeData || (qrRes as any).data?.qrCodeData);
        setHasActivePass(true);
        setIsPendingVerification(false);
      } else {
        setHasActivePass(false);
        const errCode = (qrRes as any).error?.response?.data?.code;
        const errMsg = (qrRes as any).error?.response?.data?.message;
        if (errCode === 'PENDING_VERIFICATION' || (errMsg && errMsg.includes('awaiting administrator verification')) || pendingPurchases.length > 0) {
          setIsPendingVerification(true);
        } else {
          setIsPendingVerification(false);
        }
      }

      setHistory((histRes as any).data?.history || (histRes as any).data?.data || []);
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
        {/* Digital Entry Pass - Apple Wallet Style Card */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative rounded-3xl p-6 md:p-8 bg-gradient-to-br from-[#141816] via-[#0d120f] to-[#0a0a0c] border border-green-500/30 shadow-[0_0_50px_rgba(34,197,94,0.15)] overflow-hidden flex flex-col justify-between"
        >
          {/* Ambient Glow */}
          <div className="absolute top-0 right-0 w-72 h-72 bg-green-500/10 rounded-full blur-[80px] pointer-events-none" />

          <div className="relative z-10 w-full">
            {hasActivePass ? (
              <>
                <div className="flex items-center justify-between mb-6 pb-4 border-b border-white/10">
                  <div className="flex items-center gap-2">
                    <span className="font-display font-extrabold text-lg tracking-tight text-white">
                      TITAN<span className="text-green-400">FIT</span>
                    </span>
                    <span className="px-2 py-0.5 rounded bg-green-500/20 text-green-300 text-[10px] font-black uppercase tracking-widest border border-green-500/30">
                      ACCESS PASS
                    </span>
                  </div>
                  <span className="px-3 py-1 rounded-full bg-green-500/20 text-green-400 border border-green-500/40 text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 shadow-[0_0_12px_rgba(34,197,94,0.3)]">
                    <span className="w-2 h-2 rounded-full bg-green-400 animate-ping" />
                    ACTIVE PASS
                  </span>
                </div>

                <div className="text-center mb-6">
                  <h3 className="text-2xl font-bold text-white mb-0.5">{user?.name}</h3>
                  <p className="text-xs text-gray-400 font-mono">{user?.email}</p>
                </div>

                {/* QR Code Container with Neon Scanner Frame */}
                <div className="relative group my-4 flex justify-center">
                  <div className="relative bg-white p-5 rounded-3xl shadow-[0_0_30px_rgba(34,197,94,0.3)] border-4 border-green-500/30 group-hover:scale-105 transition-transform duration-300">
                    <img
                      src={`https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(qrCodeData)}`}
                      alt="Member Entry QR Pass"
                      className="w-48 h-48 object-contain rounded-xl"
                    />
                    {/* Glowing corner brackets */}
                    <div className="absolute top-2 left-2 w-4 h-4 border-t-2 border-l-2 border-green-500" />
                    <div className="absolute top-2 right-2 w-4 h-4 border-t-2 border-r-2 border-green-500" />
                    <div className="absolute bottom-2 left-2 w-4 h-4 border-b-2 border-l-2 border-green-500" />
                    <div className="absolute bottom-2 right-2 w-4 h-4 border-b-2 border-r-2 border-green-500" />
                  </div>
                </div>

                <div className="mt-6 pt-4 border-t border-white/10 text-center">
                  <p className="text-xs text-gray-300 font-semibold flex items-center justify-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-green-400" /> Scan QR payload at reception kiosk
                  </p>
                  <p className="text-[10px] text-gray-500 mt-1">Encrypted dynamic pass for facility entry & exit.</p>
                </div>
              </>
            ) : isPendingVerification ? (
              <div className="py-6 space-y-4 text-left">
                <div className="flex items-center gap-2 mb-2">
                  <span className="px-2.5 py-0.5 bg-amber-500/20 text-amber-400 text-[10px] font-extrabold uppercase rounded-full border border-amber-500/30 flex items-center gap-1">
                    <Building2 className="w-3 h-3" /> Payment Pending Verification
                  </span>
                </div>
                <h3 className="text-xl font-bold text-amber-200">
                  Attendance Pass Pending Verification
                </h3>
                <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-2xl text-xs text-amber-300 space-y-2">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                    <p className="font-semibold">Your bank transfer is awaiting administrator verification.</p>
                  </div>
                  <p className="text-gray-300">
                    Your digital entry pass will be activated automatically once an administrator approves your bank transfer payment.
                  </p>
                </div>
                <Link
                  to="/my-package"
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-amber-500 hover:bg-amber-400 text-black text-xs font-bold rounded-xl transition-all shadow-md shadow-amber-500/20"
                >
                  View Transfer Status <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            ) : (
              <div className="py-8 space-y-4 text-center">
                <div className="w-16 h-16 rounded-full bg-white/5 mx-auto flex items-center justify-center text-gray-500 border border-white/10">
                  <Clock className="w-8 h-8" />
                </div>
                <h3 className="text-lg font-bold text-white">Active Membership Required</h3>
                <p className="text-xs text-gray-400 max-w-xs mx-auto">
                  You need an active gym membership plan to generate a digital entry QR pass.
                </p>
                <Link
                  to="/packages"
                  className="inline-block px-6 py-2.5 bg-green-500 hover:bg-green-400 text-black text-xs font-bold rounded-xl transition-all shadow-md shadow-green-500/20"
                >
                  Browse Packages
                </Link>
              </div>
            )}
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
