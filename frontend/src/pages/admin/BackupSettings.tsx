import { useEffect, useState } from 'react';
import { adminAPI } from '../../api/apiService';
import Pagination from '../../components/Pagination';
import BackButton from '../../components/BackButton';

// ── Types ────────────────────────────────────────────────────────────────────

type ToastType = 'success' | 'error' | 'info' | 'warning';

interface Toast {
  id: number;
  type: ToastType;
  message: string;
}

interface BackupItem {
  key: string;
  size: number;
  lastModified: string;
}

const scheduleOptions = [
  { value: 'daily',     label: 'Daily (02:00 AM)' },
  { value: 'weekly',    label: 'Weekly (Sunday 02:00 AM)' },
  { value: 'monthly',   label: 'Monthly (1st @ 02:00 AM)' },
  { value: 'quarterly', label: 'Quarterly (every 3 months)' },
  { value: 'custom',    label: 'Custom (cron expression)' },
];

// ── Toast Component ──────────────────────────────────────────────────────────

const toastStyles: Record<ToastType, string> = {
  success: 'bg-emerald-900/80 border-emerald-500/40 text-emerald-200',
  error:   'bg-red-900/80 border-red-500/40 text-red-200',
  info:    'bg-blue-900/80 border-blue-500/40 text-blue-200',
  warning: 'bg-amber-900/80 border-amber-500/40 text-amber-200',
};

const toastIcons: Record<ToastType, string> = {
  success: '✓',
  error:   '✕',
  info:    'ℹ',
  warning: '⚠',
};

function ToastBar({ toasts, dismiss }: { toasts: Toast[]; dismiss: (id: number) => void }) {
  if (toasts.length === 0) return null;
  return (
    <div className="fixed top-4 right-4 z-50 flex flex-col gap-2 w-96 max-w-[calc(100vw-2rem)]">
      {toasts.map(t => (
        <div
          key={t.id}
          className={`flex items-start gap-3 px-4 py-3 rounded-lg border text-sm backdrop-blur shadow-lg animate-in slide-in-from-right-4 ${toastStyles[t.type]}`}
        >
          <span className="text-base leading-none mt-0.5 shrink-0 font-bold">{toastIcons[t.type]}</span>
          <span className="flex-1 leading-snug">{t.message}</span>
          <button
            onClick={() => dismiss(t.id)}
            className="ml-2 opacity-60 hover:opacity-100 text-lg leading-none shrink-0"
            aria-label="Dismiss"
          >×</button>
        </div>
      ))}
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────

export default function BackupSettings() {
  const [loading, setLoading]           = useState(true);
  const [saving, setSaving]             = useState(false);
  const [backingUp, setBackingUp]       = useState(false);
  const [restoringKey, setRestoringKey] = useState<string | null>(null);
  const [deletingKey, setDeletingKey]   = useState<string | null>(null);
  const [cleaning, setCleaning]         = useState(false);
  const [toasts, setToasts]             = useState<Toast[]>([]);
  const [toastCounter, setToastCounter] = useState(0);

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const [settings, setSettings] = useState<any>({
    scheduleType: 'daily',
    scheduleTime: '02:00',
    customCron: '',
    retentionDays: 30,
    enabled: true,
    runOnStart: false,
    lastRunAt: null,
  });
  const [backups, setBackups] = useState<BackupItem[]>([]);
  const [s3Config, setS3Config] = useState<any>({});
  // null = unchecked, false = missing, true = available
  const [toolsMissing, setToolsMissing] = useState<boolean | null>(null);

  // ── Toasting ───────────────────────────────────────────────────────────────

  const addToast = (type: ToastType, message: string, durationMs = 5000) => {
    const id = toastCounter + 1;
    setToastCounter(id);
    setToasts(prev => [...prev, { id, type, message }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), durationMs);
  };

  const dismissToast = (id: number) => setToasts(prev => prev.filter(t => t.id !== id));

  // ── Data Loading ───────────────────────────────────────────────────────────

  const loadData = async () => {
    try {
      setLoading(true);
      const [sRes, bRes, cfgRes] = await Promise.allSettled([
        adminAPI.getBackupSettings(),
        adminAPI.listBackups(),
        adminAPI.getSchedulerInfo(),
      ]);

      if (sRes.status === 'fulfilled') {
        const sData = sRes.value.data?.data || sRes.value.data || {};
        setSettings((prev: any) => ({ ...prev, ...sData }));
      } else {
        addToast('warning', 'Could not load backup settings — using defaults.');
      }

      if (bRes.status === 'fulfilled') {
        const raw = bRes.value.data?.data ?? bRes.value.data ?? [];
        const sorted = [...raw].sort((a: BackupItem, b: BackupItem) => new Date(b.lastModified).getTime() - new Date(a.lastModified).getTime());
        setBackups(sorted);
      } else {
        const msg = (bRes.reason as any)?.safeMessage || 'Could not load backup list from S3.';
        addToast('warning', msg);
      }

      if (cfgRes.status === 'fulfilled') {
        const cfg = cfgRes.value.data?.data || cfgRes.value.data || {};
        setS3Config(cfg);
        // toolsAvailable is null until first backup attempt; false means definitely missing
        if (cfg.toolsAvailable === false) setToolsMissing(true);
        else if (cfg.toolsAvailable === true) setToolsMissing(false);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, []);

  // ── Actions ────────────────────────────────────────────────────────────────

  const saveSettings = async () => {
    try {
      setSaving(true);
      const res = await adminAPI.updateBackupSettings({
        scheduleType: settings.scheduleType,
        scheduleTime: settings.scheduleTime || '02:00',
        customCron: settings.customCron,
        retentionDays: Number(settings.retentionDays || 30),
        enabled: Boolean(settings.enabled),
        runOnStart: Boolean(settings.runOnStart),
      });

      const saved = res.data?.data || settings;
      if (res.data?.warning) {
        addToast('warning', res.data.warning, 8000);
      } else {
        addToast('success', 'Backup settings saved and scheduler updated.');
      }
      setSettings(saved);

      // Refresh backup list after settings update
      const bRes = await adminAPI.listBackups();
      setBackups(bRes.data?.data ?? bRes.data ?? []);
    } catch (err: any) {
      addToast('error', err.safeMessage || 'Failed to save settings. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const triggerBackup = async () => {
    try {
      setBackingUp(true);
      addToast('info', 'Backup in progress — this may take a minute…');
      const res = await adminAPI.createBackup('manual-ui');
      const key = res.data?.data?.backupKey;
      addToast('success', key ? `Backup created: ${key.split('/').pop()}` : 'Backup created successfully.');
      setToolsMissing(false);
      // Refresh list
      const bRes = await adminAPI.listBackups();
      setBackups(bRes.data?.data ?? bRes.data ?? []);
    } catch (err: any) {
      const code = (err.response?.data as any)?.code;
      if (code === 'TOOLS_MISSING') {
        setToolsMissing(true);
        addToast('error',
          'mongodump / mongorestore are not installed. Install MongoDB Database Tools and restart the server.',
          10_000
        );
      } else {
        addToast('error', err.safeMessage || 'Backup failed. Check your S3 configuration.');
      }
    } finally {
      setBackingUp(false);
    }
  };

  const restore = async (key: string) => {
    if (!confirm(`⚠️ DANGER: Restoring "${key.split('/').pop()}" will overwrite the ENTIRE current database.\n\nThis cannot be undone. Continue?`)) return;
    try {
      setRestoringKey(key);
      addToast('info', 'Restore in progress — do not close this tab…');
      const res = await adminAPI.restoreBackup(key);
      const at = res.data?.data?.restoredAt ? new Date(res.data.data.restoredAt).toLocaleString() : 'now';
      addToast('success', `Database successfully restored (${at}).`, 8000);
      setToolsMissing(false);
    } catch (err: any) {
      const code = (err.response?.data as any)?.code;
      if (code === 'TOOLS_MISSING') {
        setToolsMissing(true);
        addToast('error',
          'mongorestore is not installed. Install MongoDB Database Tools and restart the server.',
          10_000
        );
      } else {
        addToast('error', err.safeMessage || 'Restore failed. The backup may be corrupted or the server is misconfigured.');
      }
    } finally {
      setRestoringKey(null);
    }
  };

  const deleteBackup = async (key: string) => {
    const fileName = key.split('/').pop() || key;
    if (!confirm(`Are you sure you want to delete backup "${fileName}" from S3?\n\nThis operation cannot be undone. Continue?`)) return;
    try {
      setDeletingKey(key);
      await adminAPI.deleteSingleBackup(key);
      addToast('success', `Backup "${fileName}" deleted successfully from S3.`);
      const bRes = await adminAPI.listBackups();
      const raw = bRes.data?.data ?? bRes.data ?? [];
      const sorted = [...raw].sort((a: BackupItem, b: BackupItem) => new Date(b.lastModified).getTime() - new Date(a.lastModified).getTime());
      setBackups(sorted);
    } catch (err: any) {
      addToast('error', err.safeMessage || 'Failed to delete backup.');
    } finally {
      setDeletingKey(null);
    }
  };

  const runCleanup = async () => {
    if (!confirm(`Delete all backups older than ${settings.retentionDays} days from S3?`)) return;
    try {
      setCleaning(true);
      const res = await adminAPI.deleteOldBackups(settings.retentionDays);
      const count = res.data?.data?.deleted?.length ?? 0;
      addToast('success', `Cleanup complete — ${count} old backup(s) deleted.`);
      const bRes = await adminAPI.listBackups();
      setBackups(bRes.data?.data ?? bRes.data ?? []);
    } catch (err: any) {
      addToast('error', err.safeMessage || 'Cleanup failed.');
    } finally {
      setCleaning(false);
    }
  };

  // ── Loading state ──────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="p-6 flex items-center gap-3 text-gray-400">
        <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
        </svg>
        Loading backup settings…
      </div>
    );
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <>
      <ToastBar toasts={toasts} dismiss={dismissToast} />

      <div className="space-y-8 pb-16 relative text-white min-h-[85vh]">
        <div className="flex items-center justify-between">
          <BackButton fallbackPath="/admin/dashboard" />
        </div>

        {/* Background glow graphics */}
        <div className="absolute top-0 left-10 w-80 h-80 bg-blue-500/10 blur-[130px] rounded-full pointer-events-none -z-10" />

        {/* Header Banner */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-[#0f0e13]/90 backdrop-blur-md p-7 md:p-8 rounded-3xl border border-white/10 shadow-2xl relative overflow-hidden">
          <div className="flex items-center gap-5 relative z-10">
            <div className="w-16 h-16 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center shadow-[0_0_30px_rgba(59,130,246,0.15)] shrink-0">
              <span className="text-3xl">🛡️</span>
            </div>
            <div>
              <h1 className="text-3xl font-display font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-white via-gray-100 to-gray-400 tracking-tight">
                Database Backup &amp; Recovery
              </h1>
              <p className="text-gray-400 text-sm font-medium mt-0.5">
                Automated AWS S3 backups, retention schedules, custom execution times, and disaster recovery.
              </p>
            </div>
          </div>
        </div>

        {/* ── S3 Status Banner ────────────────────────────────────────────── */}
        {s3Config.enabled === false && (
          <div className="flex items-start gap-3 p-4 rounded-lg bg-red-900/30 border border-red-500/30 text-red-300 text-sm">
            <span className="text-lg leading-none mt-0.5">⚠</span>
            <div>
              <p className="font-semibold">S3 is not configured</p>
              <p className="mt-1 opacity-80">
                Set <code className="bg-red-900/50 px-1 rounded">AWS_S3_BUCKET_NAME</code>,{' '}
                <code className="bg-red-900/50 px-1 rounded">AWS_ACCESS_KEY_ID</code>, and{' '}
                <code className="bg-red-900/50 px-1 rounded">AWS_SECRET_ACCESS_KEY</code> in your backend <code>.env</code> to enable backups.
              </p>
            </div>
          </div>
        )}

        {/* ── MongoDB Tools Missing Banner ─────────────────────────────────── */}
        {toolsMissing === true && (
          <div className="flex items-start gap-3 p-4 rounded-lg bg-amber-900/30 border border-amber-500/30 text-amber-200 text-sm">
            <span className="text-xl leading-none mt-0.5">🔧</span>
            <div className="space-y-2">
              <p className="font-semibold">MongoDB Database Tools not found on this server</p>
              <p className="opacity-80">
                <strong>mongodump</strong> and <strong>mongorestore</strong> must be installed and available in the system PATH before backups and restores will work.
              </p>
              <ol className="list-decimal list-inside space-y-1 opacity-90">
                <li>
                  Download from{' '}
                  <a
                    href="https://www.mongodb.com/try/download/database-tools"
                    target="_blank"
                    rel="noreferrer"
                    className="underline hover:text-amber-100"
                  >
                    mongodb.com/try/download/database-tools
                  </a>
                  {' '}(Windows x86_64 MSI)
                </li>
                <li>Run the installer and check <em>"Add to PATH"</em></li>
                <li>Restart the backend server</li>
              </ol>
              <p className="text-xs opacity-60">
                Or via winget: <code className="bg-amber-900/40 px-1 rounded">winget install MongoDB.DatabaseTools</code>
              </p>
            </div>
          </div>
        )}

        {/* ── Scheduler Settings ───────────────────────────────────────────── */}
        <div className="bg-white/5 border border-white/[0.06] p-5 rounded-xl space-y-4">
          <h3 className="text-lg font-semibold">Scheduler Settings</h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Schedule Type */}
            <div>
              <label className="block text-sm font-medium mb-1 text-gray-300">Schedule</label>
              <select
                className="w-full p-2 rounded-lg bg-[#0b0b0c] text-white border border-white/[0.08] focus:outline-none focus:ring-1 focus:ring-purple-500"
                value={settings.scheduleType}
                onChange={(e) => setSettings({ ...settings, scheduleType: e.target.value })}
              >
                {scheduleOptions.map(o => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>

              {settings.scheduleType !== 'custom' && (
                <div className="mt-2">
                  <label className="block text-xs font-medium mb-1 text-gray-400">Backup Time (HH:MM)</label>
                  <input
                    type="time"
                    value={settings.scheduleTime || '02:00'}
                    onChange={(e) => setSettings({ ...settings, scheduleTime: e.target.value })}
                    className="w-full p-2 rounded-lg bg-[#0b0b0c] text-white border border-white/[0.08] focus:outline-none focus:ring-1 focus:ring-purple-500 text-sm"
                  />
                </div>
              )}

              {settings.scheduleType === 'custom' && (
                <div className="mt-2">
                  <label className="block text-xs font-medium mb-1 text-gray-400">Cron expression</label>
                  <input
                    value={settings.customCron}
                    onChange={(e) => setSettings({ ...settings, customCron: e.target.value })}
                    placeholder="e.g. 0 3 * * 1"
                    className="w-full p-2 rounded-lg bg-[#0b0b0c] text-white border border-white/[0.08] focus:outline-none focus:ring-1 focus:ring-purple-500 font-mono text-sm"
                  />
                </div>
              )}
            </div>

            {/* Retention + flags */}
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium mb-1 text-gray-300">Retention (days)</label>
                <input
                  type="number"
                  min={1}
                  max={3650}
                  value={settings.retentionDays}
                  onChange={(e) => setSettings({ ...settings, retentionDays: Number(e.target.value) })}
                  className="w-full p-2 rounded-lg bg-[#0b0b0c] text-white border border-white/[0.08] focus:outline-none focus:ring-1 focus:ring-purple-500"
                />
              </div>

              <div className="flex flex-wrap items-center gap-5">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={settings.enabled}
                    onChange={(e) => setSettings({ ...settings, enabled: e.target.checked })}
                    className="w-4 h-4 accent-purple-500"
                  />
                  <span className="text-sm">Scheduler enabled</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={settings.runOnStart}
                    onChange={(e) => setSettings({ ...settings, runOnStart: e.target.checked })}
                    className="w-4 h-4 accent-purple-500"
                  />
                  <span className="text-sm">Run backup on server start</span>
                </label>
              </div>
            </div>
          </div>

          {/* Actions row */}
          <div className="flex flex-wrap items-center gap-3 pt-2">
            <button
              disabled={saving}
              onClick={saveSettings}
              className="px-5 py-2 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg text-sm font-medium transition-colors"
            >
              {saving ? 'Saving…' : 'Save Settings'}
            </button>

            <button
              disabled={backingUp || !s3Config.enabled}
              onClick={triggerBackup}
              title={!s3Config.enabled ? 'S3 is not configured' : undefined}
              className="px-5 py-2 bg-amber-600 hover:bg-amber-500 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg text-sm font-medium transition-colors"
            >
              {backingUp ? 'Backing up…' : 'Trigger Backup Now'}
            </button>

            <button
              disabled={cleaning || !s3Config.enabled}
              onClick={runCleanup}
              title={!s3Config.enabled ? 'S3 is not configured' : undefined}
              className="px-5 py-2 bg-zinc-700 hover:bg-zinc-600 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg text-sm font-medium transition-colors"
            >
              {cleaning ? 'Cleaning…' : `Run Retention Cleanup`}
            </button>
          </div>
        </div>

        {/* ── S3 / Scheduler Status ────────────────────────────────────────── */}
        <div className="bg-white/5 border border-white/[0.06] p-5 rounded-xl">
          <h3 className="text-lg font-semibold mb-3">Configuration Status</h3>
          <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2 text-sm">
            {[
              ['S3 Enabled',    s3Config.enabled ? '✓ Yes' : '✗ No (missing env vars)'],
              ['S3 Bucket',     s3Config.bucket  || 'Not configured'],
              ['Region',        s3Config.region  || '—'],
              ['Prefix',        s3Config.prefix  || '—'],
              ['Encryption',    s3Config.encryption || '—'],
              ['Scheduler',     settings.enabled  ? '● Active' : '○ Disabled'],
              ['Schedule Time', settings.scheduleType === 'custom'
                ? `Custom cron (${settings.customCron || 'Not set'})`
                : `${settings.scheduleType?.toUpperCase() || 'DAILY'} @ ${settings.scheduleTime || '02:00'}`],
              ['Last run (DB)', settings.lastRunAt
                ? new Date(settings.lastRunAt).toLocaleString()
                : 'Never'],
            ].map(([label, value]) => (
              <div key={label as string} className="flex gap-2">
                <dt className="text-gray-400 shrink-0">{label}:</dt>
                <dd className="font-medium truncate">{value as string}</dd>
              </div>
            ))}
          </dl>
        </div>

        {/* ── Backups List ─────────────────────────────────────────────────── */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-lg font-semibold">Stored Backups</h3>
            <button
              onClick={loadData}
              className="text-xs text-gray-400 hover:text-white px-3 py-1 rounded border border-white/[0.08] transition-colors"
            >
              Refresh
            </button>
          </div>

          <div className="bg-white/5 border border-white/[0.06] rounded-xl overflow-hidden">
            {backups.length === 0 ? (
              <div className="p-6 text-center text-gray-400 text-sm">
                {s3Config.enabled
                  ? 'No backups found in S3. Trigger one manually or wait for the scheduler.'
                  : 'S3 is not configured — no backups available.'}
              </div>
            ) : (
              <div className="divide-y divide-white/[0.04]">
                {(() => {
                  const totalPages = Math.ceil(backups.length / itemsPerPage);
                  const startIndex = (currentPage - 1) * itemsPerPage;
                  const paginatedBackups = backups.slice(startIndex, startIndex + itemsPerPage);

                  return (
                    <>
                      {paginatedBackups.map(b => {
                        const name       = b.key.split('/').pop() || b.key;
                        const sizeMB     = (b.size / 1024 / 1024).toFixed(2);
                        const dateStr    = b.lastModified ? new Date(b.lastModified).toLocaleString() : '—';
                        const isRestoring = restoringKey === b.key;
                        const isDeleting = deletingKey === b.key;
                        const downloadUrl = `https://${s3Config.bucket || ''}.s3.${s3Config.region || 'us-east-1'}.amazonaws.com/${encodeURIComponent(b.key)}`;

                        return (
                          <div
                            key={b.key}
                            className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-4 hover:bg-white/[0.02] transition-colors"
                          >
                            <div className="min-w-0">
                              <div className="font-medium text-sm truncate" title={b.key}>{name}</div>
                              <div className="text-xs text-gray-400 mt-0.5">{dateStr} · {sizeMB} MB</div>
                            </div>

                            <div className="flex items-center gap-2 shrink-0">
                              <button
                                disabled={!!restoringKey || !!deletingKey}
                                onClick={() => restore(b.key)}
                                className="px-3 py-1.5 rounded-lg bg-amber-700/80 hover:bg-amber-600 border border-amber-500/30 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-medium transition-colors"
                              >
                                {isRestoring ? 'Restoring…' : 'Restore'}
                              </button>

                              <a
                                href={downloadUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="px-3 py-1.5 rounded-lg bg-white/[0.07] hover:bg-white/[0.12] border border-white/10 text-white text-xs font-medium transition-colors"
                              >
                                Download
                              </a>

                              <button
                                disabled={!!restoringKey || !!deletingKey}
                                onClick={() => deleteBackup(b.key)}
                                className="px-3 py-1.5 rounded-lg bg-red-900/60 hover:bg-red-700/80 border border-red-500/30 disabled:opacity-50 disabled:cursor-not-allowed text-red-200 hover:text-white text-xs font-medium transition-colors"
                              >
                                {isDeleting ? 'Deleting…' : 'Delete'}
                              </button>
                            </div>
                          </div>
                        );
                      })}

                      <div className="p-4 border-t border-white/[0.06]">
                        <Pagination
                          currentPage={currentPage}
                          totalPages={totalPages}
                          totalItems={backups.length}
                          itemsPerPage={itemsPerPage}
                          onPageChange={setCurrentPage}
                        />
                      </div>
                    </>
                  );
                })()}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
