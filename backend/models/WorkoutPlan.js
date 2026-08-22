import mongoose from 'mongoose';

const workoutPlanSchema = new mongoose.Schema(
  {
    memberId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    trainerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    name: { type: String, required: true },
    description: { type: String },
    startDate: { type: Date, required: true, default: Date.now },
    endDate: { type: Date },
    type: {
      type: String,
      enum: ['FULL_BODY', 'SPLIT', 'PPL', 'UPPER_LOWER', 'CUSTOM'],
      default: 'FULL_BODY',
    },
    goal: {
      type: String,
      enum: ['WEIGHT_LOSS', 'MUSCLE_GAIN', 'ENDURANCE', 'FLEXIBILITY', 'MAINTENANCE'],
      default: 'MUSCLE_GAIN',
    },
    difficulty: {
      type: String,
      enum: ['BEGINNER', 'INTERMEDIATE', 'ADVANCED'],
      default: 'BEGINNER',
    },
    durationWeeks: { type: Number, required: true },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

workoutPlanSchema.index({ memberId: 1 });
workoutPlanSchema.index({ isActive: 1 });

export default mongoose.model('WorkoutPlan', workoutPlanSchema);
