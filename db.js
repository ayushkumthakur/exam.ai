const { DatabaseSync } = require('node:sqlite');
const path = require('path');
const fs = require('fs');
const { EXAMS } = require('./data/catalog');
const SEED = require('./data/seed_questions');
const CA_SEED = require('./data/current_affairs');
const CSAT_SEED = require('./data/csat_questions');

const dir = process.env.DATA_DIR || path.join(__dirname, 'storage');
fs.mkdirSync(dir, { recursive: true });
const db = new DatabaseSync(path.join(dir, 'app.db'));
db.exec('PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;');

db.exec(`
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY, email TEXT UNIQUE NOT NULL, name TEXT, password_hash TEXT, role TEXT NOT NULL DEFAULT 'student',
  exam_id TEXT, level TEXT, target_date TEXT, daily_minutes INTEGER, stage TEXT,
  onboarded INTEGER NOT NULL DEFAULT 0, created_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS otps (
  email TEXT PRIMARY KEY, code_hash TEXT NOT NULL, expires_at INTEGER NOT NULL,
  attempts INTEGER NOT NULL DEFAULT 0, sent_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS sessions (
  token_hash TEXT PRIMARY KEY, user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE, expires_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS exams (
  id TEXT PRIMARY KEY, name TEXT NOT NULL, category TEXT NOT NULL, pattern TEXT NOT NULL,
  syllabus TEXT, verified INTEGER NOT NULL DEFAULT 0, active INTEGER NOT NULL DEFAULT 1
);
-- source_type: VERIFIED_PYQ | AI_GENERATED | PYQ_PATTERN | ADMIN_PRACTICE
CREATE TABLE IF NOT EXISTS questions (
  id INTEGER PRIMARY KEY, exam_id TEXT, subject TEXT NOT NULL, topic TEXT NOT NULL, difficulty TEXT NOT NULL,
  text TEXT NOT NULL, options TEXT NOT NULL, answer INTEGER NOT NULL, explanation TEXT NOT NULL,
  concept TEXT, tip TEXT, source_type TEXT NOT NULL,
  pyq_year INTEGER, pyq_paper TEXT, pyq_shift TEXT, source_ref TEXT,
  owner_user_id INTEGER, created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS q_idx ON questions(subject, topic, source_type);
CREATE INDEX IF NOT EXISTS q_exam ON questions(exam_id, source_type);
CREATE TABLE IF NOT EXISTS answers (
  id INTEGER PRIMARY KEY, user_id INTEGER NOT NULL, exam_id TEXT NOT NULL, question_id INTEGER NOT NULL,
  subject TEXT NOT NULL, topic TEXT NOT NULL, choice INTEGER, correct INTEGER NOT NULL,
  time_ms INTEGER, mode TEXT NOT NULL, created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS a_user ON answers(user_id, exam_id, created_at);
-- Practice feeds repeatedly check whether a student has answered a question and fetch the latest attempt.
CREATE INDEX IF NOT EXISTS a_user_exam_question_id ON answers(user_id, exam_id, question_id, id);
CREATE TABLE IF NOT EXISTS mistakes (
  user_id INTEGER NOT NULL, question_id INTEGER NOT NULL, exam_id TEXT NOT NULL,
  last_choice INTEGER, wrong_count INTEGER NOT NULL DEFAULT 1, weakness REAL NOT NULL DEFAULT 1,
  resolved INTEGER NOT NULL DEFAULT 0, updated_at INTEGER NOT NULL,
  PRIMARY KEY (user_id, question_id)
);
-- Accelerate the unresolved Mistake Book and revision-queue queries on existing databases.
CREATE INDEX IF NOT EXISTS m_user_exam_resolved ON mistakes(user_id, exam_id, resolved, weakness DESC, updated_at DESC);
CREATE TABLE IF NOT EXISTS topic_stats (
  user_id INTEGER NOT NULL, exam_id TEXT NOT NULL, subject TEXT NOT NULL, topic TEXT NOT NULL,
  attempted INTEGER NOT NULL DEFAULT 0, correct INTEGER NOT NULL DEFAULT 0, wrong_streak INTEGER NOT NULL DEFAULT 0,
  rev_stage INTEGER NOT NULL DEFAULT 0, next_rev_at INTEGER, last_rev_at INTEGER, last_at INTEGER,
  PRIMARY KEY (user_id, exam_id, subject, topic)
);
CREATE TABLE IF NOT EXISTS tests (
  id INTEGER PRIMARY KEY, user_id INTEGER NOT NULL, exam_id TEXT NOT NULL, kind TEXT NOT NULL, title TEXT NOT NULL,
  question_ids TEXT NOT NULL, minutes INTEGER NOT NULL, marking TEXT NOT NULL, blueprint TEXT NOT NULL DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'active', answers TEXT NOT NULL DEFAULT '{}', marked TEXT NOT NULL DEFAULT '[]',
  times TEXT NOT NULL DEFAULT '{}', current_idx INTEGER NOT NULL DEFAULT 0, remaining_sec INTEGER NOT NULL,
  result TEXT, started_at INTEGER NOT NULL, submitted_at INTEGER, updated_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS t_user ON tests(user_id, status);
CREATE TABLE IF NOT EXISTS bookmarks (
  id INTEGER PRIMARY KEY, user_id INTEGER NOT NULL, kind TEXT NOT NULL, ref_id TEXT, title TEXT, body TEXT, created_at INTEGER NOT NULL,
  UNIQUE(user_id, kind, ref_id)
);
CREATE TABLE IF NOT EXISTS current_affairs (
  id INTEGER PRIMARY KEY, title TEXT NOT NULL, summary TEXT NOT NULL, category TEXT NOT NULL,
  exams TEXT NOT NULL DEFAULT 'ALL', event_date TEXT, source TEXT, created_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS ai_conversations (
  id INTEGER PRIMARY KEY, user_id INTEGER NOT NULL, exam_id TEXT, role TEXT NOT NULL, content TEXT NOT NULL, created_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS ai_feedback (
  id INTEGER PRIMARY KEY, user_id INTEGER NOT NULL, conversation_id INTEGER, kind TEXT NOT NULL, note TEXT,
  status TEXT NOT NULL DEFAULT 'open', created_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS plan_done (
  user_id INTEGER NOT NULL, day TEXT NOT NULL, task_key TEXT NOT NULL, PRIMARY KEY(user_id, day, task_key)
);
`);

// Backward-compatible user schema migrations for existing Railway databases.
let userColumns = db.prepare('PRAGMA table_info(users)').all();
if (!userColumns.some(c => c.name === 'password_hash')) db.exec('ALTER TABLE users ADD COLUMN password_hash TEXT');
userColumns = db.prepare('PRAGMA table_info(users)').all();
if (!userColumns.some(c => c.name === 'selected_subjects')) db.exec("ALTER TABLE users ADD COLUMN selected_subjects TEXT NOT NULL DEFAULT '[]'");
let testColumns = db.prepare('PRAGMA table_info(tests)').all();
if (!testColumns.some(c => c.name === 'blueprint')) db.exec("ALTER TABLE tests ADD COLUMN blueprint TEXT NOT NULL DEFAULT '{}'");

// ---- Seed ----
const now = () => Date.now();

for (const x of CA_SEED) {
  const exists = db.prepare('SELECT id FROM current_affairs WHERE title=? AND event_date=?').get(x.title, x.event_date);
  if (!exists) {
    db.prepare('INSERT INTO current_affairs (title,summary,category,exams,event_date,source,created_at) VALUES (?,?,?,?,?,?,?)')
      .run(x.title, x.summary, x.category, x.exams || 'ALL', x.event_date || null, x.source || null, now());
  }
}
const examCount = db.prepare('SELECT COUNT(*) c FROM exams').get().c;
if (examCount === 0) {
  const ins = db.prepare('INSERT INTO exams (id,name,category,pattern,verified) VALUES (?,?,?,?,?)');
  for (const e of EXAMS) ins.run(e.id, e.name, e.category, JSON.stringify(e.pattern), 0);
}
// Add newly introduced catalog entries to existing databases without overwriting admin edits.
{
  const ins = db.prepare('INSERT OR IGNORE INTO exams (id,name,category,pattern,verified) VALUES (?,?,?,?,?)');
  for (const e of EXAMS) ins.run(e.id, e.name, e.category, JSON.stringify(e.pattern), 0);
}
// Keep UPSC Prelims Paper I and CSAT Paper II as separate choices within the UPSC category.
{
  const row = db.prepare("SELECT pattern FROM exams WHERE id='UPSC_CSE'").get();
  if (row) {
    const current = JSON.parse(row.pattern || '{}');
    const subjects = (current.sections || []).map(s => s.subject);
    const oldCombinedDefault = current.minutes === 240 &&
      subjects.join('|') === 'History|Geography|Polity|Economics|Environment|General Awareness|Quantitative Aptitude|Reasoning|English';
    const target = EXAMS.find(e => e.id === 'UPSC_CSE');
    if (oldCombinedDefault && target) db.prepare("UPDATE exams SET name=?, category=?, pattern=? WHERE id='UPSC_CSE'")
      .run(target.name, target.category, JSON.stringify(target.pattern));
  }
  // Restore the separate CSAT exam option. Keep its existing questions and test history.
  const csat = EXAMS.find(e => e.id === 'UPSC_CSAT');
  if (csat) db.prepare("UPDATE exams SET name=?, category=?, active=1 WHERE id='UPSC_CSAT'")
    .run(csat.name, csat.category);
}

// Priority-exam pattern audit migration. Update only untouched catalog defaults; preserve admin-customized patterns.
{
  const catalogById = new Map(EXAMS.map(exam => [exam.id, exam]));
  const sameCorePattern = (left, right) => left && right && left.minutes === right.minutes &&
    JSON.stringify((left.sections || []).map(s => [s.subject, s.questions, s.marks, s.negative, s.paper || null])) ===
    JSON.stringify((right.sections || []).map(s => [s.subject, s.questions, s.marks, s.negative, s.paper || null]));
  const select = db.prepare('SELECT pattern FROM exams WHERE id=?');
  const update = db.prepare('UPDATE exams SET pattern=? WHERE id=?');
  for (const id of ['UPSC_CSE', 'UPSC_CSAT', 'SSC_CGL', 'RBI_B']) {
    const seeded = catalogById.get(id);
    const row = select.get(id);
    if (!seeded || !row) continue;
    const current = JSON.parse(row.pattern || '{}');
    if (sameCorePattern(current, seeded.pattern)) {
      // Preserve any admin-authored note while recording the official audit metadata.
      update.run(JSON.stringify({ ...current, note: seeded.pattern.note, audit: seeded.pattern.audit }), id);
    } else if (current.audit && ['verified_baseline', 'verified_baseline_with_runtime_gap', 'partially_verified'].includes(current.audit.status)) {
      // A prior audited default has since been customized: keep all admin edits and flag the review state.
      update.run(JSON.stringify({ ...current, audit: { ...current.audit, status: 'custom_pattern_requires_review', lastCheckedAt: '2026-10-10', reviewReason: 'The saved section counts or timing differ from the audited catalog baseline. Review this custom pattern before presenting it as official.' } }), id);
    }
  }
}

const qCount = db.prepare('SELECT COUNT(*) c FROM questions').get().c;
if (qCount === 0) {
  const ins = db.prepare(`INSERT INTO questions (exam_id,subject,topic,difficulty,text,options,answer,explanation,concept,tip,source_type,created_at)
    VALUES (NULL,?,?,?,?,?,?,?,?,?, 'ADMIN_PRACTICE', ?)`);
  for (const s of SEED) ins.run(s.subject, s.topic, s.difficulty, s.text, JSON.stringify(s.options), s.answer, s.explanation, s.concept, s.tip, now());
}

/*
 * Idempotent UPSC practice-bank migration.
 * These authored practice questions are not official UPSC PYQs. Seed them into
 * existing persistent Railway databases too; the original seed ran only when
 * the entire questions table was empty.
 */
{
  const upscSubjects = new Set(['History', 'Geography', 'Polity', 'Economics', 'Environment', 'General Awareness']);
  const ins = db.prepare(`INSERT INTO questions
    (exam_id,subject,topic,difficulty,text,options,answer,explanation,concept,tip,source_type,created_at)
    SELECT ?,?,?,?,?,?,?,?,?,?,'ADMIN_PRACTICE',?
    WHERE NOT EXISTS (SELECT 1 FROM questions WHERE exam_id=? AND text=?)`);
  for (const s of SEED) {
    if (!upscSubjects.has(s.subject)) continue;
    // Only add the explicitly curated UPSC set; do not relabel unrelated legacy seed items.
    if (!String(s.concept || '').startsWith('UPSC-style:') && ![
      'Which Harappan site is especially known for its dockyard?',
      'Ashoka’s major rock edicts were primarily issued to communicate his:',
      'The construction of the Qutub Minar was begun by:',
      'The Permanent Settlement of Bengal was introduced in 1793 under:',
      'The Coriolis force is caused by the:',
      'Which river is commonly described as flowing through a rift valley between the Vindhya and Satpura ranges?',
      'The Strait of Malacca connects the Andaman Sea with the:',
      'Fundamental Rights are primarily contained in which Part of the Constitution of India?',
      'A Money Bill can be introduced in the Lok Sabha only on the recommendation of the:',
      'The power of judicial review enables courts to:',
      'Which Article guarantees equality before the law and equal protection of the laws?',
      'Inflation refers to a sustained increase in the:',
      'In India, the Monetary Policy Committee is responsible for decisions relating primarily to the:',
      'A rise in the repo rate, other things remaining equal, is generally intended to:',
      'In a food chain, organisms that make their own food using sunlight are called:',
      'Which gas is the largest contributor to human-caused long-term global warming among these options?',
      'A biodiversity hotspot is identified using high endemism and:',
      'Which institution publishes the World Economic Outlook report?',
      'The Indian Space Research Organisation (ISRO) functions under the:',
      'The Comptroller and Auditor General of India is appointed by the:'
    ].includes(s.text)) continue;
    ins.run('UPSC_CSE', s.subject, s.topic, s.difficulty, s.text, JSON.stringify(s.options),
      s.answer, s.explanation, s.concept, s.tip, now(), 'UPSC_CSE', s.text);
  }
}

/* Idempotently seed CSAT Paper II questions under the separate UPSC_CSAT exam option.
 * Questions are original ADMIN_PRACTICE content, never labelled as official PYQs.
 * Quantitative Aptitude items reuse the existing authored aptitude bank.
 */
{
  const csatSeed = SEED.filter(s => s.subject === 'Quantitative Aptitude').concat(CSAT_SEED);
  const ins = db.prepare(`INSERT INTO questions
    (exam_id,subject,topic,difficulty,text,options,answer,explanation,concept,tip,source_type,created_at)
    SELECT ?,?,?,?,?,?,?,?,?,?,'ADMIN_PRACTICE',?
    WHERE NOT EXISTS (SELECT 1 FROM questions WHERE exam_id=? AND text=?)`);
  for (const s of csatSeed) {
    ins.run('UPSC_CSAT', s.subject, s.topic, s.difficulty, s.text, JSON.stringify(s.options),
      s.answer, s.explanation, s.concept, s.tip, now(), 'UPSC_CSAT', s.text);
  }
}

/*
 * Idempotent SSC CHSL practice-bank migration.
 * These authored practice questions are not official SSC PYQs (source_type stays
 * ADMIN_PRACTICE). Covers all 4 CHSL subjects across their syllabus topics so that
 * a 20-question subject test can be built without relying on an AI fill call.
 */
{
  const CHSL1 = require('./content/ssc_chsl_batch1.json');
  const CHSL2 = require('./content/ssc_chsl_batch2.json');
  const ins = db.prepare(`INSERT INTO questions
    (exam_id,subject,topic,difficulty,text,options,answer,explanation,concept,tip,source_type,created_at)
    SELECT ?,?,?,?,?,?,?,?,?,?,'ADMIN_PRACTICE',?
    WHERE NOT EXISTS (SELECT 1 FROM questions WHERE exam_id=? AND text=?)`);
  for (const batch of [CHSL1, CHSL2]) {
    for (const q of batch.questions) {
      ins.run('SSC_CHSL', q.subject, q.topic, q.difficulty, q.text, JSON.stringify(q.options),
        q.answer, q.explanation, q.concept, q.tip, now(), 'SSC_CHSL', q.text);
    }
  }
}


/*
 * Idempotent exam-wise question-bank expansion.
 * This copies compatible authored practice questions into every catalog exam and
 * subject, with topics constrained to that exam's syllabus. It never labels
 * generated/adapted questions as VERIFIED_PYQ.
 */
{
  const EXPANDED_SEED = require('./data/expanded_question_bank');
  const { buildExamQuestionBank } = require('./data/question_bank');
  const bankRows = buildExamQuestionBank(EXAMS, require('./data/catalog').TOPICS, SEED, EXPANDED_SEED);
  const insert = db.prepare(`INSERT INTO questions
    (exam_id,subject,topic,difficulty,text,options,answer,explanation,concept,tip,source_type,
     pyq_year,pyq_paper,pyq_shift,source_ref,owner_user_id,created_at)
    SELECT ?,?,?,?,?,?,?,?,?,?,'ADMIN_PRACTICE',NULL,NULL,NULL,NULL,NULL,?
    WHERE NOT EXISTS (
      SELECT 1 FROM questions
      WHERE exam_id=? AND subject=? AND topic=? AND text=? AND source_type='ADMIN_PRACTICE'
    )`);
  for (const item of bankRows) {
    insert.run(item.exam_id, item.subject, item.topic, item.difficulty, item.text, JSON.stringify(item.options),
      item.answer, item.explanation, item.concept, item.tip, now(),
      item.exam_id, item.subject, item.topic, item.text);
  }
}


/*
 * Priority exam banks: deterministic, authored practice questions for UPSC CSE,
 * CSAT, SSC CGL Tier-I and RBI Grade B Phase-I. Idempotent on persistent Railway
 * volumes and deliberately separate from source-verified PYQ records.
 */
{
  const { buildPriorityQuestionBank } = require('./data/priority_question_bank');
  const priorityRows = buildPriorityQuestionBank(EXAMS, require('./data/catalog').TOPICS);
  const insertPriority = db.prepare(`INSERT INTO questions
    (exam_id,subject,topic,difficulty,text,options,answer,explanation,concept,tip,source_type,
     pyq_year,pyq_paper,pyq_shift,source_ref,owner_user_id,created_at)
    SELECT ?,?,?,?,?,?,?,?,?,?,'ADMIN_PRACTICE',NULL,NULL,NULL,NULL,NULL,?
    WHERE NOT EXISTS (
      SELECT 1 FROM questions
      WHERE exam_id=? AND subject=? AND text=? AND source_type='ADMIN_PRACTICE'
    )`);
  for (const item of priorityRows) {
    insertPriority.run(item.exam_id, item.subject, item.topic, item.difficulty, item.text, JSON.stringify(item.options),
      item.answer, item.explanation, item.concept || item.topic, item.tip || 'Check each statement and eliminate unsupported options.',
      now(), item.exam_id, item.subject, item.text);
  }
}


/*
 * Broad catalog expansion: populate remaining exams with syllabus-topic mapped
 * ADMIN_PRACTICE material. This is idempotent and intentionally skips the four
 * priority banks which are seeded by the dedicated priority bank builder.
 */
{
  const { buildCatalogQuestionBank } = require('./data/catalog_question_bank');
  const { buildExamQuestionBank } = require('./data/question_bank');
  const { buildPriorityQuestionBank } = require('./data/priority_question_bank');
  const catalogRows = buildCatalogQuestionBank(
    EXAMS,
    require('./data/catalog').TOPICS,
    SEED,
    require('./data/expanded_question_bank'),
    buildPriorityQuestionBank(EXAMS, require('./data/catalog').TOPICS)
  );
  const insertCatalog = db.prepare(`INSERT INTO questions
    (exam_id,subject,topic,difficulty,text,options,answer,explanation,concept,tip,source_type,
     pyq_year,pyq_paper,pyq_shift,source_ref,owner_user_id,created_at)
    SELECT ?,?,?,?,?,?,?,?,?,?,'ADMIN_PRACTICE',NULL,NULL,NULL,NULL,NULL,?
    WHERE NOT EXISTS (
      SELECT 1 FROM questions
      WHERE exam_id=? AND subject=? AND text=? AND source_type='ADMIN_PRACTICE'
    )`);
  for (const item of catalogRows) {
    insertCatalog.run(item.exam_id, item.subject, item.topic, item.difficulty, item.text, JSON.stringify(item.options),
      item.answer, item.explanation, item.concept || item.topic, item.tip || 'Review each statement and the explanation.',
      now(), item.exam_id, item.subject, item.text);
  }
}

module.exports = db;