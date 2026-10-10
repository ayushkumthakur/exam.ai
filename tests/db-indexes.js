const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

// Always use a disposable database; never inspect or modify the app's normal storage.
const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'competitive-exam-ai-index-test-'));
process.env.DATA_DIR = dataDir;
try {
  const db = require('../db');
  const indexes = new Set(db.prepare("SELECT name FROM sqlite_master WHERE type='index'").all().map(x => x.name));
  assert.ok(indexes.has('a_user_exam_question_id'), 'answer-history lookup index exists');
  assert.ok(indexes.has('m_user_exam_resolved'), 'Mistake Book/revision index exists');
  console.log('PASS database performance indexes in isolated SQLite database');
  db.close();
} finally {
  fs.rmSync(dataDir, { recursive: true, force: true });
}
