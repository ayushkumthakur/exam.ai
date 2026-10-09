const { DatabaseSync } = require('node:sqlite');
const path = require('path');
const fs = require('fs');
const { EXAMS } = require('./data/catalog');
const SEED = require('./data/seed_questions');
const CA_SEED = require('./data/current_affairs');

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
CREATE TABLE IF NOT EXISTS mistakes (
  user_id INTEGER NOT NULL, question_id INTEGER NOT NULL, exam_id TEXT NOT NULL,
  last_choice INTEGER, wrong_count INTEGER NOT NULL DEFAULT 1, weakness REAL NOT NULL DEFAULT 1,
  resolved INTEGER NOT NULL DEFAULT 0, updated_at INTEGER NOT NULL,
  PRIMARY KEY (user_id, question_id)
);
CREATE TABLE IF NOT EXISTS topic_stats (
  user_id INTEGER NOT NULL, exam_id TEXT NOT NULL, subject TEXT NOT NULL, topic TEXT NOT NULL,
  attempted INTEGER NOT NULL DEFAULT 0, correct INTEGER NOT NULL DEFAULT 0, wrong_streak INTEGER NOT NULL DEFAULT 0,
  rev_stage INTEGER NOT NULL DEFAULT 0, next_rev_at INTEGER, last_rev_at INTEGER, last_at INTEGER,
  PRIMARY KEY (user_id, exam_id, subject, topic)
);
CREATE TABLE IF NOT EXISTS tests (
  id INTEGER PRIMARY KEY, user_id INTEGER NOT NULL, exam_id TEXT NOT NULL, kind TEXT NOT NULL, title TEXT NOT NULL,
  question_ids TEXT NOT NULL, minutes INTEGER NOT NULL, marking TEXT NOT NULL,
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
const qCount = db.prepare('SELECT COUNT(*) c FROM questions').get().c;
if (qCount === 0) {
  const ins = db.prepare(`INSERT INTO questions (exam_id,subject,topic,difficulty,text,options,answer,explanation,concept,tip,source_type,created_at)
    VALUES (NULL,?,?,?,?,?,?,?,?,?, 'ADMIN_PRACTICE', ?)`);
  for (const s of SEED) ins.run(s.subject, s.topic, s.difficulty, s.text, JSON.stringify(s.options), s.answer, s.explanation, s.concept, s.tip, now());
}

module.exports = db;