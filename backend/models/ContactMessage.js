import mongoose from 'mongoose';

const contactMessageSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true },
    phone: { type: String },
    subject: { type: String, required: true },
    message: { type: String, required: true },
    status: {
      type: String,
      enum: ['NEW', 'REPLIED', 'RESOLVED'],
      default: 'NEW',
    },
    reply: { type: String },
    repliedBy: mongoose.Schema.Types.ObjectId,
    repliedAt: { type: Date },
  },
  { timestamps: true }
);

contactMessageSchema.index({ status: 1 });
contactMessageSchema.index({ email: 1 });

export default mongoose.model('ContactMessage', contactMessageSchema);
