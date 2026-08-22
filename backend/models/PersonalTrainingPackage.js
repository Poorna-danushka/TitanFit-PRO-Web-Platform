import mongoose from 'mongoose';

const ptPackageSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    sessions: { type: Number, required: true },
    price: { type: Number, required: true }, // LKR
    currency: { type: String, default: 'LKR' },
    durationWeeks: { type: Number, required: true },
    includesNutrition: { type: Boolean, default: false },
    includesProgressTracking: { type: Boolean, default: true },
    description: { type: String },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

ptPackageSchema.index({ isActive: 1 });

export default mongoose.model('PersonalTrainingPackage', ptPackageSchema);
