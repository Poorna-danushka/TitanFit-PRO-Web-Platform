import mongoose from 'mongoose';

const promotionSchema = new mongoose.Schema(
  {
    code: { type: String, required: true, unique: true, uppercase: true },
    description: { type: String },
    discountType: {
      type: String,
      enum: ['PERCENTAGE', 'FIXED'],
      required: true,
    },
    discountValue: { type: Number, required: true },
    maxUses: { type: Number, default: -1 }, // -1 = unlimited
    usedCount: { type: Number, default: 0 },
    validFrom: { type: Date, required: true },
    validUntil: { type: Date, required: true },
    applicableTo: {
      type: String,
      enum: ['ALL', 'MEMBERSHIP', 'CLASS', 'PERSONAL_TRAINING'],
      default: 'ALL',
    },
    isActive: { type: Boolean, default: true },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  { timestamps: true }
);

promotionSchema.index({ code: 1 });
promotionSchema.index({ isActive: 1 });
promotionSchema.index({ validFrom: 1, validUntil: 1 });

export default mongoose.model('Promotion', promotionSchema);
