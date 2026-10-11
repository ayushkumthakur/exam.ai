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
  const cse = db.prepare("SELECT id, name, category, active, pattern FROM exams WHERE id='UPSC_CSE'").get();
  const csat = db.prepare("SELECT id, name, category, active, pattern FROM exams WHERE id='UPSC_CSAT'").get();
  assert.ok(cse && csat, 'UPSC CSE Prelims and UPSC CSAT are separate exam choices');
  assert.equal(cse.category, 'UPSC');
  assert.equal(csat.category, 'UPSC', 'both choices appear within the UPSC category');
  assert.equal(cse.active, 1);
  assert.equal(csat.active, 1, 'CSAT is visible in the exam picker');
  const gsPattern = JSON.parse(cse.pattern);
  const csatPattern = JSON.parse(csat.pattern);
  assert.equal(gsPattern.sections.reduce((n, section) => n + section.questions, 0), 100, 'Prelims Paper I totals 100 questions');
  assert.equal(gsPattern.minutes, 120, 'Prelims Paper I duration is 120 minutes');
  assert.equal(csatPattern.sections.reduce((n, section) => n + section.questions, 0), 80, 'CSAT Paper II totals 80 questions');
  assert.equal(csatPattern.minutes, 120, 'CSAT Paper II duration is 120 minutes');
  const bank = db.prepare("SELECT subject, COUNT(*) AS count FROM questions WHERE exam_id='UPSC_CSAT' GROUP BY subject").all();
  const bySubject = Object.fromEntries(bank.map(row => [row.subject, row.count]));
  assert.ok(bySubject['Quantitative Aptitude'] >= 28, 'CSAT quantitative aptitude bank retains the original seed and adds compatible practice');
  assert.ok(bySubject.Reasoning >= 26, 'CSAT reasoning bank retains its original seed');
  assert.ok(bySubject.English >= 26, 'CSAT comprehension bank retains its original seed');
  assert.ok(bank.reduce((n, row) => n + row.count, 0) >= 80, 'CSAT practice bank retains its full original 80-question seed and may expand');

  for (const examId of ['UPSC_CSE','UPSC_CSAT','SSC_CGL','RBI_B']) {
    const count = db.prepare("SELECT COUNT(*) AS count FROM questions WHERE exam_id=? AND source_type='ADMIN_PRACTICE'").get(examId).count;
    assert.ok(count >= 500, examId + ' priority practice bank should contain at least 500 questions');
  }
  const invalidPriority = db.prepare(`SELECT COUNT(*) AS count FROM questions
    WHERE exam_id IN ('UPSC_CSE','UPSC_CSAT','SSC_CGL','RBI_B')
    AND source_type='ADMIN_PRACTICE'
    AND (answer < 0 OR answer > 3 OR json_array_length(options) != 4)`).get().count;
  assert.equal(invalidPriority, 0, 'priority bank questions must have four options and valid answer indices');


  const catalogIds = require('../data/catalog').EXAMS.map(exam => exam.id)
    .filter(id => !['UPSC_CSE','UPSC_CSAT','SSC_CGL','RBI_B'].includes(id));
  for (const examId of catalogIds) {
    const count = db.prepare("SELECT COUNT(*) AS count FROM questions WHERE exam_id=? AND source_type='ADMIN_PRACTICE'").get(examId).count;
    assert.ok(count >= 500, examId + ' should be populated with at least 500 practice questions at startup');
  }

  console.log('PASS database indexes and separate UPSC CSE Prelims / CSAT exam options');
  db.close();
} finally {
  fs.rmSync(dataDir, { recursive: true, force: true });
}
