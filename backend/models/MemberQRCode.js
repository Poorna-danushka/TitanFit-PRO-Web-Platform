import mongoose from 'mongoose';

const memberQRCodeSchema = new mongoose.Schema(
  {
    memberId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
    },
    qrCodeData: { type: String, required: true, unique: true },
    isActive: { type: Boolean, default: true },
    generatedAt: { type: Date, default: Date.now },
    expiresAt: { type: Date },
    lastScannedAt: { type: Date },
  },
  { timestamps: true }
);

export default mongoose.model('MemberQRCode', memberQRCodeSchema);
