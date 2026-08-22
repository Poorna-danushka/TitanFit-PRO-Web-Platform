import mongoose from 'mongoose';

const attendanceSchema = new mongoose.Schema(
  {
    memberId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    checkInTime: { type: Date, required: true },
    checkOutTime: { type: Date },
    method: {
      type: String,
      enum: ['QR', 'MANUAL'],
      default: 'QR',
    },
    status: {
      type: String,
      enum: ['CHECKED_IN', 'CHECKED_OUT'],
      default: 'CHECKED_IN',
    },
    duration: { type: Number }, // minutes
    notes: { type: String },
  },
  { timestamps: true }
);

attendanceSchema.index({ memberId: 1 });
attendanceSchema.index({ checkInTime: -1 });

export default mongoose.model('Attendance', attendanceSchema);
