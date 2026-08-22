import mongoose from 'mongoose';

const progressGoalSchema = new mongoose.Schema(
  {
    memberId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    type: {
      type: String,
      enum: ['WEIGHT', 'MUSCLE', 'BODY_FAT', 'STRENGTH', 'ENDURANCE'],
      required: true,
    },
    targetValue: { type: Number, required: true },
    currentValue: { type: Number },
    startDate: { type: Date, default: Date.now },
    targetDate: { type: Date },
    status: {
      type: String,
      enum: ['IN_PROGRESS', 'ACHIEVED', 'ABANDONED'],
      default: 'IN_PROGRESS',
    },
    notes: { type: String },
  },
  { timestamps: true }
);

progressGoalSchema.index({ memberId: 1 });

export default mongoose.model('ProgressGoal', progressGoalSchema);
