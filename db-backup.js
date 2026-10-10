// Automated SQLite snapshot backups stored on the persistent DATA_DIR volume.
const fs = require('node:fs');
const path = require('node:path');
const { DatabaseSync } = require('node:sqlite');

const DEFAULT_DATA_DIR = process.env.DATA_DIR || path.join(__dirname, 'storage');
const DAY_MS = 24 * 60 * 60 * 1000;
let started = false;

function listBackups(options = {}) {
  const dataDir = options.dataDir || DEFAULT_DATA_DIR;
  const backupDir = path.join(dataDir, 'backups');
  if (!fs.existsSync(backupDir)) return [];
  return fs.readdirSync(backupDir)
    .filter(name => /^app-\d{4}-\d{2}-\d{2}T.*\.db$/.test(name))
    .map(name => {
      const stat = fs.statSync(path.join(backupDir, name));
      return { file: name, bytes: stat.size, createdAt: stat.mtime.toISOString() };
    })
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

function createBackup(options = {}) {
  const dataDir = options.dataDir || DEFAULT_DATA_DIR;
  const keep = Math.max(1, Math.min(30, Number(options.keep ?? process.env.DB_BACKUP_KEEP) || 7));
  const sourcePath = path.join(dataDir, 'app.db');
  const backupDir = path.join(dataDir, 'backups');
  if (!fs.existsSync(sourcePath)) throw new Error('SQLite source database not found; backup was not created.');
  fs.mkdirSync(backupDir, { recursive: true, mode: 0o700 });
  const stamp = new Date().toISOString().replace(/:/g, '-');
  let destinationPath = path.join(backupDir, `app-${stamp}.db`);
  let suffix = 1;
  while (fs.existsSync(destinationPath)) destinationPath = path.join(backupDir, `app-${stamp}-${suffix++}.db`);

  const source = new DatabaseSync(sourcePath);
  try {
    source.exec('PRAGMA busy_timeout = 5000');
    source.exec(`VACUUM INTO '${destinationPath.replace(/'/g, "''")}'`);
  } finally { source.close(); }

  try {
    fs.chmodSync(destinationPath, 0o600);
    const snapshot = new DatabaseSync(destinationPath, { readOnly: true });
    try {
      const check = snapshot.prepare('PRAGMA quick_check').all();
      const hasUsers = snapshot.prepare("SELECT 1 FROM sqlite_master WHERE type='table' AND name='users'").get();
      if (check.length !== 1 || check[0].quick_check !== 'ok' || !hasUsers) throw new Error('SQLite backup verification failed.');
    } finally { snapshot.close(); }
  } catch (error) {
    try { fs.rmSync(destinationPath, { force: true }); } catch {}
    throw error;
  }

  const backups = listBackups({ dataDir });
  for (const old of backups.slice(keep)) {
    try { fs.rmSync(path.join(backupDir, old.file), { force: true }); }
    catch (error) { console.error('[db-backup] Could not prune old snapshot:', error.message); }
  }
  const stat = fs.statSync(destinationPath);
  return { ok: true, file: path.basename(destinationPath), bytes: stat.size, createdAt: stat.mtime.toISOString(), retained: listBackups({ dataDir }).length };
}

function startScheduledBackups() {
  if (started) return;
  started = true;
  const run = () => {
    try {
      const result = createBackup();
      console.log('[db-backup] Snapshot created and verified:', result.file, `(${result.bytes} bytes)`);
    } catch (error) { console.error('[db-backup] Snapshot failed:', error.message); }
  };
  const initial = setTimeout(run, 60_000);
  initial.unref?.();
  const interval = setInterval(run, DAY_MS);
  interval.unref?.();
}
module.exports = { createBackup, listBackups, startScheduledBackups };
