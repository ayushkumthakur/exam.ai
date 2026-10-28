// Restore drill against a disposable database only; never touches production DATA_DIR.
'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { DatabaseSync } = require('node:sqlite');

const root = fs.mkdtempSync(path.join(os.tmpdir(), 'competitive-exam-ai-restore-drill-'));
const dataDir = path.join(root, 'source');
const restoreDir = path.join(root, 'restored');
fs.mkdirSync(dataDir, { recursive: true });
fs.mkdirSync(restoreDir, { recursive: true });
let db;
let restored;
(async () => {
try {
  process.env.DATA_DIR = dataDir;
  db = require('../db');
  db.prepare('INSERT INTO users (email, name, created_at) VALUES (?, ?, ?)').run(
    'restore-drill@example.test', 'Restore Drill', Date.now()
  );
  db.prepare('INSERT INTO answers (user_id, exam_id, question_id, subject, topic, choice, correct, mode, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)')
    .run(1, 'UPSC_CSE', 999999, 'Polity', 'Constitution', 1, 0, 'practice', Date.now());
  const before = {
    users: db.prepare('SELECT COUNT(*) AS n FROM users').get().n,
    answers: db.prepare('SELECT COUNT(*) AS n FROM answers').get().n
  };
  const { createBackup } = require('../db-backup');
  const backup = await createBackup({ dataDir, keep: 2 });
  assert.equal(backup.ok, true);
  const snapshotPath = path.join(dataDir, 'backups', backup.file);
  const restoredPath = path.join(restoreDir, 'app.db');
  fs.copyFileSync(snapshotPath, restoredPath);
  fs.chmodSync(restoredPath, 0o600);
  restored = new DatabaseSync(restoredPath, { readOnly: true });
  assert.equal(restored.prepare('PRAGMA quick_check').get().quick_check, 'ok');
  assert.ok(restored.prepare("SELECT 1 FROM sqlite_master WHERE type='table' AND name='users'").get());
  assert.ok(restored.prepare("SELECT 1 FROM sqlite_master WHERE type='table' AND name='answers'").get());
  assert.equal(restored.prepare('SELECT COUNT(*) AS n FROM users').get().n, before.users);
  assert.equal(restored.prepare('SELECT COUNT(*) AS n FROM answers').get().n, before.answers);
  assert.equal(restored.prepare("SELECT email FROM users WHERE email='restore-drill@example.test'").get()?.email,
    'restore-drill@example.test');
  assert.equal(db.prepare('SELECT COUNT(*) AS n FROM users').get().n, before.users);
  assert.equal(db.prepare('SELECT COUNT(*) AS n FROM answers').get().n, before.answers);
  console.log('PASS isolated SQLite backup restore drill: integrity, schema, student and answer rows preserved');
} finally {
  if (restored) restored.close();
  if (db) db.close();
  fs.rmSync(root, { recursive: true, force: true });
}
})().catch(error => { console.error(error); process.exitCode = 1; });
