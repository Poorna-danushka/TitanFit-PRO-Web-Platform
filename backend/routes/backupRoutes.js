import express from 'express';
import { asyncHandler } from '../utils/asyncHandler.js';
import { authMiddleware, adminMiddleware } from '../middleware/auth.js';
import {
  createDatabaseBackup,
  getBackupConfiguration,
  listDatabaseBackups,
  restoreDatabaseBackup,
  deleteOldBackups,
} from '../services/backupService.js';

const router = express.Router();

router.use(authMiddleware, adminMiddleware);

/**
 * Maps a service failure result to an appropriate HTTP status code.
 * - TOOLS_MISSING  → 503 (mongodump/mongorestore not installed)
 * - not configured → 503 (AWS env vars missing)
 * - everything else → fallback
 */
const resolveErrorStatus = (result, fallback = 500) => {
  if (result.code === 'TOOLS_MISSING') return 503;
  if (result.message?.includes('not configured')) return 503;
  return fallback;
};

// ── GET /admin/backups/config ─────────────────────────────────────────────────
// Returns current S3 configuration (enabled, bucket, region, prefix, encryption)
router.get('/backups/config', asyncHandler(async (req, res) => {
  const config = getBackupConfiguration();
  res.status(200).json({
    success: true,
    data: config,
  });
}));

// ── GET /admin/backups ────────────────────────────────────────────────────────
// List all backups stored in S3
router.get('/backups', asyncHandler(async (req, res) => {
  const result = await listDatabaseBackups();

  if (!result.success) {
    // S3 not configured → 503, anything else (S3 SDK error) → 502
    const isMisconfigured = result.message?.includes('not configured');
    return res.status(isMisconfigured ? 503 : 502).json({
      success: false,
      message: result.message || 'Failed to list backups.',
    });
  }

  res.status(200).json({
    success: true,
    data: result.backups,
  });
}));

// ── POST /admin/backups/create ────────────────────────────────────────────────
// Trigger a manual backup
router.post('/backups/create', asyncHandler(async (req, res) => {
  const { label = 'manual' } = req.body || {};

  const result = await createDatabaseBackup({ label });

  if (!result.success) {
    return res.status(resolveErrorStatus(result)).json({
      success: false,
      code: result.code || 'BACKUP_FAILED',
      message: result.message || 'Backup failed.',
    });
  }

  res.status(201).json({
    success: true,
    message: 'Database backup uploaded to S3 successfully.',
    data: result,
  });
}));

// ── POST /admin/backups/restore ───────────────────────────────────────────────
// Restore database from a specific backup key
router.post('/backups/restore', asyncHandler(async (req, res) => {
  const { backupKey } = req.body || {};

  if (!backupKey) {
    return res.status(400).json({ success: false, message: 'backupKey is required.' });
  }

  const result = await restoreDatabaseBackup({ backupKey });

  if (!result.success) {
    const isChecksumFail = result.message?.includes('checksum');
    const status = isChecksumFail ? 422 : resolveErrorStatus(result);
    return res.status(status).json({
      success: false,
      code: result.code || 'RESTORE_FAILED',
      message: result.message || 'Restore failed.',
    });
  }

  res.status(200).json({
    success: true,
    message: 'Database restored successfully from S3 backup.',
    data: result,
  });
}));

// ── DELETE /admin/backups/cleanup ─────────────────────────────────────────────
// Delete backups older than retentionDays
router.delete('/backups/cleanup', asyncHandler(async (req, res) => {
  const retentionDays = req.query.days ? parseInt(req.query.days, 10) : null;

  const result = await deleteOldBackups(retentionDays);

  if (!result.success) {
    const isMisconfigured = result.message?.includes('not configured');
    return res.status(isMisconfigured ? 503 : 400).json({
      success: false,
      message: result.message || 'Cleanup failed.',
    });
  }

  res.status(200).json({
    success: true,
    message: `Cleanup complete. Deleted ${(result.deleted || []).length} backup(s).`,
    data: { deleted: result.deleted, errors: result.errors },
  });
}));

// ── GET /admin/backups/settings ───────────────────────────────────────────────
// Return DB settings if present, otherwise fall back to env-based defaults
router.get('/backups/settings', asyncHandler(async (req, res) => {
  const BackupSetting = (await import('../models/BackupSetting.js')).default;
  let settings = await BackupSetting.findOne().lean();
  if (!settings) {
    settings = {
      scheduleType: process.env.BACKUP_SCHEDULE_TYPE || 'daily',
      scheduleTime: process.env.BACKUP_SCHEDULE_TIME || '02:00',
      customCron: process.env.BACKUP_CRON || '',
      retentionDays: parseInt(process.env.BACKUP_RETENTION_DAYS || '30', 10),
      enabled: (process.env.BACKUP_SCHEDULER_ENABLED || 'true').toLowerCase() !== 'false',
      runOnStart: (process.env.BACKUP_SCHEDULER_RUN_ON_START || 'false').toLowerCase() === 'true',
      lastRunAt: null,
    };
  }
  res.status(200).json({ success: true, data: settings });
}));

// ── PUT /admin/backups/settings ───────────────────────────────────────────────
// Save backup settings and optionally restart the scheduler
router.put('/backups/settings', asyncHandler(async (req, res) => {
  const BackupSetting = (await import('../models/BackupSetting.js')).default;
  const {
    scheduleType = 'daily',
    scheduleTime = '02:00',
    customCron = '',
    retentionDays = 30,
    enabled = true,
    runOnStart = false,
  } = req.body || {};

  if (scheduleType === 'custom' && !customCron) {
    return res.status(400).json({ success: false, message: 'customCron is required when scheduleType is "custom".' });
  }

  if (scheduleType !== 'custom' && !/^([01]\d|2[0-3]):([0-5]\d)$/.test(scheduleTime)) {
    return res.status(400).json({ success: false, message: 'scheduleTime must be a valid 24h time in HH:MM format (e.g. 02:00 or 14:30).' });
  }

  if (typeof retentionDays !== 'number' || retentionDays < 1 || retentionDays > 3650) {
    return res.status(400).json({ success: false, message: 'retentionDays must be a number between 1 and 3650.' });
  }

  let settings = await BackupSetting.findOne();
  if (!settings) {
    settings = new BackupSetting({ scheduleType, scheduleTime, customCron, retentionDays, enabled, runOnStart });
  } else {
    settings.scheduleType = scheduleType;
    settings.scheduleTime = scheduleTime;
    settings.customCron = customCron;
    settings.retentionDays = retentionDays;
    settings.enabled = enabled;
    settings.runOnStart = runOnStart;
  }

  await settings.save();

  // Apply immediately by restarting scheduler
  try {
    const { startBackupScheduler, stopBackupScheduler } = await import('../services/backupScheduler.js');
    if (!enabled) {
      stopBackupScheduler();
    } else {
      await startBackupScheduler();
    }
  } catch (err) {
    // Non-fatal: return saved settings but indicate scheduler issue
    return res.status(200).json({
      success: true,
      data: settings,
      warning: 'Settings saved but scheduler could not be applied: ' + err.message,
    });
  }

  res.status(200).json({ success: true, data: settings });
}));


export default router;
