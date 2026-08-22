import mongoose from 'mongoose';

const workoutSessionSchema = new mongoose.Schema(
  {
    memberId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    workoutPlanId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'WorkoutPlan',
      required: true,
    },
    workoutDayId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'WorkoutDay',
      required: true,
    },
    date: { type: Date, required: true, default: Date.now },
    startTime: { type: Date },
    endTime: { type: Date },
    status: {
      type: String,
      enum: ['PLANNED', 'IN_PROGRESS', 'COMPLETED', 'SKIPPED'],
      default: 'PLANNED',
    },
    exercisesCompleted: { type: Number, default: 0 },
    caloriesBurned: { type: Number, default: 0 },
    notes: { type: String },
  },
  { timestamps: true }
);

workoutSessionSchema.index({ memberId: 1 });
workoutSessionSchema.index({ date: -1 });

export default mongoose.model('WorkoutSession', workoutSessionSchema);
