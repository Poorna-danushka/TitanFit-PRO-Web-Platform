import mongoose from 'mongoose';

const BackupSettingSchema = new mongoose.Schema({
  scheduleType: {
    type: String,
    enum: ['daily', 'weekly', 'monthly', 'quarterly', 'custom'],
    default: 'daily',
  },
  scheduleTime: { type: String, default: '02:00' },
  customCron: { type: String, default: '' },
  retentionDays: { type: Number, default: 30 },
  enabled: { type: Boolean, default: true },
  runOnStart: { type: Boolean, default: false },
  lastRunAt: { type: Date, default: null },
}, { timestamps: true });

export default mongoose.model('BackupSetting', BackupSettingSchema);
