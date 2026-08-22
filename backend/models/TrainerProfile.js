import mongoose from 'mongoose';

const trainerProfileSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
    },
    qualification: { type: String },
    certifications: [String],
    experience: { type: Number }, // years
    specialization: [String],
    bio: { type: String },
    hourlyRate: { type: Number }, // LKR
    rating: { type: Number, default: 0, min: 0, max: 5 },
    reviewsCount: { type: Number, default: 0 },
    isAvailable: { type: Boolean, default: true },
    totalClients: { type: Number, default: 0 },
  },
  { timestamps: true }
);

export default mongoose.model('TrainerProfile', trainerProfileSchema);
