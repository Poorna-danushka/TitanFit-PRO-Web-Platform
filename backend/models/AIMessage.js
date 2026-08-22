import mongoose from 'mongoose';

const aiMessageSchema = new mongoose.Schema(
  {
    conversationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'AIConversation',
      required: true,
    },
    role: {
      type: String,
      enum: ['USER', 'ASSISTANT'],
      required: true,
    },
    content: { type: String, required: true },
    tokens: { type: Number }, // token count for billing
    model: { type: String }, // model used for response
    responseTime: { type: Number }, // ms
    error: { type: String }, // if failed
  },
  { timestamps: true }
);

aiMessageSchema.index({ conversationId: 1 });
aiMessageSchema.index({ role: 1 });

export default mongoose.model('AIMessage', aiMessageSchema);
