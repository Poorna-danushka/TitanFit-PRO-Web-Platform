import mongoose from 'mongoose';

const packageSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Please provide package name'],
      trim: true,
    },
    price: {
      type: Number,
      required: [true, 'Please provide price'],
    },
    duration: {
      type: String,
      required: [true, 'Please provide duration'],
    },
    description: {
      type: String,
      required: [true, 'Please provide description'],
    },
    level: {
      type: String,
      enum: ['beginner', 'intermediate', 'advanced'],
      default: 'intermediate',
    },
    totalDuration: {
      type: Number,
      default: 0,
      description: 'Total duration in minutes for all exercises',
    },
    totalExercises: {
      type: Number,
      default: 0,
    },
    image: {
      type: String,
      default: '',
    },
    benefits: [String],
    hasPersonalTrainer: {
      type: Boolean,
      default: false,
    },
    maxPTSessions: {
      type: Number,
      default: 0,
    },
    durationMonths: {
      type: Number,
      default: 1,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

// Indexes
packageSchema.index({ isActive: 1 });
packageSchema.index({ level: 1 });
packageSchema.index({ createdAt: -1 });

export default mongoose.model('Package', packageSchema);
