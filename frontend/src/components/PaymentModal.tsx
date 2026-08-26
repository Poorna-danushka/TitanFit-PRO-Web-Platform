import { useState } from 'react';
import { purchaseAPI } from '../api/apiService';
import { useNotification } from '../hooks/useUI';
import { Loader2, X, ShieldCheck, CreditCard, Building2, CheckCircle2, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (data?: any) => void;
  packageId: string;
  packageName: string;
  price: number;
}

export default function PaymentModal({
  isOpen,
  onClose,
  onSuccess,
  packageId,
  packageName,
  price,
}: PaymentModalProps) {
  const [activeTab, setActiveTab] = useState<'CARD' | 'BANK_TRANSFER'>('CARD');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [submittedBankTransfer, setSubmittedBankTransfer] = useState(false);
  const { success } = useNotification();

  // Card Form State
  const [cardName, setCardName] = useState('');
  const [cardNumber, setCardNumber] = useState('');
  const [cardExpiry, setCardExpiry] = useState('');
  const [cardCvc, setCardCvc] = useState('');

  // Bank Transfer Form State
  const [bankRef, setBankRef] = useState('');
  const [slipRef, setSlipRef] = useState('');

  if (!isOpen) return null;

  const handleCardSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const res = await purchaseAPI.cardPayment({ packageId, price });
      success(res.data.message || 'Card payment processed & receipt emailed!');
      onSuccess(res.data);
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || 'Payment failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleBankTransferSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bankRef.trim()) {
      setError('Please enter your Bank Transfer Reference / Transaction ID.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const res = await purchaseAPI.bankTransferPayment({
        packageId,
        price,
        bankTransferReference: bankRef.trim(),
        transferSlipUrl: slipRef.trim(),
      });
      setSubmittedBankTransfer(true);
      success(res.data.message || 'Bank transfer submitted for admin approval!');
      setTimeout(() => {
        onSuccess();
      }, 2500);
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || 'Failed to submit bank transfer.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-black/85 backdrop-blur-md"
          onClick={onClose}
        />

        {/* Modal Window */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          className="relative w-full max-w-lg bg-gray-900 border border-gray-800 rounded-3xl shadow-2xl overflow-hidden text-white"
        >
          {/* Header */}
          <div className="flex justify-between items-center p-6 border-b border-gray-800">
            <div>
              <h2 className="text-xl font-bold">Checkout & Payment</h2>
              <p className="text-xs text-gray-400">Select payment method to complete purchase</p>
            </div>
            <button onClick={onClose} className="text-gray-400 hover:text-white p-1 rounded-lg hover:bg-gray-800">
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="p-6 space-y-6">
            {/* Plan Summary */}
            <div className="flex justify-between items-center bg-gray-800/60 border border-gray-800 p-4 rounded-2xl">
              <div>
                <p className="text-xs text-gray-400 font-semibold uppercase">Selected Package</p>
                <p className="font-bold text-white text-base mt-0.5">{packageName}</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-gray-400 font-semibold uppercase">Total Amount</p>
                <p className="text-2xl font-black text-green-400">LKR {(price || 0).toLocaleString()}</p>
              </div>
            </div>

            {/* Payment Method Tabs */}
            <div className="grid grid-cols-2 gap-3 p-1.5 bg-gray-950 rounded-2xl border border-gray-800">
              <button
                type="button"
                onClick={() => { setActiveTab('CARD'); setError(''); }}
                className={`py-3 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all ${
                  activeTab === 'CARD' ? 'bg-green-500 text-black shadow-lg shadow-green-500/20' : 'text-gray-400 hover:text-white'
                }`}
              >
                <CreditCard className="w-4 h-4" /> Credit / Debit Card
              </button>
              <button
                type="button"
                onClick={() => { setActiveTab('BANK_TRANSFER'); setError(''); }}
                className={`py-3 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all ${
                  activeTab === 'BANK_TRANSFER' ? 'bg-green-500 text-black shadow-lg shadow-green-500/20' : 'text-gray-400 hover:text-white'
                }`}
              >
                <Building2 className="w-4 h-4" /> Bank Transfer
              </button>
            </div>

            {error && (
              <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex items-start gap-3 text-red-400 text-xs">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <p>{error}</p>
              </div>
            )}

            {/* TAB 1: CARD PAYMENT */}
            {activeTab === 'CARD' && (
              <form onSubmit={handleCardSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-400 mb-1">Cardholder Name</label>
                  <input
                    type="text"
                    required
                    value={cardName}
                    onChange={(e) => setCardName(e.target.value)}
                    placeholder="e.g. John Doe"
                    className="w-full px-4 py-3 bg-gray-800/80 border border-gray-700 rounded-xl text-xs text-white focus:outline-none focus:border-green-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-400 mb-1">Card Number</label>
                  <input
                    type="text"
                    required
                    maxLength={19}
                    value={cardNumber}
                    onChange={(e) => setCardNumber(e.target.value)}
                    placeholder="4532 •••• •••• 8921"
                    className="w-full px-4 py-3 bg-gray-800/80 border border-gray-700 rounded-xl text-xs text-white focus:outline-none focus:border-green-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-gray-400 mb-1">Expiry Date</label>
                    <input
                      type="text"
                      required
                      maxLength={5}
                      value={cardExpiry}
                      onChange={(e) => setCardExpiry(e.target.value)}
                      placeholder="MM/YY"
                      className="w-full px-4 py-3 bg-gray-800/80 border border-gray-700 rounded-xl text-xs text-white focus:outline-none focus:border-green-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-400 mb-1">CVC Code</label>
                    <input
                      type="password"
                      required
                      maxLength={4}
                      value={cardCvc}
                      onChange={(e) => setCardCvc(e.target.value)}
                      placeholder="123"
                      className="w-full px-4 py-3 bg-gray-800/80 border border-gray-700 rounded-xl text-xs text-white focus:outline-none focus:border-green-500"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-2 py-2 text-gray-500 text-[11px] justify-center">
                  <ShieldCheck className="w-4 h-4 text-green-400" />
                  <span>256-Bit SSL Encrypted & Instant Payment Receipt via Email</span>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-4 bg-green-500 text-black font-bold text-sm rounded-xl hover:bg-green-400 transition-all shadow-lg shadow-green-500/20 disabled:opacity-50"
                >
                  {loading ? (
                    <span className="flex items-center justify-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin" /> Processing Payment...
                    </span>
                  ) : (
                    `Pay LKR ${(price || 0).toLocaleString()} Now`
                  )}
                </button>
              </form>
            )}

            {/* TAB 2: BANK TRANSFER */}
            {activeTab === 'BANK_TRANSFER' && (
              <div className="space-y-4">
                {submittedBankTransfer ? (
                  <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} className="p-6 bg-green-500/10 border border-green-500/30 rounded-2xl text-center space-y-3">
                    <CheckCircle2 className="w-12 h-12 text-green-400 mx-auto" />
                    <h3 className="text-lg font-bold text-white">Transfer Slip Submitted!</h3>
                    <p className="text-xs text-gray-300">Your bank transfer has been submitted to Gym Admin for verification. Once approved, your membership will be activated and your official receipt emailed.</p>
                  </motion.div>
                ) : (
                  <form onSubmit={handleBankTransferSubmit} className="space-y-4">
                    {/* Bank Details Display */}
                    <div className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-2xl space-y-2 text-xs">
                      <p className="font-bold text-blue-400 uppercase">Gymfit Pro Bank Details</p>
                      <div className="grid grid-cols-2 gap-2 text-gray-300">
                        <div>
                          <p className="text-gray-500">Bank Name:</p>
                          <p className="font-bold text-white">Commercial Bank PLC</p>
                        </div>
                        <div>
                          <p className="text-gray-500">Account Name:</p>
                          <p className="font-bold text-white">GymFit Pro PLC</p>
                        </div>
                        <div>
                          <p className="text-gray-500">Account Number:</p>
                          <p className="font-mono font-bold text-green-400">8009-1244-51</p>
                        </div>
                        <div>
                          <p className="text-gray-500">Branch:</p>
                          <p className="font-bold text-white">Colombo Main Branch</p>
                        </div>
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-gray-400 mb-1">Bank Reference / Transaction ID</label>
                      <input
                        type="text"
                        required
                        value={bankRef}
                        onChange={(e) => setBankRef(e.target.value)}
                        placeholder="e.g. TXN-89124-COM"
                        className="w-full px-4 py-3 bg-gray-800/80 border border-gray-700 rounded-xl text-xs text-white focus:outline-none focus:border-green-500"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-gray-400 mb-1">Payment Slip Image / File URL (Optional)</label>
                      <input
                        type="text"
                        value={slipRef}
                        onChange={(e) => setSlipRef(e.target.value)}
                        placeholder="https://... or slip ref note"
                        className="w-full px-4 py-3 bg-gray-800/80 border border-gray-700 rounded-xl text-xs text-white focus:outline-none focus:border-green-500"
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={loading}
                      className="w-full py-4 bg-green-500 text-black font-bold text-sm rounded-xl hover:bg-green-400 transition-all shadow-lg shadow-green-500/20 disabled:opacity-50"
                    >
                      {loading ? (
                        <span className="flex items-center justify-center gap-2">
                          <Loader2 className="w-4 h-4 animate-spin" /> Submitting Bank Transfer...
                        </span>
                      ) : (
                        'Submit Transfer for Admin Approval'
                      )}
                    </button>
                  </form>
                )}
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
