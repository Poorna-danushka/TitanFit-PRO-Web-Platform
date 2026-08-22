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
      required: true,
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
  },
  { timestamps: true }
);

ptBookingSchema.index({ trainerId: 1 });
ptBookingSchema.index({ memberId: 1 });
ptBookingSchema.index({ sessionDate: 1 });

export default mongoose.model('PersonalTrainingBooking', ptBookingSchema);
