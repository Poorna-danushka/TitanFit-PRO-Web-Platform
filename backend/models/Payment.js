import mongoose from 'mongoose';

const paymentSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    packageId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Package',
    },
    amount: {
      type: Number,
      required: true,
    },
    currency: {
      type: String,
      default: 'LKR',
    },
    stripePaymentId: {
      type: String,
      unique: true,
      sparse: true,
    },
    stripeChargeId: {
      type: String,
    },
    status: {
      type: String,
      enum: ['pending', 'completed', 'failed', 'refunded', 'pending_approval', 'rejected'],
      default: 'pending',
    },
    paymentMethod: {
      type: String,
      enum: ['card', 'bank_transfer', 'stripe', 'paypal'],
      default: 'card',
    },
    bankTransferReference: {
      type: String,
    },
    transferSlipUrl: {
      type: String,
    },
    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    approvedAt: Date,
    description: String,
    failureReason: String,
    refundedAt: Date,
    refundAmount: Number,
  },
  { timestamps: true }
);

paymentSchema.index({ userId: 1 });
paymentSchema.index({ status: 1 });
paymentSchema.index({ createdAt: -1 });

export default mongoose.model('Payment', paymentSchema);
