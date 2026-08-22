import mongoose from 'mongoose';

const memberProfileSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
    },
    height: { type: Number }, // cm
    weight: { type: Number }, // kg
    bloodType: { type: String },
    allergies: { type: String },
    medicalConditions: { type: String },
    emergencyContact: { type: String },
    emergencyContactPhone: { type: String },
    membershipStartDate: { type: Date, default: Date.now },
    goals: [String],
    fitnessLevel: {
      type: String,
      enum: ['BEGINNER', 'INTERMEDIATE', 'ADVANCED'],
      default: 'BEGINNER',
    },
    preferences: {
      emailNotifications: { type: Boolean, default: true },
      smsNotifications: { type: Boolean, default: true },
      preferredWorkoutTime: { type: String }, // 'morning', 'afternoon', 'evening'
      preferredTrainer: mongoose.Schema.Types.ObjectId,
    },
  },
  { timestamps: true }
);

export default mongoose.model('MemberProfile', memberProfileSchema);
