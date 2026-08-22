import mongoose from 'mongoose';

const exerciseLogSchema = new mongoose.Schema(
  {
    workoutSessionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'WorkoutSession',
      required: true,
    },
    exerciseId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Exercise',
      required: true,
    },
    plannedSets: { type: Number },
    completedSets: { type: Number },
    plannedReps: { type: String },
    completedReps: { type: String },
    plannedWeight: { type: Number },
    actualWeight: { type: Number },
    plannedDuration: { type: Number },
    actualDuration: { type: Number },
    caloriesBurned: { type: Number },
    notes: { type: String },
  },
  { timestamps: true }
);

exerciseLogSchema.index({ workoutSessionId: 1 });

export default mongoose.model('ExerciseLog', exerciseLogSchema);
