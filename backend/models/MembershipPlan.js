import mongoose from 'mongoose';

const membershipPlanSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, unique: true },
    description: { type: String },
    price: { type: Number, required: true }, // LKR
    currency: { type: String, default: 'LKR' },
    durationMonths: { type: Number, required: true },
    durationDays: { type: Number },
    features: [String],
    maxClassesPerWeek: { type: Number, default: -1 }, // -1 = unlimited
    maxPTSessionsPerMonth: { type: Number, default: 0 },
    includesNutrition: { type: Boolean, default: false },
    includeAIAssistant: { type: Boolean, default: true },
    isActive: { type: Boolean, default: true },
    image: { type: String },
  },
  { timestamps: true }
);

membershipPlanSchema.index({ isActive: 1 });

export default mongoose.model('MembershipPlan', membershipPlanSchema);
