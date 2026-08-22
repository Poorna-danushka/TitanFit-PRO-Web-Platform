import mongoose from 'mongoose';

const progressMeasurementSchema = new mongoose.Schema(
  {
    memberId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    measurementDate: { type: Date, required: true, default: Date.now },
    weight: { type: Number }, // kg
    height: { type: Number }, // cm
    bmi: { type: Number },
    bodyFat: { type: Number }, // %
    muscleMass: { type: Number }, // kg
    chest: { type: Number }, // cm
    waist: { type: Number }, // cm
    arms: { type: Number }, // cm
    thighs: { type: Number }, // cm
    calves: { type: Number }, // cm
    notes: { type: String },
  },
  { timestamps: true }
);

progressMeasurementSchema.index({ memberId: 1 });
progressMeasurementSchema.index({ measurementDate: -1 });

export default mongoose.model('ProgressMeasurement', progressMeasurementSchema);
