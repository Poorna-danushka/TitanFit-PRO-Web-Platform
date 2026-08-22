import mongoose from 'mongoose';

const aiConversationSchema = new mongoose.Schema(
  {
    memberId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    topic: { type: String }, // 'fitness', 'nutrition', 'general'
    title: { type: String },
    messageCount: { type: Number, default: 0 },
    status: {
      type: String,
      enum: ['ACTIVE', 'ARCHIVED'],
      default: 'ACTIVE',
    },
    context: {
      membershipId: mongoose.Schema.Types.ObjectId,
      workoutPlanId: mongoose.Schema.Types.ObjectId,
      nutritionPlanId: mongoose.Schema.Types.ObjectId,
    },
  },
  { timestamps: true }
);

aiConversationSchema.index({ memberId: 1 });
aiConversationSchema.index({ status: 1 });

export default mongoose.model('AIConversation', aiConversationSchema);
