import mongoose from 'mongoose';

const workoutExerciseSchema = new mongoose.Schema(
  {
    workoutDayId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'WorkoutDay',
      required: true,
    },
    exerciseId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Exercise',
      required: true,
    },
    sets: { type: Number, required: true },
    reps: { type: String }, // e.g., "8-12" or "5x5"
    weight: { type: Number }, // kg
    duration: { type: Number }, // seconds
    rest: { type: Number }, // seconds between sets
    notes: { type: String },
    order: { type: Number },
  },
  { timestamps: true }
);

workoutExerciseSchema.index({ workoutDayId: 1 });

export default mongoose.model('WorkoutExercise', workoutExerciseSchema);
