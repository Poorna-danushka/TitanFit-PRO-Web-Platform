import mongoose from 'mongoose';

const aiConfigurationSchema = new mongoose.Schema(
  {
    provider: { type: String, default: 'PRODUCTION_AI' }, // PRODUCTION_AI, GEMINI, OPENAI, etc.
    modelName: { type: String, default: 'gemini-1.5-flash' },
    modelVersion: { type: String },
    baseURL: { type: String, default: 'https://generativelanguage.googleapis.com/v1beta' },
    apiKey: { type: String, select: false }, // for future providers
    isActive: { type: Boolean, default: true },
    parameters: {
      temperature: { type: Number, default: 0.7 },
      topP: { type: Number, default: 0.9 },
      topK: { type: Number, default: 40 },
      numPredict: { type: Number, default: 128 },
      repeatPenalty: { type: Number, default: 1.1 },
    },
    systemPrompt: { type: String }, // custom system instructions
    maxTokens: { type: Number, default: 2048 },
    timeoutMs: { type: Number, default: 30000 },
    lastHealthCheck: { type: Date },
    isHealthy: { type: Boolean, default: true },
  },
  { timestamps: true }
);

aiConfigurationSchema.index({ provider: 1 });
aiConfigurationSchema.index({ isActive: 1 });

export default mongoose.model('AIConfiguration', aiConfigurationSchema);
