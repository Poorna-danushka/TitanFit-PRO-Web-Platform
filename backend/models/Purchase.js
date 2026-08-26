import mongoose from 'mongoose';

const purchaseSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    packageId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Package',
      required: true,
    },
    price: {
      type: Number,
      required: true,
    },
    paymentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Payment',
      required: false,
      unique: true,
      sparse: true,
    },
    status: {
      type: String,
      enum: ['pending', 'pending_approval', 'pending_verification', 'paid', 'rejected'],
      default: 'paid',
    },
    paymentMethod: {
      type: String,
      enum: ['card', 'bank_transfer', 'stripe', 'paypal'],
      default: 'card',
    },
    bankTransferReference: String,
    transferSlipUrl: String,
    familyMembers: [
      {
        name: { type: String, required: true },
        age: { type: Number },
        relationship: { type: String },
        phone: { type: String },
      },
    ],
    purchaseDate: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

export default mongoose.model('Purchase', purchaseSchema);
