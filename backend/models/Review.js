import mongoose from 'mongoose';

const reviewSchema = new mongoose.Schema(
  {
    reviewerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    reviewType: {
      type: String,
      enum: ['TRAINER', 'CLASS', 'GYM', 'AI_ASSISTANT'],
      required: true,
    },
    targetId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
    },
    rating: { type: Number, required: true, min: 1, max: 5 },
    title: { type: String },
    comment: { type: String },
    isApproved: { type: Boolean, default: false },
  },
  { timestamps: true }
);

reviewSchema.index({ reviewType: 1 });
reviewSchema.index({ targetId: 1 });
reviewSchema.index({ reviewerId: 1 });

export default mongoose.model('Review', reviewSchema);
