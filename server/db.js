'use strict';
const { DatabaseSync } = require('node:sqlite');
const path = require('node:path');
const fs = require('node:fs');
const { seed } = require('./seed');

const dir = path.join(__dirname, '..', 'data');
fs.mkdirSync(dir, { recursive: true });
const db = new DatabaseSync(process.env.DB_FILE || path.join(dir, 'app.db'));

db.exec(`
PRAGMA journal_mode = WAL;
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  name TEXT,
  role TEXT NOT NULL DEFAULT 'student' CHECK (role IN ('student','admin')),
  created_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS otps (
  id INTEGER PRIMARY KEY,
  email TEXT NOT NULL,
  code_hash TEXT NOT NULL,
  salt TEXT NOT NULL,
  expires_at INTEGER NOT NULL,
  attempts INTEGER NOT NULL DEFAULT 0,
  used INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_otps_email ON otps(email, created_at);
CREATE TABLE IF NOT EXISTS sessions (
  token_hash TEXT PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at INTEGER NOT NULL,
  created_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS exams (
  id INTEGER PRIMARY KEY,
  category TEXT NOT NULL,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  duration_min INTEGER, total_questions INTEGER, total_marks INTEGER,
  negative_marking REAL,
  pattern_verified INTEGER NOT NULL DEFAULT 0,
  pattern_note TEXT,
  active INTEGER NOT NULL DEFAULT 1
);
CREATE TABLE IF NOT EXISTS subjects (
  id INTEGER PRIMARY KEY,
  exam_id INTEGER NOT NULL REFERENCES exams(id) ON DELETE CASCADE,
  name TEXT NOT NULL, position INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_subjects_exam ON subjects(exam_id);
CREATE TABLE IF NOT EXISTS topics (
  id INTEGER PRIMARY KEY,
  subject_id INTEGER NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
  name TEXT NOT NULL, position INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_topics_subject ON topics(subject_id);
CREATE TABLE IF NOT EXISTS profiles (
  user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  exam_id INTEGER REFERENCES exams(id),
  level TEXT CHECK (level IN ('beginner','intermediate','advanced')),
  target_date TEXT,
  daily_hours INTEGER,
  stage TEXT CHECK (stage IN ('just_started','preparing','revision')),
  onboarded INTEGER NOT NULL DEFAULT 0,
  updated_at INTEGER NOT NULL
);
-- Learning data is keyed by exam_id so switching exams never deletes or mixes history.
CREATE TABLE IF NOT EXISTS topic_stats (
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  exam_id INTEGER NOT NULL REFERENCES exams(id),
  topic_id INTEGER NOT NULL REFERENCES topics(id) ON DELETE CASCADE,
  attempted INTEGER NOT NULL DEFAULT 0,
  correct INTEGER NOT NULL DEFAULT 0,
  last_practiced INTEGER,
  PRIMARY KEY (user_id, topic_id)
);
CREATE TABLE IF NOT EXISTS activity (
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  day TEXT NOT NULL,
  questions INTEGER NOT NULL DEFAULT 0,
  correct INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (user_id, day)
);
`);

seed(db);
module.exports = db;