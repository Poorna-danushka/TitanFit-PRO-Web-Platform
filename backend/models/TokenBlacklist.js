import mongoose from 'mongoose';

const tokenBlacklistSchema = new mongoose.Schema(
  {
    token: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    reason: {
      type: String,
      enum: ['LOGOUT', 'PASSWORD_RESET', 'SECURITY_REVOCATION'],
      default: 'LOGOUT',
    },
    expiresAt: {
      type: Date,
      required: true,
      expires: 0, // MongoDB TTL index: automatically purges expired tokens
    },
  },
  { timestamps: true }
);

export default mongoose.model('TokenBlacklist', tokenBlacklistSchema);
