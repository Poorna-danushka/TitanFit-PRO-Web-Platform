import mongoose from 'mongoose';

const ptBookingSchema = new mongoose.Schema(
  {
    trainerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    memberId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    packageId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'PersonalTrainingPackage',
      // optional: support single-session bookings without a package
    },
    sessionDate: { type: Date, required: true },
    startTime: { type: String, required: true }, // HH:mm
    endTime: { type: String, required: true }, // HH:mm
    status: {
      type: String,
      enum: ['CONFIRMED', 'COMPLETED', 'CANCELLED', 'NO_SHOW'],
      default: 'CONFIRMED',
    },
    notes: { type: String },
    focusArea: { type: String },
    sessionNumber: { type: Number },
    totalSessions: { type: Number },
    paymentId: mongoose.Schema.Types.ObjectId,
    cancelledAt: { type: Date },
    // Recurring slot grouping — all future occurrences of the same weekly selection share this ID
    recurringSlotId: { type: String, index: true },
    // The weekday (0=Sun..6=Sat) this recurring slot belongs to
    dayOfWeek: { type: Number, min: 0, max: 6 },
    // Whether this booking was created as part of a recurring selection
    isRecurring: { type: Boolean, default: false },
  },
  { timestamps: true }
);

ptBookingSchema.index({ trainerId: 1 });
ptBookingSchema.index({ memberId: 1 });
ptBookingSchema.index({ sessionDate: 1 });

// Atomic compound uniqueness for active confirmed bookings per trainer, date, and startTime
ptBookingSchema.index(
  {
    trainerId: 1,
    sessionDate: 1,
    startTime: 1,
  },
  {
    unique: true,
    partialFilterExpression: {
      status: 'CONFIRMED',
    },
  }
);

export default mongoose.model('PersonalTrainingBooking', ptBookingSchema);
