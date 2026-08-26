import mongoose from 'mongoose';

const trainerAvailabilitySchema = new mongoose.Schema(
  {
    trainerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    // Either a recurring weekly slot (dayOfWeek) OR a specific date
    dayOfWeek: { type: Number, min: 0, max: 6 }, // 0=Sunday
    date: { type: Date }, // optional specific date
    startTime: { type: String, required: true }, // HH:mm
    endTime: { type: String, required: true }, // HH:mm
    isAvailable: { type: Boolean, default: true },
    isBooked: { type: Boolean, default: false },
  },
  { timestamps: true }
);

trainerAvailabilitySchema.index({ trainerId: 1 });
trainerAvailabilitySchema.index({ dayOfWeek: 1 });
trainerAvailabilitySchema.index({ date: 1 });
trainerAvailabilitySchema.index({ trainerId: 1, dayOfWeek: 1 }, { unique: true, sparse: true });

export default mongoose.model('TrainerAvailability', trainerAvailabilitySchema);
