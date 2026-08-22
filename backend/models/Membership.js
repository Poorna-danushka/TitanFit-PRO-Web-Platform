import mongoose from 'mongoose';

const membershipSchema = new mongoose.Schema(
  {
    memberId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    // userId is accepted as an alias for memberId to support both naming conventions
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    planId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'MembershipPlan',
      required: true,
    },
    startDate: { type: Date, required: true, default: Date.now },
    endDate: { type: Date, required: true },
    renewalDate: { type: Date },
    status: {
      type: String,
      enum: ['ACTIVE', 'EXPIRED', 'SUSPENDED', 'CANCELLED'],
      default: 'ACTIVE',
    },
    autoRenew: { type: Boolean, default: true },
    paymentId: mongoose.Schema.Types.ObjectId,
    classesUsedThisMonth: { type: Number, default: 0 },
    ptSessionsUsedThisMonth: { type: Number, default: 0 },
    freezeStartDate: { type: Date },
    freezeEndDate: { type: Date },
    cancelledAt: { type: Date },
    cancellationReason: { type: String },
  },
  { timestamps: true }
);

// Pre-save: sync userId ↔ memberId so either field can be set
membershipSchema.pre('save', function () {
  if (this.userId && !this.memberId) {
    this.memberId = this.userId;
  } else if (this.memberId && !this.userId) {
    this.userId = this.memberId;
  }
});

membershipSchema.index({ memberId: 1 });
membershipSchema.index({ userId: 1 });
membershipSchema.index({ status: 1 });
membershipSchema.index({ endDate: 1 });

export default mongoose.model('Membership', membershipSchema);
