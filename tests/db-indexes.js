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
  const cse = db.prepare("SELECT id, name, pattern FROM exams WHERE id='UPSC_CSE'").get();
  assert.ok(cse, 'UPSC CSE contains both Prelims papers in one exam');
  const pattern = JSON.parse(cse.pattern);
  const paperOne = pattern.sections.filter(section => section.paper === 'Paper I');
  const paperTwo = pattern.sections.filter(section => section.paper === 'Paper II');
  assert.equal(paperOne.reduce((n, section) => n + section.questions, 0), 100, 'UPSC CSE Paper I totals 100 questions');
  assert.equal(paperTwo.reduce((n, section) => n + section.questions, 0), 80, 'UPSC CSE Paper II totals 80 questions');
  assert.equal(pattern.minutes, 240, 'combined UPSC CSE pattern accounts for two separate 120-minute papers');
  const oldCsat = db.prepare("SELECT active FROM exams WHERE id='UPSC_CSAT'").get();
  assert.ok(!oldCsat || oldCsat.active === 0, 'separate CSAT exam is hidden from the exam picker');
  const bank = db.prepare("SELECT subject, COUNT(*) AS count FROM questions WHERE exam_id='UPSC_CSE' AND subject IN ('Quantitative Aptitude','Reasoning','English') GROUP BY subject").all();
  const bySubject = Object.fromEntries(bank.map(row => [row.subject, row.count]));
  assert.equal(bySubject['Quantitative Aptitude'], 28, 'CSAT quantitative aptitude bank is seeded under UPSC CSE');
  assert.equal(bySubject.Reasoning, 26, 'CSAT reasoning bank is seeded under UPSC CSE');
  assert.equal(bySubject.English, 26, 'CSAT comprehension bank is seeded under UPSC CSE');
  assert.equal(bank.reduce((n, row) => n + row.count, 0), 80, 'CSAT practice bank has 80 questions under UPSC CSE');
  console.log('PASS database indexes and both UPSC CSE Prelims paper banks in isolated SQLite database');
  db.close();
} finally {
  fs.rmSync(dataDir, { recursive: true, force: true });
}
