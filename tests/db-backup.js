const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'competitive-exam-ai-backup-test-'));
process.env.DATA_DIR = dataDir;
let db;
try {
  db = require('../db');
  db.prepare('INSERT INTO users (email, name, created_at) VALUES (?, ?, ?)').run('backup-check@example.test', 'Backup Check', Date.now());
  const before = db.prepare('SELECT COUNT(*) AS n FROM users').get().n;
  const { createBackup, listBackups } = require('../db-backup');
  const result = createBackup({ dataDir, keep: 2 });
  assert.equal(result.ok, true);
  assert.ok(result.bytes > 0);
  assert.equal(listBackups({ dataDir }).length, 1);
  const { DatabaseSync } = require('node:sqlite');
  const snapshot = new DatabaseSync(path.join(dataDir, 'backups', result.file), { readOnly: true });
  try {
    assert.equal(snapshot.prepare('PRAGMA quick_check').get().quick_check, 'ok');
    assert.equal(snapshot.prepare('SELECT COUNT(*) AS n FROM users').get().n, before);
    assert.ok(snapshot.prepare("SELECT 1 FROM users WHERE email='backup-check@example.test'").get());
  } finally { snapshot.close(); }
  assert.equal(db.prepare('SELECT COUNT(*) AS n FROM users').get().n, before);
  console.log('PASS SQLite snapshot backup and integrity verification');
} finally {
  if (db) db.close();
  fs.rmSync(dataDir, { recursive: true, force: true });
}
