import { S3Client, GetObjectCommand, ListObjectsV2Command, PutObjectCommand, DeleteObjectsCommand } from '@aws-sdk/client-s3';
import crypto from 'crypto';
import { execFile } from 'child_process';
import fs from 'fs/promises';
import os from 'os';
import path from 'path';
import { promisify } from 'util';

const execFileAsync = promisify(execFile);

const getS3Config = () => {
  // Support both AWS_S3_BUCKET_NAME (preferred) and legacy S3_BACKUP_BUCKET
  const bucketName = process.env.AWS_S3_BUCKET_NAME || process.env.S3_BACKUP_BUCKET;
  const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
  const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;
  const region = process.env.AWS_REGION || 'us-east-1';

  // Do not throw here; return null so callers can decide how to handle missing config.
  if (!bucketName || !accessKeyId || !secretAccessKey) {
    return null;
  }

  return {
    bucketName,
    client: new S3Client({
      region,
      credentials: {
        accessKeyId,
        secretAccessKey,
      },
    }),
  };
};

import fsSync from 'fs';

const getMongoToolPath = (toolName) => {
  if (process.platform === 'win32') {
    const knownPaths = [
      `C:\\Program Files\\MongoDB\\Tools\\100\\bin\\${toolName}.exe`,
      `C:\\Program Files\\MongoDB\\Tools\\bin\\${toolName}.exe`,
    ];
    for (const p of knownPaths) {
      if (fsSync.existsSync(p)) {
        return p;
      }
    }
  }
  return toolName;
};

// Cached result so we only pay the shell-spawn cost once per process
let _toolsAvailable = null;
let _resolvedTools = { mongodump: 'mongodump', mongorestore: 'mongorestore' };

const checkMongoDumpTools = async () => {
  if (_toolsAvailable !== null) return _toolsAvailable;

  const dumpBin = getMongoToolPath('mongodump');
  const restoreBin = getMongoToolPath('mongorestore');

  try {
    await execFileAsync(dumpBin, ['--version']);
    await execFileAsync(restoreBin, ['--version']);
    _resolvedTools = { mongodump: dumpBin, mongorestore: restoreBin };
    _toolsAvailable = true;
  } catch {
    _toolsAvailable = false;
  }
  return _toolsAvailable;
};

const TOOLS_MISSING_MSG =
  'MongoDB Database Tools (mongodump / mongorestore) are not installed or not in PATH. ' +
  'Download them from https://www.mongodb.com/try/download/database-tools and ensure they are on your system PATH, then restart the server.';

const computeChecksum = async (filePath) => {
  const fileBuffer = await fs.readFile(filePath);
  return crypto.createHash('sha256').update(fileBuffer).digest('hex');
};

const fileNameForBackup = (label = 'manual') => {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  return `${process.env.AWS_S3_PREFIX || 'database-backups'}/${timestamp}-${label}.gz`;
};

const formatMongoUri = (uri) => {
  if (!uri) return uri;
  let formatted = uri;
  if (!formatted.includes('connectTimeoutMS=')) {
    formatted += (formatted.includes('?') ? '&' : '?') + 'connectTimeoutMS=30000';
  }
  if (!formatted.includes('serverSelectionTimeoutMS=')) {
    formatted += (formatted.includes('?') ? '&' : '?') + 'serverSelectionTimeoutMS=30000';
  }
  return formatted;
};

export const getBackupConfiguration = () => {
  const bucketName = process.env.AWS_S3_BUCKET_NAME || process.env.S3_BACKUP_BUCKET;
  return {
    enabled: Boolean(bucketName && process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY),
    bucket: bucketName || null,
    region: process.env.AWS_REGION || 'us-east-1',
    prefix: process.env.AWS_S3_PREFIX || 'database-backups',
    encryption: process.env.AWS_S3_SERVER_SIDE_ENCRYPTION || 'AES256',
    // null = not yet checked, true/false after first backup attempt
    toolsAvailable: _toolsAvailable,
  };
};

export const createDatabaseBackup = async ({ label = 'manual' } = {}) => {
  const s3 = getS3Config();
  if (!s3) {
    return { success: false, message: 'AWS S3 is not configured on the backend. Backups are disabled.' };
  }
  const { bucketName, client } = s3;

  const rawUri = process.env.MONGODB_URI;
  if (!rawUri) {
    return { success: false, message: 'MONGODB_URI is required to create a backup.' };
  }
  const mongoUri = formatMongoUri(rawUri);

  const toolsOk = await checkMongoDumpTools();
  if (!toolsOk) {
    return { success: false, code: 'TOOLS_MISSING', message: TOOLS_MISSING_MSG };
  }

  const dumpPath = path.join(os.tmpdir(), `fitness-backup-${Date.now()}.gz`);

  const sslFlags = (mongoUri.includes('ssl=true') || mongoUri.includes('tls=true') || mongoUri.startsWith('mongodb+srv')) ? ['--ssl'] : [];

  try {
    await execFileAsync(
      _resolvedTools.mongodump,
      ['--uri', mongoUri, `--archive=${dumpPath}`, '--gzip', ...sslFlags],
      { timeout: 60 * 60 * 1000 }
    );
  } catch (dumpErr) {
    const detail = (dumpErr.stderr || dumpErr.stdout || dumpErr.message || '').trim();
    return {
      success: false,
      message: `mongodump failed: ${detail}`,
    };
  }

  try {
    const checksum = await computeChecksum(dumpPath);
    const fileBuffer = await fs.readFile(dumpPath);
    const key = fileNameForBackup(label);

    try {
      await client.send(
        new PutObjectCommand({
          Bucket: bucketName,
          Key: key,
          Body: fileBuffer,
          ContentType: 'application/gzip',
          ContentEncoding: 'gzip',
          ServerSideEncryption: process.env.AWS_S3_SERVER_SIDE_ENCRYPTION || 'AES256',
          Metadata: {
            checksum,
            checksumAlgorithm: 'SHA256',
            createdAt: new Date().toISOString(),
            label,
            source: 'mongodb',
          },
        })
      );
    } catch (s3Err) {
      return {
        success: false,
        message: `Failed to upload backup archive to AWS S3: ${s3Err.message}`,
      };
    }

    return {
      success: true,
      backupKey: key,
      checksum,
      fileSize: fileBuffer.length,
      createdAt: new Date().toISOString(),
      encryption: process.env.AWS_S3_SERVER_SIDE_ENCRYPTION || 'AES256',
    };
  } finally {
    await fs.rm(dumpPath, { force: true, maxRetries: 3 }).catch(() => {});
  }
};

export const restoreDatabaseBackup = async ({ backupKey } = {}) => {
  if (!backupKey) {
    return { success: false, message: 'backupKey is required to restore a database.' };
  }

  const s3 = getS3Config();
  if (!s3) {
    return { success: false, message: 'AWS S3 is not configured on the backend. Restores are disabled.' };
  }
  const { bucketName, client } = s3;

  const rawUri = process.env.MONGODB_URI;
  if (!rawUri) {
    return { success: false, message: 'MONGODB_URI is required to restore a backup.' };
  }
  const mongoUri = formatMongoUri(rawUri);

  const toolsOk = await checkMongoDumpTools();
  if (!toolsOk) {
    return { success: false, code: 'TOOLS_MISSING', message: TOOLS_MISSING_MSG };
  }

  const restoreFilePath = path.join(os.tmpdir(), `fitness-restore-${Date.now()}.gz`);

  try {
    let response;
    try {
      response = await client.send(
        new GetObjectCommand({
          Bucket: bucketName,
          Key: backupKey,
        })
      );
    } catch (s3Err) {
      return {
        success: false,
        message: `Failed to download backup archive from AWS S3: ${s3Err.message}`,
      };
    }

    const bodyChunks = [];
    for await (const chunk of response.Body) {
      bodyChunks.push(chunk);
    }

    const fileBuffer = Buffer.concat(bodyChunks);
    const checksum = crypto.createHash('sha256').update(fileBuffer).digest('hex');
    const expectedChecksum = response.Metadata?.checksum || response.Metadata?.sha256;

    if (expectedChecksum && expectedChecksum.toLowerCase() !== checksum.toLowerCase()) {
      return { success: false, message: 'Backup checksum verification failed. The archive may be corrupted or incomplete.' };
    }

    await fs.writeFile(restoreFilePath, fileBuffer);

    const sslFlags = (mongoUri.includes('ssl=true') || mongoUri.includes('tls=true') || mongoUri.startsWith('mongodb+srv')) ? ['--ssl'] : [];

    try {
      await execFileAsync(
        _resolvedTools.mongorestore,
        ['--uri', mongoUri, `--archive=${restoreFilePath}`, '--gzip', '--drop', '--nsExclude=*.system.*', ...sslFlags],
        { timeout: 60 * 60 * 1000 }
      );
    } catch (restoreErr) {
      const detail = (restoreErr.stderr || restoreErr.stdout || restoreErr.message || '').trim();
      return {
        success: false,
        message: `mongorestore failed: ${detail}`,
      };
    }

    return {
      success: true,
      backupKey,
      verifiedChecksum: checksum,
      restoredAt: new Date().toISOString(),
    };
  } finally {
    await fs.rm(restoreFilePath, { force: true, maxRetries: 3 }).catch(() => {});
  }
};

export const listDatabaseBackups = async () => {
  const s3 = getS3Config();
  if (!s3) {
    return { success: false, message: 'AWS S3 is not configured on the backend. Backups listing is disabled.' };
  }
  const { bucketName, client } = s3;
  const prefix = process.env.AWS_S3_PREFIX || 'database-backups';

  try {
    const response = await client.send(
      new ListObjectsV2Command({
        Bucket: bucketName,
        Prefix: prefix,
      })
    );

    return {
      success: true,
      backups: (response.Contents || []).map((item) => ({
        key: item.Key,
        size: item.Size,
        lastModified: item.LastModified,
      })),
    };
  } catch (err) {
    return { success: false, message: `Failed to list backups from S3: ${err.message}` };
  }
};

/**
 * Delete backups older than retentionDays (integer days) from S3
 * Returns an object with details of deleted objects
 */
export const deleteOldBackups = async (retentionDays = null) => {
  const s3 = getS3Config();
  if (!s3) {
    return { success: false, message: 'AWS S3 is not configured on the backend. Retention cleanup is disabled.' };
  }
  const { bucketName, client } = s3;
  const prefix = process.env.AWS_S3_PREFIX || 'database-backups';
  const days = retentionDays || parseInt(process.env.BACKUP_RETENTION_DAYS || '30', 10);

  if (isNaN(days) || days <= 0) {
    return { success: false, message: 'Invalid retention days configured' };
  }

  const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  try {
    const listed = await client.send(
      new ListObjectsV2Command({ Bucket: bucketName, Prefix: prefix })
    );

    const toDelete = (listed.Contents || []).filter(obj => obj.LastModified < cutoff).map(o => ({ Key: o.Key }));

    if (toDelete.length === 0) {
      return { success: true, deleted: [], message: 'No old backups to delete' };
    }

    const deleteResponse = await client.send(
      new DeleteObjectsCommand({ Bucket: bucketName, Delete: { Objects: toDelete, Quiet: false } })
    );

    return { success: true, deleted: deleteResponse.Deleted || [], errors: deleteResponse.Errors || [] };
  } catch (err) {
    return { success: false, message: `Failed to delete old backups from S3: ${err.message}` };
  }
};
