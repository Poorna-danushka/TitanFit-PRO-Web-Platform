import mongoose from 'mongoose';

const trainerAvailabilitySchema = new mongoose.Schema(
  {
    trainerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    dayOfWeek: { type: Number, required: true, min: 0, max: 6 }, // 0=Sunday
    startTime: { type: String, required: true }, // HH:mm
    endTime: { type: String, required: true }, // HH:mm
    isAvailable: { type: Boolean, default: true },
  },
  { timestamps: true }
);

trainerAvailabilitySchema.index({ trainerId: 1 });
trainerAvailabilitySchema.index({ dayOfWeek: 1 });

export default mongoose.model('TrainerAvailability', trainerAvailabilitySchema);
