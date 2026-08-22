import mongoose from 'mongoose';

const exerciseSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Please provide exercise name'],
      trim: true,
      unique: true,
    },
    description: {
      type: String,
      required: [true, 'Please provide description'],
    },
    muscleGroups: {
      type: [String],
      required: [true, 'Please provide muscle groups'],
    },
    difficulty: {
      type: String,
      enum: ['BEGINNER', 'INTERMEDIATE', 'ADVANCED'],
      default: 'INTERMEDIATE',
    },
    equipment: [String],
    image: { type: String },
    videoUrl: { type: String },
    instructions: [String],
    caloriesPer10Min: {
      type: Number,
      default: 50,
      min: 1,
    },
    beginnerReps: { type: String },
    intermediateReps: { type: String },
    advancedReps: { type: String },
    steps: [String],
  },
  { timestamps: true }
);

exerciseSchema.index({ muscleGroups: 1 });
exerciseSchema.index({ difficulty: 1 });
exerciseSchema.index({ name: 'text' });

export default mongoose.model('Exercise', exerciseSchema);
