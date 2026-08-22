import mongoose from 'mongoose';

const workoutDaySchema = new mongoose.Schema(
  {
    workoutPlanId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'WorkoutPlan',
      required: true,
    },
    dayNumber: { type: Number, required: true },
    dayName: { type: String },
    restDay: { type: Boolean, default: false },
    notes: { type: String },
  },
  { timestamps: true }
);

workoutDaySchema.index({ workoutPlanId: 1 });

export default mongoose.model('WorkoutDay', workoutDaySchema);
