import cron from 'node-cron';
import logger from '../utils/logger.js';
import BackupSetting from '../models/BackupSetting.js';
import { createDatabaseBackup, deleteOldBackups, getBackupConfiguration } from './backupService.js';

let task = null;
let currentCron = null;

const scheduleTypeToCron = (type, timeStr = '02:00') => {
  let minute = 0;
  let hour = 2;
  if (timeStr && typeof timeStr === 'string' && timeStr.includes(':')) {
    const parts = timeStr.split(':');
    const parsedH = parseInt(parts[0], 10);
    const parsedM = parseInt(parts[1], 10);
    if (!isNaN(parsedH) && parsedH >= 0 && parsedH < 24) hour = parsedH;
    if (!isNaN(parsedM) && parsedM >= 0 && parsedM < 60) minute = parsedM;
  }

  switch ((type || '').toLowerCase()) {
    case 'daily':
      return `${minute} ${hour} * * *`;
    case 'weekly':
      return `${minute} ${hour} * * 0`; // Sunday
    case 'monthly':
      return `${minute} ${hour} 1 * *`; // 1st of month
    case 'quarterly':
      return `${minute} ${hour} 1 */3 *`; // every 3 months on 1st
    case 'custom':
      return null; // custom handled separately
    default:
      return `${minute} ${hour} * * *`;
  }
};

const startWithCron = (cronExpr, retentionDays = 30, runOnStart = false) => {
  if (!cronExpr) {
    throw new Error('A cron expression is required to schedule backups');
  }

  if (task) {
    task.stop();
    task = null;
  }

  currentCron = cronExpr;

  task = cron.schedule(cronExpr, async () => {
    try {
      logger.info(`Scheduled backup started (schedule: ${cronExpr}).`);
      const backupResult = await createDatabaseBackup({ label: 'scheduled' });
      logger.info(`Scheduled backup uploaded: ${backupResult.backupKey} size=${backupResult.fileSize}`);

      logger.info(`Running retention cleanup: deleting backups older than ${retentionDays} days.`);
      const delResult = await deleteOldBackups(retentionDays);
      logger.info(`Retention cleanup result: deleted=${(delResult.deleted || []).length}`);

      // update lastRunAt in DB
      try {
        await BackupSetting.updateOne({}, { $set: { lastRunAt: new Date() } });
      } catch (e) {
        logger.warn('Failed to update BackupSetting.lastRunAt: ' + e.message);
      }
    } catch (err) {
      logger.error(`Scheduled backup failed: ${err.message}`);
    }
  }, { scheduled: true });

  logger.info(`Backup scheduler started with cron '${cronExpr}'. Retention: ${retentionDays} days.`);

  if (runOnStart) {
    (async () => {
      try {
        logger.info('Running initial backup on scheduler start.');
        const r = await createDatabaseBackup({ label: 'startup' });
        logger.info(`Startup backup uploaded: ${r.backupKey}`);
        await deleteOldBackups(retentionDays);
        await BackupSetting.updateOne({}, { $set: { lastRunAt: new Date() } });
      } catch (err) {
        logger.error(`Startup backup failed: ${err.message}`);
      }
    })();
  }

  return task;
};

export const startBackupScheduler = async ({ cronSchedule, runOnStart = false, retentionDays = null } = {}) => {
  const config = getBackupConfiguration();
  if (!config.enabled) {
    // S3 not configured in env — do not start scheduler. Silent return as configured by environment.
    return null;
  }

  // prefer DB-configured settings if present
  let dbSettings = null;
  try {
    dbSettings = await BackupSetting.findOne().lean();
  } catch (e) {
    logger.warn('Could not read BackupSetting from DB: ' + e.message);
  }

  let cronExpr = cronSchedule || null;
  let retention = retentionDays || parseInt(process.env.BACKUP_RETENTION_DAYS || '30', 10);
  let runStart = runOnStart || false;
  let enabled = true;

  if (dbSettings) {
    enabled = dbSettings.enabled;
    retention = dbSettings.retentionDays || retention;
    runStart = dbSettings.runOnStart || runStart;
    if (dbSettings.scheduleType === 'custom' && dbSettings.customCron) {
      cronExpr = dbSettings.customCron;
    } else if (dbSettings.scheduleType) {
      cronExpr = scheduleTypeToCron(dbSettings.scheduleType, dbSettings.scheduleTime);
    }
  }

  // No DB settings yet — fall back to env-configured schedule type
  if (!cronExpr) {
    const envScheduleType = process.env.BACKUP_SCHEDULE_TYPE || 'daily';
    const envScheduleTime = process.env.BACKUP_SCHEDULE_TIME || '02:00';
    cronExpr = scheduleTypeToCron(envScheduleType, envScheduleTime);
    logger.info(`No DB backup settings found; using env BACKUP_SCHEDULE_TYPE="${envScheduleType}" time="${envScheduleTime}" → cron "${cronExpr}".`);
  }

  if (!enabled) {
    logger.info('Backup scheduler not started: disabled in settings.');
    return null;
  }

  if (!cronExpr) {
    // Still null only if scheduleType was 'custom' with no customCron — log and bail gracefully
    logger.warn('Backup scheduler not started: could not resolve a cron expression. Set BACKUP_CRON or configure a schedule in Backup Settings.');
    return null;
  }

  // If same as running, do nothing
  if (currentCron && cronExpr === currentCron && task) {
    logger.info('Backup scheduler already running with same cron expression.');
    return task;
  }

  return startWithCron(cronExpr, retention, runStart);
};

export const stopBackupScheduler = () => {
  if (task) {
    task.stop();
    task = null;
    currentCron = null;
    logger.info('Backup scheduler stopped.');
  }
};

export const getCurrentSchedulerInfo = () => ({
  cron: currentCron,
  running: !!task,
});
