// Competitive Exam AI — zero-dependency server (Node 22+: node:http, node:sqlite, fetch)
const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const db = require('./db');
const { TOPICS, syllabusFor, NOTES } = require('./data/catalog');
const ai = require('./ai');

const PORT = +process.env.PORT || 3000;
const PROD = process.env.NODE_ENV === 'production';
const TZ_MIN = +(process.env.TZ_OFFSET_MIN ?? 330); // IST
const ADMIN_EMAILS = (process.env.ADMIN_EMAILS || '').split(',').map(s => s.trim().toLowerCase()).filter(Boolean);
const DAY = 86400000;
const REV_DAYS = [0, 1, 3, 7, 14];

// ---------- secrets ----------
const secretFile = path.join(process.env.DATA_DIR || path.join(__dirname, 'storage'), 'secret');
let SECRET = process.env.APP_SECRET;
if (!SECRET) {
  try { SECRET = fs.readFileSync(secretFile, 'utf8'); }
  catch { SECRET = crypto.randomBytes(32).toString('hex'); fs.writeFileSync(secretFile, SECRET, { mode: 0o600 }); }
}
const sha = s => crypto.createHash('sha256').update(s).digest('hex');
const now = () => Date.now();
const dayStr = (t = now()) => new Date(t + TZ_MIN * 60000).toISOString().slice(0, 10);
const J = s => { try { return JSON.parse(s); } catch { return null; } };

class HttpError extends Error { constructor(status, msg, extra) { super(msg); this.status = status; this.extra = extra; } }
const bad = (msg, extra) => new HttpError(400, msg, extra);

// ---------- exams ----------
function loadExam(id) {
  const r = db.prepare('SELECT * FROM exams WHERE id=? AND active=1').get(id);
  if (!r) return null;
  const pattern = J(r.pattern);
  const exam = { id: r.id, name: r.name, category: r.category, pattern, verified: !!r.verified };
  exam.syllabus = (r.syllabus && J(r.syllabus)) || syllabusFor(exam);
  exam.subjects = pattern.sections.map(s => s.subject);
  return exam;
}
const listExams = () => db.prepare('SELECT id FROM exams WHERE active=1 ORDER BY category,name').all().map(r => loadExam(r.id));

// questions visible to a user: only their exam's subjects/topics, never other users' private AI questions
function visible(user, exam, alias = 'q') {
  const parts = [], params = [];
  const chosen = J(user.selected_subjects);
  const allowedSyllabus = Array.isArray(chosen) && chosen.length ? exam.syllabus.filter(s => chosen.includes(s.subject)) : exam.syllabus;
  for (const s of allowedSyllabus) {
    parts.push(`(${alias}.subject=? AND ${alias}.topic IN (${s.topics.map(() => '?').join(',')}))`);
    params.push(s.subject, ...s.topics);
  }
  const sql = `(${parts.join(' OR ')}) AND (${alias}.exam_id IS NULL OR ${alias}.exam_id=?) AND (${alias}.owner_user_id IS NULL OR ${alias}.owner_user_id=?)`;
  params.push(exam.id, user.id);
  return { sql, params };
}
const pubQ = r => ({ id: r.id, subject: r.subject, topic: r.topic, difficulty: r.difficulty, text: r.text, options: J(r.options),
  source_type: r.source_type, pyq: r.source_type === 'VERIFIED_PYQ' ? { year: r.pyq_year, paper: r.pyq_paper, shift: r.pyq_shift } : null });
const fullQ = r => ({ ...pubQ(r), answer: r.answer, explanation: r.explanation, concept: r.concept, tip: r.tip, source_ref: r.source_ref });

// ---------- auth ----------
const mem = { sendLog: new Map(), inflight: new Set() };
function rateLimit(key, max, windowMs) {
  const t = now(); const arr = (mem.sendLog.get(key) || []).filter(x => t - x < windowMs);
  if (arr.length >= max) throw new HttpError(429, 'Too many attempts. Please try again later.');
  arr.push(t); mem.sendLog.set(key, arr);
}
const EMAIL_RE = /^[^\s@]{1,64}@[^\s@]{1,255}\.[^\s@]{2,}$/;
function validatePassword(password, confirm) {
  if (typeof password !== 'string' || password.length < 8) throw bad('Password must be at least 8 characters.');
  if (password.length > 128) throw bad('Password must be 128 characters or fewer.');
  if (password !== confirm) throw bad('Passwords do not match.');
}
function hashPassword(password) {
  const salt = crypto.randomBytes(16);
  const derived = crypto.scryptSync(password, salt, 64, { N: 16384, r: 8, p: 1 });
  return 'scrypt:' + salt.toString('base64url') + ':' + derived.toString('base64url');
}
function verifyPassword(stored, password) {
  try {
    const [scheme, saltText, hashText] = String(stored || '').split(':');
    if (scheme !== 'scrypt' || !saltText || !hashText) return false;
    const salt = Buffer.from(saltText, 'base64url');
    const expected = Buffer.from(hashText, 'base64url');
    const actual = crypto.scryptSync(password, salt, expected.length, { N: 16384, r: 8, p: 1 });
    return expected.length === actual.length && crypto.timingSafeEqual(expected, actual);
  } catch { return false; }
}
function newSession(res, userId) {
  const token = crypto.randomBytes(32).toString('base64url');
  db.prepare('INSERT INTO sessions (token_hash,user_id,expires_at) VALUES (?,?,?)').run(sha(token), userId, now() + 30 * DAY);
  res.setHeader('Set-Cookie', `sid=${token}; HttpOnly; Path=/; SameSite=Lax; Max-Age=${30 * 86400}${PROD ? '; Secure' : ''}`);
}
function getUser(req) {
  const m = /(?:^|;\s*)sid=([^;]+)/.exec(req.headers.cookie || '');
  if (!m) return null;
  const session = db.prepare('SELECT user_id,expires_at FROM sessions WHERE token_hash=?').get(sha(m[1]));
  if (!session || session.expires_at < now()) return null;
  return db.prepare('SELECT * FROM users WHERE id=?').get(session.user_id);
}
const meJson = u => ({ id: u.id, email: u.email, name: u.name, role: u.role, exam_id: u.exam_id, level: u.level, target_date: u.target_date,
  daily_minutes: u.daily_minutes, stage: u.stage, onboarded: !!u.onboarded, selected_subjects: J(u.selected_subjects) || [] });

// ---------- learning data loop ----------
function recordAnswer(user, exam, q, choice, timeMs, mode) {
  const correct = choice === q.answer ? 1 : 0, t = now();
  db.prepare('INSERT INTO answers (user_id,exam_id,question_id,subject,topic,choice,correct,time_ms,mode,created_at) VALUES (?,?,?,?,?,?,?,?,?,?)')
    .run(user.id, exam.id, q.id, q.subject, q.topic, choice, correct, timeMs || null, mode, t);
  db.prepare(`INSERT INTO topic_stats (user_id,exam_id,subject,topic,attempted,correct,wrong_streak,last_at) VALUES (?,?,?,?,1,?,?,?)
    ON CONFLICT(user_id,exam_id,subject,topic) DO UPDATE SET attempted=attempted+1, correct=correct+?, wrong_streak=CASE WHEN ?=1 THEN 0 ELSE wrong_streak+1 END, last_at=?`)
    .run(user.id, exam.id, q.subject, q.topic, correct, correct ? 0 : 1, t, correct, correct, t);
  const m = db.prepare('SELECT * FROM mistakes WHERE user_id=? AND question_id=?').get(user.id, q.id);
  if (!correct) {
    if (m) db.prepare('UPDATE mistakes SET wrong_count=wrong_count+1, weakness=MIN(5,weakness+1), last_choice=?, resolved=0, updated_at=? WHERE user_id=? AND question_id=?').run(choice, t, user.id, q.id);
    else if (choice !== null) db.prepare('INSERT INTO mistakes (user_id,question_id,exam_id,last_choice,updated_at) VALUES (?,?,?,?,?)').run(user.id, q.id, exam.id, choice, t);
  } else if (m) {
    const w = Math.max(0, m.weakness - 1);
    db.prepare('UPDATE mistakes SET weakness=?, resolved=?, updated_at=? WHERE user_id=? AND question_id=?').run(w, w <= 0 ? 1 : 0, t, user.id, q.id);
  }
  return correct;
}
const acc = (c, a) => a ? Math.round(100 * c / a) : null;

function weakTopics(user, exam, limit = 5) {
  return db.prepare('SELECT * FROM topic_stats WHERE user_id=? AND exam_id=? AND attempted>=3').all(user.id, exam.id)
    .map(r => ({ subject: r.subject, topic: r.topic, attempted: r.attempted, accuracy: acc(r.correct, r.attempted), wrong_streak: r.wrong_streak }))
    .filter(r => r.accuracy < 70).sort((a, b) => a.accuracy - b.accuracy).slice(0, limit);
}
function revisionQueue(user, exam) {
  const rows = db.prepare('SELECT * FROM topic_stats WHERE user_id=? AND exam_id=?').all(user.id, exam.id);
  const openM = db.prepare(`SELECT q.subject,q.topic,COUNT(*) c FROM mistakes m JOIN questions q ON q.id=m.question_id WHERE m.user_id=? AND m.exam_id=? AND m.resolved=0 GROUP BY q.subject,q.topic`).all(user.id, exam.id);
  const mk = new Map(openM.map(r => [r.subject + '|' + r.topic, r.c]));
  const out = [];
  for (const r of rows) {
    const a = acc(r.correct, r.attempted), open = mk.get(r.subject + '|' + r.topic) || 0;
    let priority = null, reason = '';
    if (r.wrong_streak >= 2 || open >= 3) { priority = 'high'; reason = r.wrong_streak >= 2 ? `${r.wrong_streak} wrong answers in a row` : `${open} unresolved mistakes`; }
    else if (r.attempted >= 3 && a < 70) { priority = 'medium'; reason = `Accuracy ${a}%`; }
    else if (r.rev_stage > 0 && r.next_rev_at && r.next_rev_at <= now()) { priority = 'low'; reason = 'Due for spaced revision'; }
    if (priority) out.push({ subject: r.subject, topic: r.topic, priority, reason, accuracy: a, attempted: r.attempted, open_mistakes: open, rev_stage: r.rev_stage });
  }
  const rank = { high: 0, medium: 1, low: 2 };
  return out.sort((x, y) => rank[x.priority] - rank[y.priority] || (x.accuracy ?? 100) - (y.accuracy ?? 100));
}
function streak(userId) {
  const days = new Set(db.prepare('SELECT created_at t FROM answers WHERE user_id=? ORDER BY created_at DESC LIMIT 5000').all(userId).map(r => dayStr(r.t)));
  let n = 0, d = now();
  if (!days.has(dayStr(d))) d -= DAY; // streak stays alive until today ends
  while (days.has(dayStr(d))) { n++; d -= DAY; }
  return n;
}
function daysLeft(u) {
  if (!u.target_date) return null;
  const diff = Math.ceil((Date.parse(u.target_date + 'T00:00:00Z') - Date.parse(dayStr() + 'T00:00:00Z')) / DAY);
  return diff;
}

// exactly one primary recommendation (spec §6, §37)
function recommend(user, exam) {
  const active = db.prepare("SELECT id,title FROM tests WHERE user_id=? AND exam_id=? AND status='active' ORDER BY id DESC LIMIT 1").get(user.id, exam.id);
  if (active) return { title: 'You have a test in progress', detail: active.title, cta: 'Resume Test →', action: { type: 'test', id: active.id } };
  const q = revisionQueue(user, exam);
  if (q.length) {
    const t = q[0];
    const st = db.prepare('SELECT * FROM topic_stats WHERE user_id=? AND exam_id=? AND subject=? AND topic=?').get(user.id, exam.id, t.subject, t.topic);
    if (st.last_rev_at && st.last_rev_at > (st.last_at || 0)) {
      return { title: 'Revision complete 🎯', detail: `Check what stuck: take a short ${t.topic} test.`, cta: 'Take Topic Test →', action: { type: 'topic_test', subject: t.subject, topic: t.topic } };
    }
    const detail = t.accuracy !== null && t.priority !== 'low' ? `Your ${t.topic} accuracy is ${t.accuracy}%.` : `${t.topic} is ${t.reason.toLowerCase()}.`;
    return { title: detail, detail: `Recommended: Revise ${t.topic} for 20 minutes.`, cta: 'Start Revision →', action: { type: 'revision', subject: t.subject, topic: t.topic } };
  }
  const total = db.prepare('SELECT COUNT(*) c FROM answers WHERE user_id=? AND exam_id=?').get(user.id, exam.id).c;
  if (!total) return { title: 'Let’s find your starting point', detail: `Solve 10 ${exam.subjects[0]} questions so the app can learn your strengths.`, cta: 'Practice Now →', action: { type: 'practice', subject: exam.subjects[0] } };
  return { title: 'You are on track', detail: 'Keep momentum with a mixed practice set.', cta: 'Practice Now →', action: { type: 'practice' } };
}

// ---------- test engine ----------
function marking(exam) {
  const per = {}; for (const s of exam.pattern.sections) per[s.subject] = { marks: s.marks, negative: s.negative };
  return per;
}
const shuffle = a => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = crypto.randomInt(i + 1); [a[i], a[j]] = [a[j], a[i]]; } return a; };

function pickQuestions(user, exam, { subject, topic, difficulty, source, ids, limit, excludeSources }) {
  const v = visible(user, exam);
  let sql = `SELECT q.* FROM questions q WHERE ${v.sql}`; const p = [...v.params];
  if (subject) { sql += ' AND q.subject=?'; p.push(subject); }
  if (topic) { sql += ' AND q.topic=?'; p.push(topic); }
  if (difficulty && difficulty !== 'any') { sql += ' AND q.difficulty=?'; p.push(difficulty); }
  if (source) { sql += ' AND q.source_type=?'; p.push(source); }
  if (excludeSources) { sql += ` AND q.source_type NOT IN (${excludeSources.map(() => '?').join(',')})`; p.push(...excludeSources); }
  if (ids) { sql += ` AND q.id IN (${ids.map(() => '?').join(',')})`; p.push(...ids); }
  return shuffle(db.prepare(sql).all(...p)).slice(0, limit || 1000);
}

async function buildTest(user, exam, b) {
  const kind = b.kind, per = marking(exam); let qs = [], title = '', minutes, notices = [];
  const count = Math.min(Math.max(+b.count || 20, 20), 100);
  const diff = ['easy', 'medium', 'hard'].includes(b.difficulty) ? b.difficulty : 'any';
  const needSubject = () => { if (!exam.subjects.includes(b.subject)) throw bad('Please choose a subject from your exam.'); };
  const needTopic = () => { needSubject(); const s = exam.syllabus.find(x => x.subject === b.subject); if (!s.topics.includes(b.topic)) throw bad('Please choose a topic from your exam syllabus.'); };
  const practiceOnly = ['ADMIN_PRACTICE', 'AI_GENERATED', 'PYQ_PATTERN'];

  if (kind === 'full_mock' || kind === 'sectional') {
    const secs = kind === 'sectional' ? (needSubject(), exam.pattern.sections.filter(s => s.subject === b.subject)) : exam.pattern.sections;
    const patternTotal = secs.reduce((a, s) => a + s.questions, 0);
    const requestedTotal = kind === 'sectional' ? Math.max(20, patternTotal) : patternTotal;
    const targets = secs.map((s, i) => Math.max(1, Math.floor(requestedTotal * s.questions / patternTotal) + (i < (requestedTotal % secs.length) ? 1 : 0)));
    for (let i = 0; i < secs.length; i++) {
      const s = secs[i], target = targets[i];
      let got = pickQuestions(user, exam, { subject: s.subject, difficulty: diff, excludeSources: ['VERIFIED_PYQ'], limit: target });
      if (got.length < target) {
        const extra = await aiFillQuestions(user, exam, s.subject, null, diff, target - got.length);
        got = got.concat(extra);
      }
      qs.push(...got.slice(0, target));
      if (got.length < target) notices.push(String(s.subject) + ': only ' + got.length + ' question(s) available after AI fill.');
    }
    if (!qs.length) throw bad('No questions are available yet for this selection.');
    title = kind === 'full_mock' ? exam.name + ' Full Mock' : exam.name + ' ' + b.subject + ' Sectional';
    minutes = b.minutes ? +b.minutes : Math.max(5, Math.round((exam.pattern.minutes || 60) * qs.length / Math.max(patternTotal, 1)));
  } else if (kind === 'subject') {
    needSubject(); qs = pickQuestions(user, exam, { subject: b.subject, difficulty: diff, limit: count });
    if (qs.length < count) qs = qs.concat(await aiFillQuestions(user, exam, b.subject, null, diff, count - qs.length)).slice(0, count);
    title = b.subject + ' Test';
  } else if (kind === 'topic') {
    needTopic(); qs = pickQuestions(user, exam, { subject: b.subject, topic: b.topic, difficulty: diff, limit: count });
    if (qs.length < count) qs = qs.concat(await aiFillQuestions(user, exam, b.subject, b.topic, diff, count - qs.length)).slice(0, count);
    title = b.topic + ' Topic Test';
  } else if (kind === 'weak_topic') {
    const w = weakTopics(user, exam, 3);
    if (!w.length) throw bad('No weak topics detected yet. Practise a few topics first (at least 3 answers per topic).');
    for (const t of w) qs.push(...pickQuestions(user, exam, { subject: t.subject, topic: t.topic, limit: Math.ceil(count / w.length) }));
    qs = qs.slice(0, count); title = 'Weak Topic Test';
  } else if (kind === 'pyq') {
    const year = b.year ? +b.year : null;
    let sql = "SELECT * FROM questions WHERE source_type='VERIFIED_PYQ' AND exam_id=?"; const p = [exam.id];
    if (year) { sql += ' AND pyq_year=?'; p.push(year); } if (b.paper) { sql += ' AND pyq_paper=?'; p.push(b.paper); } if (b.shift) { sql += ' AND pyq_shift=?'; p.push(b.shift); }
    qs = db.prepare(sql + ' ORDER BY id').all(...p);
    if (!qs.length) throw bad('No verified previous-year questions have been added for your exam yet.');
    if (qs.length < 20) throw bad('This verified PYQ selection has fewer than 20 questions. Add the complete paper before starting a PYQ test.');
    title = `${exam.name} PYQ ${b.year || ''} ${b.paper || ''}`.trim();
  } else if (kind === 'pyq_pattern') {
    qs = pickQuestions(user, exam, { source: 'PYQ_PATTERN', limit: count });
    if (!qs.length) throw bad('No PYQ-pattern questions are available yet for your exam.');
    title = 'PYQ Pattern Mock';
  } else if (kind === 'ai_mock') {
    if (!ai.aiEnabled()) throw bad(ai.friendlyError('AI_NOT_CONFIGURED'));
    const secs = exam.pattern.sections.slice(0, 4), n = Math.max(20, Math.min(count, 100)), each = Math.max(2, Math.ceil(n / secs.length));
    for (const s of secs) {
      const tp = exam.syllabus.find(x => x.subject === s.subject).topics; const topic = tp[crypto.randomInt(tp.length)];
      const r = await ai.generateQuestions({ examName: exam.name, subject: s.subject, topic, difficulty: diff === 'any' ? 'medium' : diff, count: each, level: user.level });
      if (r.ok) qs.push(...storeAiQuestions(user, exam, r.questions));
    }
    qs = qs.slice(0, n); if (!qs.length) throw bad('The AI could not produce valid questions this time. Please try again.');
    title = 'AI Generated Mock';
  } else if (kind === 'custom') { // e.g. quiz made from AI-generated question ids
    const ids = (b.question_ids || []).map(Number).filter(Number.isInteger).slice(0, 100);
    if (!ids.length) throw bad('No questions selected.');
    qs = pickQuestions(user, exam, { ids }); title = b.title ? String(b.title).slice(0, 80) : 'Quick Quiz';
  } else throw bad('Unknown test type.');

  if (!qs.length) throw bad('No questions are available yet for this selection. Try another subject/topic, or generate questions with the AI Tutor.');
  if (kind !== 'full_mock' && qs.length < 20) throw bad('Every test needs at least 20 questions. Add more questions or choose a larger set.');
  minutes = Math.max(1, Math.min(300, +b.minutes || minutes || Math.ceil(qs.length * (exam.pattern.minutes / exam.pattern.sections.reduce((a, s) => a + s.questions, 0)))));
  const t = now();
  const id = db.prepare('INSERT INTO tests (user_id,exam_id,kind,title,question_ids,minutes,marking,remaining_sec,started_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?)')
    .run(user.id, exam.id, kind, title, JSON.stringify(qs.map(q => q.id)), minutes, JSON.stringify(per), minutes * 60, t, t).lastInsertRowid;
  return { id: Number(id), notices };
}
async function aiFillQuestions(user, exam, subject, topic, difficulty, count) {
  if (count <= 0 || !ai.aiEnabled()) return [];
  const info = exam.syllabus.find(x => x.subject === subject);
  if (!info) return [];
  const topics = topic ? [topic] : info.topics;
  const out = [];
  const max = Math.min(10, count);
  for (let i = 0; i < max; i += 6) {
    const n = Math.min(6, max - i), tp = topics[Math.floor(i / 6) % topics.length];
    const rr = await ai.generateQuestions({ examName: exam.name, subject, topic: tp, difficulty: difficulty === 'any' ? 'medium' : difficulty, count: n, level: user.level });
    if (rr.ok) out.push(...storeAiQuestions(user, exam, rr.questions));
  }
  return out;
}

function storeAiQuestions(user, exam, list) {
  const ins = db.prepare(`INSERT INTO questions (exam_id,subject,topic,difficulty,text,options,answer,explanation,concept,tip,source_type,owner_user_id,created_at)
    VALUES (?,?,?,?,?,?,?,?,?,?, 'AI_GENERATED', ?, ?)`);
  return list.map(q => { const id = Number(ins.run(exam.id, q.subject, q.topic, q.difficulty, q.text, JSON.stringify(q.options), q.answer, q.explanation, q.concept, q.tip, user.id, now()).lastInsertRowid);
    return db.prepare('SELECT * FROM questions WHERE id=?').get(id); });
}
function cleanTestAnswers(ids, input) {
  const list = [...ids].map(Number).filter(Number.isInteger);
  if (!list.length) return {};
  const rows = db.prepare(`SELECT id,options FROM questions WHERE id IN (${list.map(() => '?').join(',')})`).all(...list);
  const max = new Map(rows.map(r => [String(r.id), (J(r.options) || []).length]));
  return Object.fromEntries(Object.entries(input || {}).filter(([id, choice]) =>
    max.has(id) && Number.isInteger(choice) && choice >= 0 && choice < max.get(id)));
}
function cleanTestTimes(ids, input) {
  const allowed = new Set([...ids].map(String));
  return Object.fromEntries(Object.entries(input || {}).filter(([id, ms]) =>
    allowed.has(id) && Number.isFinite(ms) && ms >= 0 && ms <= 3600000));
}
function testView(t, user) {
  const ids = J(t.question_ids);
  const rows = db.prepare(`SELECT * FROM questions WHERE id IN (${ids.map(() => '?').join(',')})`).all(...ids);
  const byId = new Map(rows.map(r => [r.id, r]));
  const deadline = t.started_at + t.minutes * 60000;
  const base = { id: t.id, kind: t.kind, title: t.title, status: t.status, minutes: t.minutes, started_at: t.started_at, deadline, remaining_sec: Math.max(0, Math.round((deadline - now()) / 1000)),
    answers: J(t.answers), marked: J(t.marked), times: J(t.times), current_idx: t.current_idx, marking: J(t.marking) };
  if (t.status === 'active') return { ...base, questions: ids.map(i => byId.get(i)).filter(Boolean).map(pubQ), serverNow: now() };
  return { ...base, result: J(t.result), questions: ids.map(i => byId.get(i)).filter(Boolean).map(fullQ) };
}
function scoreTest(t, exam, user, answers, times) {
  const ids = J(t.question_ids), mk = J(t.marking);
  const rows = db.prepare(`SELECT * FROM questions WHERE id IN (${ids.map(() => '?').join(',')})`).all(...ids);
  const byId = new Map(rows.map(r => [r.id, r]));
  let score = 0, max = 0, correct = 0, wrong = 0, skipped = 0, totalMs = 0;
  const subj = {}, topic = {}, slow = [];
  const timesVals = Object.values(times).filter(x => x > 0), avg = timesVals.length ? timesVals.reduce((a, b) => a + b, 0) / timesVals.length : 0;
  for (const id of ids) {
    const q = byId.get(id); if (!q) continue;
    const m = mk[q.subject] || { marks: 1, negative: 0.25 }; max += m.marks;
    const ch = answers[id]; const ms = +times[id] || 0; totalMs += ms;
    const S = subj[q.subject] ||= { attempted: 0, correct: 0, total: 0, score: 0, max: 0 };
    const T = topic[q.subject + '|' + q.topic] ||= { subject: q.subject, topic: q.topic, attempted: 0, correct: 0, total: 0 };
    S.total++; T.total++; S.max += m.marks;
    if (ch === undefined || ch === null) { skipped++; continue; }
    S.attempted++; T.attempted++;
    if (ch === q.answer) { correct++; S.correct++; T.correct++; score += m.marks; S.score += m.marks; }
    else { wrong++; score -= m.negative; S.score -= m.negative; }
    if (avg && ms > 2 * avg && ms > 45000) slow.push({ id, ms });
  }
  const attempted = correct + wrong;
  const topics = Object.values(topic).map(x => ({ ...x, accuracy: acc(x.correct, x.attempted) }));
  const strong = topics.filter(x => x.attempted >= 2 && x.accuracy >= 75).map(x => x.topic);
  const weak = topics.filter(x => x.attempted >= 1 && x.accuracy < 50).sort((a, b) => a.accuracy - b.accuracy);
  const total = ids.length, accuracy = acc(correct, attempted);
  const wentWell = [], wentWrong = [];
  if (accuracy !== null && accuracy >= 75) wentWell.push(`Strong accuracy: ${accuracy}% of attempted questions were correct.`);
  if (strong.length) wentWell.push(`Solid topics: ${strong.join(', ')}.`);
  if (skipped === 0 && total) wentWell.push('You attempted every question.');
  if (!wentWell.length) wentWell.push('You completed the test, which gives the system real data to personalise your plan.');
  if (accuracy !== null && accuracy < 60) wentWrong.push(`Accuracy was ${accuracy}% on attempted questions.`);
  if (weak.length) wentWrong.push(`Weak topics: ${weak.map(w => w.topic).join(', ')}.`);
  if (wrong && max && (wrong * 1) / attempted > 0.35) wentWrong.push(`${wrong} wrong answers cost negative marks. Skip questions you cannot narrow down.`);
  if (!wentWrong.length) wentWrong.push('No major problem areas in this test.');
  const timeNotes = [];
  if (skipped / Math.max(total, 1) > 0.25) timeNotes.push(`${skipped} of ${total} questions were left unattempted: practise pacing.`);
  if (slow.length) timeNotes.push(`${slow.length} question(s) took more than twice your average time.`);
  if (!timeNotes.length) timeNotes.push('No significant time-management problems detected.');
  const nextTopic = weak[0] || topics.filter(x => x.attempted).sort((a, b) => (a.accuracy ?? 100) - (b.accuracy ?? 100))[0] || null;
  return { score: Math.round(score * 100) / 100, max: Math.round(max * 100) / 100, correct, wrong, skipped, total, accuracy, total_minutes: Math.round(totalMs / 6000) / 10,
    by_subject: subj, by_topic: topics, slow, coaching: {
      went_well: wentWell, went_wrong: wentWrong, weak_topics: weak.map(w => w.topic), strong_topics: strong, time_problems: timeNotes,
      accuracy_problems: accuracy !== null && accuracy < 60 ? [`Aim for 70%+ accuracy before increasing speed.`] : [],
      recommended_revision: nextTopic ? { subject: nextTopic.subject, topic: nextTopic.topic } : null,
      recommended_test: nextTopic ? { kind: 'topic', subject: nextTopic.subject, topic: nextTopic.topic, count: 10 } : { kind: 'subject', subject: exam.subjects[0], count: 10 },
    } };
}

// ---------- plan ----------
function buildPlan(user, exam) {
  const budget = user.daily_minutes || 60, today = dayStr();
  const q = revisionQueue(user, exam), openM = db.prepare('SELECT COUNT(*) c FROM mistakes WHERE user_id=? AND exam_id=? AND resolved=0').get(user.id, exam.id).c;
  const near = daysLeft(user) !== null && daysLeft(user) <= 30, stage = user.stage || 'Preparing';
  const cand = [];
  if (q[0]) cand.push({ key: 'rev:' + q[0].topic, type: 'revision', title: `Revise ${q[0].topic}`, minutes: 20, subject: q[0].subject, topic: q[0].topic });
  if (openM) cand.push({ key: 'mistakes', type: 'mistakes', title: `Review ${Math.min(openM, 10)} past mistakes`, minutes: 10 });
  const pt = q[0] || null;
  cand.push({ key: 'practice', type: 'practice', title: pt ? `Practice ${pt.topic}` : `Practice ${exam.subjects[(new Date().getDate()) % exam.subjects.length]}`, minutes: stage === 'Just Started' ? 25 : 20, subject: pt ? pt.subject : undefined, topic: pt ? pt.topic : undefined });
  if (stage !== 'Just Started' || budget >= 180) cand.push({ key: 'test', type: 'test', title: near || stage === 'Revision' ? 'Take a sectional mock' : 'Take a 10-question topic test', minutes: near || stage === 'Revision' ? 30 : 15 });
  const tasks = []; let used = 0;
  for (const t of cand) { if (used + t.minutes <= budget || tasks.length < 2) { tasks.push(t); used += t.minutes; } }
  const done = new Set(db.prepare('SELECT task_key FROM plan_done WHERE user_id=? AND day=?').all(user.id, today).map(r => r.task_key));
  return { day: today, budget_minutes: budget, planned_minutes: used, tasks: tasks.map(t => ({ ...t, done: done.has(t.key) })) };
}

// ---------- AI helpers ----------
function tutorCtx(user, exam) {
  return { examName: exam.name, level: user.level, weak: weakTopics(user, exam, 3).map(w => w.topic), daysLeft: daysLeft(user) };
}
async function guarded(user, key, fn) {
  const k = user.id + ':' + key;
  if (mem.inflight.has(k)) throw new HttpError(429, 'Your previous request is still being processed.');
  mem.inflight.add(k);
  try { return await fn(); } finally { mem.inflight.delete(k); }
}
const MODE_HINT = {
  simple: 'Explain the previous answer again in much simpler language, as to a beginner, using an everyday analogy.',
  detail: 'Explain the previous answer in more detail, step by step, including the underlying theory.',
  another: 'Solve the previous question using a different valid method. If no genuinely different valid method exists, say so honestly.',
  again: 'Explain the previous answer again, from a different angle.',
};
const MEDIA = { 'image/png': 'image', 'image/jpeg': 'image', 'image/webp': 'image', 'application/pdf': 'document' };
function mediaBlocks(files) {
  const blocks = [];
  if (!Array.isArray(files)) return blocks;
  if (files.length > 5) throw bad('You can upload at most 5 files at once.');
  for (const f of files) {
    const type = MEDIA[f.media_type];
    if (!type || typeof f.data !== 'string' || !/^[A-Za-z0-9+/=]+$/.test(f.data)) throw bad('Unsupported file. Upload a PNG, JPG, WEBP image or a PDF.');
    if (f.data.length > 14e6) throw bad('That file is too large. Please upload a smaller file, or split a large paper into sections.');
    if (!validFileSignature(f.media_type, f.data)) throw bad('The uploaded file type does not match its contents.');
    blocks.push({ type, source: { type: 'base64', media_type: f.media_type, data: f.data } });
  }
  return blocks;
}

// ---------- routes ----------
const routes = [];
const route = (method, pat, opts, fn) => routes.push({ method, re: new RegExp('^' + pat.replace(/:(\w+)/g, '(?<$1>[^/]+)') + '$'), opts, fn });
const A = { auth: true }, ADM = { auth: true, admin: true }, ONB = { auth: true, onboarded: true };

route('GET', '/api/config', {}, () => ({ ai_enabled: ai.aiEnabled(), ai_provider: ai.aiProvider(), ai_model: ai.aiModel(), prod: PROD }));
route('GET', '/api/exams', {}, () => ({ exams: listExams().map(e => ({ id: e.id, name: e.name, category: e.category, verified: e.verified, subjects: e.subjects, minutes: e.pattern.minutes, questions: e.pattern.sections.reduce((a, s) => a + s.questions, 0) })) }));
route('GET', '/api/exams/:id', {}, (c) => { const e = loadExam(c.params.id); if (!e) throw new HttpError(404, 'Exam not found'); return { exam: e }; });

route('POST', '/api/auth/signup', {}, (c) => {
  const email = String(c.body.email || '').trim().toLowerCase();
  const password = String(c.body.password || '');
  const confirm_password = String(c.body.confirm_password || '');
  if (!EMAIL_RE.test(email)) throw bad('Enter a valid email address.');
  validatePassword(password, confirm_password);
  rateLimit('signup:' + c.ip, 6, 3600000);
  rateLimit('signup-email:' + email, 3, 3600000);
  const existing = db.prepare('SELECT * FROM users WHERE email=?').get(email);
  if (existing) {
    if (existing.password_hash) throw new HttpError(409, 'An account with this email already exists. Please log in.');
    throw new HttpError(409, 'This email belongs to an older OTP account. Please use a different email to create a password account.');
  }
  const role = ADMIN_EMAILS.includes(email) ? 'admin' : 'student';
  db.prepare('INSERT INTO users (email,password_hash,role,created_at) VALUES (?,?,?,?)').run(email, hashPassword(password), role, now());
  const u = db.prepare('SELECT * FROM users WHERE email=?').get(email);
  newSession(c.res, u.id);
  return { user: meJson(u) };
});
route('POST', '/api/auth/login', {}, (c) => {
  const email = String(c.body.email || '').trim().toLowerCase();
  const password = String(c.body.password || '');
  if (!EMAIL_RE.test(email) || !password) throw bad('Enter your email and password.');
  rateLimit('login:' + c.ip, 20, 3600000);
  rateLimit('login-email:' + email, 10, 900000);
  const u = db.prepare('SELECT * FROM users WHERE email=?').get(email);
  if (!u) throw new HttpError(401, 'Incorrect email or password.');
  if (!u.password_hash) throw new HttpError(409, 'This account needs one-time email verification before password login.', { code: 'PASSWORD_SETUP_REQUIRED' });
  if (!verifyPassword(u.password_hash, password)) throw new HttpError(401, 'Incorrect email or password.');
  newSession(c.res, u.id);
  return { user: meJson(u) };
});
route('POST', '/api/auth/set-password', A, (c) => {
  validatePassword(String(c.body.password || ''), String(c.body.confirm_password || ''));
  db.prepare('UPDATE users SET password_hash=? WHERE id=?').run(hashPassword(String(c.body.password)), c.user.id);
  const u = db.prepare('SELECT * FROM users WHERE id=?').get(c.user.id);
  return { user: meJson(u) };
});
route('POST', '/api/auth/logout', {}, (c) => {
  const m = /(?:^|;\s*)sid=([^;]+)/.exec(c.req.headers.cookie || ''); if (m) db.prepare('DELETE FROM sessions WHERE token_hash=?').run(sha(m[1]));
  c.res.setHeader('Set-Cookie', 'sid=; HttpOnly; Path=/; Max-Age=0; SameSite=Lax'); return { ok: true };
});
route('GET', '/api/me', {}, (c) => ({ user: c.user ? meJson(c.user) : null }));

const LEVELS = ['Beginner', 'Intermediate', 'Advanced'], STAGES = ['Just Started', 'Preparing', 'Revision'], MINS = [60, 120, 180, 240, 300];
function applyProfile(u, b, partial) {
  const f = {};
  if (b.name !== undefined) { const n = String(b.name).trim().slice(0, 60); if (!n && !partial) throw bad('Please enter your name.'); if (n) f.name = n; }
  if (b.exam_id !== undefined) { if (!loadExam(b.exam_id)) throw bad('Please select a valid exam.'); f.exam_id = b.exam_id; }
  if (b.level !== undefined) { if (!LEVELS.includes(b.level)) throw bad('Invalid preparation level.'); f.level = b.level; }
  if (b.target_date !== undefined) { if (!/^\d{4}-\d{2}-\d{2}$/.test(b.target_date) || isNaN(Date.parse(b.target_date))) throw bad('Enter a valid target exam date.'); if (b.target_date < dayStr()) throw bad('Target date must be in the future.'); f.target_date = b.target_date; }
  if (b.daily_minutes !== undefined) { if (!MINS.includes(+b.daily_minutes)) throw bad('Invalid daily study time.'); f.daily_minutes = +b.daily_minutes; }
  if (b.stage !== undefined && b.stage !== '') { if (!STAGES.includes(b.stage)) throw bad('Invalid preparation stage.'); f.stage = b.stage; }
  if (b.selected_subjects !== undefined) {
    const ex = loadExam(b.exam_id || u.exam_id);
    const arr = Array.isArray(b.selected_subjects) ? [...new Set(b.selected_subjects.map(String))] : [];
    if (ex && ex.category.startsWith('School') && !arr.length) throw bad('Select at least one school subject.');
    if (ex) { const ok = new Set(ex.subjects); if (arr.some(x => !ok.has(x))) throw bad('Invalid subject selection.'); }
    f.selected_subjects = JSON.stringify(arr);
  }
  return f;
}
route('POST', '/api/me/onboarding', A, (c) => {
  const f = applyProfile(c.user, c.body, false);
  for (const k of ['name', 'exam_id', 'level', 'target_date', 'daily_minutes']) if (!f[k]) throw bad('Please complete all required fields.');
  f.stage = f.stage || 'Preparing'; f.onboarded = 1;
  const keys = Object.keys(f); db.prepare(`UPDATE users SET ${keys.map(k => k + '=?').join(',')} WHERE id=?`).run(...keys.map(k => f[k]), c.user.id);
  return { user: meJson(db.prepare('SELECT * FROM users WHERE id=?').get(c.user.id)) };
});
route('PUT', '/api/me', ONB, (c) => { // history is kept when the exam changes: stats are keyed by exam_id
  const f = applyProfile(c.user, c.body, true); const keys = Object.keys(f);
  if (keys.length) db.prepare(`UPDATE users SET ${keys.map(k => k + '=?').join(',')} WHERE id=?`).run(...keys.map(k => f[k]), c.user.id);
  return { user: meJson(db.prepare('SELECT * FROM users WHERE id=?').get(c.user.id)) };
});
route('POST', '/api/me/reset', ONB, (c) => {
  if (c.body.confirm !== true) throw bad('Please confirm the reset.');
  db.prepare('UPDATE users SET exam_id=NULL,level=NULL,target_date=NULL,daily_minutes=NULL,stage=NULL,onboarded=0 WHERE id=?').run(c.user.id);
  if (c.body.wipe_history === true) for (const t of ['answers', 'mistakes', 'topic_stats', 'tests', 'bookmarks', 'ai_conversations', 'plan_done']) db.prepare(`DELETE FROM ${t} WHERE user_id=?`).run(c.user.id);
  return { ok: true };
});

// Home
route('GET', '/api/home', ONB, (c) => {
  const u = c.user, exam = loadExam(u.exam_id), t0 = Date.parse(dayStr() + 'T00:00:00Z') - TZ_MIN * 60000;
  const today = db.prepare('SELECT COUNT(*) n, COALESCE(SUM(correct),0) c, COALESCE(SUM(time_ms),0) ms FROM answers WHERE user_id=? AND exam_id=? AND created_at>=?').get(u.id, exam.id, t0);
  const tot = db.prepare('SELECT COUNT(*) n, COALESCE(SUM(correct),0) c FROM answers WHERE user_id=? AND exam_id=?').get(u.id, exam.id);
  const last = db.prepare('SELECT subject,topic FROM answers WHERE user_id=? AND exam_id=? ORDER BY id DESC LIMIT 1').get(u.id, exam.id);
  const active = db.prepare("SELECT id,title FROM tests WHERE user_id=? AND exam_id=? AND status='active' ORDER BY id DESC LIMIT 1").get(u.id, exam.id);
  const tests = db.prepare("SELECT id,title,result,submitted_at FROM tests WHERE user_id=? AND exam_id=? AND status='submitted' ORDER BY id DESC LIMIT 5").all(u.id, exam.id)
    .map(t => { const r = J(t.result); return { id: t.id, title: t.title, score: r.score, max: r.max, accuracy: r.accuracy, at: t.submitted_at }; });
  const hr = +new Date(now() + TZ_MIN * 60000).toISOString().slice(11, 13);
  const dl = daysLeft(u);
  const subjProgress = exam.syllabus.map(s => ({ subject: s.subject, covered: db.prepare('SELECT COUNT(*) c FROM topic_stats WHERE user_id=? AND exam_id=? AND subject=?').get(u.id, exam.id, s.subject).c, total: s.topics.length }));
  const ca = db.prepare("SELECT id,title,category,event_date FROM current_affairs WHERE exams='ALL' OR (',' || exams || ',') LIKE ? ORDER BY COALESCE(event_date,'') DESC, id DESC LIMIT 3").all('%,' + exam.id + ',%');
  return { greeting: hr < 12 ? 'Good morning' : hr < 17 ? 'Good afternoon' : 'Good evening', name: u.name, exam: { id: exam.id, name: exam.name }, days_left: dl,
    target: { minutes: u.daily_minutes, questions: Math.round(u.daily_minutes / 2) },
    today: { questions: today.n, correct: today.c, minutes: Math.round(today.ms / 60000) },
    recommendation: recommend(u, exam), weak_topics: weakTopics(u, exam, 4), continue: last ? { ...last } : null, subject_progress: subjProgress,
    upcoming_test: active ? { resume: true, id: active.id, title: active.title } : { resume: false, title: 'Take a topic test to measure your progress' },
    current_affairs: ca, recent_tests: tests, streak: streak(u.id), questions_solved: tot.n, accuracy: acc(tot.c, tot.n) };
});

// Practice
route('GET', '/api/practice/questions', ONB, (c) => {
  const exam = loadExam(c.user.exam_id), q = c.query; const v = visible(c.user, exam);
  let sql = `SELECT q.* FROM questions q WHERE ${v.sql}`; const p = [...v.params];
  if (q.subject) { if (!exam.subjects.includes(q.subject)) throw bad('Subject is not part of your exam.'); sql += ' AND q.subject=?'; p.push(q.subject); }
  if (q.topic) { sql += ' AND q.topic=?'; p.push(q.topic); }
  if (['easy', 'medium', 'hard'].includes(q.difficulty)) { sql += ' AND q.difficulty=?'; p.push(q.difficulty); }
  if (['VERIFIED_PYQ', 'AI_GENERATED', 'PYQ_PATTERN', 'ADMIN_PRACTICE'].includes(q.source)) { sql += ' AND q.source_type=?'; p.push(q.source); }
  const limit = Math.min(Math.max(+q.limit || 10, 1), 20), offset = Math.max(+q.offset || 0, 0);
  sql += ' ORDER BY (SELECT COUNT(*) FROM answers a WHERE a.user_id=? AND a.question_id=q.id), RANDOM() LIMIT ? OFFSET ?'; p.push(c.user.id, limit, offset);
  return { questions: db.prepare(sql).all(...p).map(pubQ) };
});
route('POST', '/api/practice/answer', ONB, (c) => {
  const exam = loadExam(c.user.exam_id), { question_id, choice, time_ms } = c.body;
  const mode = ['practice', 'mistake', 'pyq'].includes(c.body.mode) ? c.body.mode : 'practice';
  const v = visible(c.user, exam);
  const q = db.prepare(`SELECT q.* FROM questions q WHERE q.id=? AND ${v.sql}`).get(+question_id, ...v.params);
  if (!q) throw new HttpError(404, 'Question not found for your exam.');
  const opts = J(q.options);
  if (!Number.isInteger(choice) || choice < 0 || choice >= opts.length) throw bad('Please select an option.');
  const correct = recordAnswer(c.user, exam, q, choice, Math.min(+time_ms || 0, 600000), mode);
  const out = { correct: !!correct, correct_index: q.answer, explanation: q.explanation, concept: q.concept, tip: q.tip, source_type: q.source_type };
  if (!correct) out.mistake = { your_answer: opts[choice], correct_answer: opts[q.answer],
    where_wrong: `You chose “${opts[choice]}”. The correct option is “${opts[q.answer]}”. ${q.explanation}`, correct_concept: q.concept || q.explanation,
    how_to_avoid: q.tip || 'Re-read the question and eliminate options before answering.' };
  return out;
});

// Mistakes
route('GET', '/api/mistakes', ONB, (c) => {
  const exam = loadExam(c.user.exam_id), limit = Math.min(+c.query.limit || 20, 50), offset = +c.query.offset || 0;
  const rows = db.prepare(`SELECT q.*, m.wrong_count, m.weakness, m.last_choice FROM mistakes m JOIN questions q ON q.id=m.question_id
    WHERE m.user_id=? AND m.exam_id=? AND m.resolved=0 ORDER BY m.weakness DESC, m.updated_at DESC LIMIT ? OFFSET ?`).all(c.user.id, exam.id, limit, offset);
  const total = db.prepare('SELECT COUNT(*) c FROM mistakes WHERE user_id=? AND exam_id=? AND resolved=0').get(c.user.id, exam.id).c;
  return { total, mistakes: rows.map(r => ({ ...pubQ(r), wrong_count: r.wrong_count, weakness: r.weakness })) };
});

// Revision
route('GET', '/api/revision/queue', ONB, (c) => ({ queue: revisionQueue(c.user, loadExam(c.user.exam_id)) }));
route('GET', '/api/revision/content', ONB, async (c) => {
  const exam = loadExam(c.user.exam_id), { subject, topic } = c.query;
  const s = exam.syllabus.find(x => x.subject === subject); if (!s || !s.topics.includes(topic)) throw bad('Topic not in your syllabus.');
  const mistakes = db.prepare(`SELECT q.id,q.text,q.explanation,q.concept FROM mistakes m JOIN questions q ON q.id=m.question_id WHERE m.user_id=? AND m.exam_id=? AND q.subject=? AND q.topic=? AND m.resolved=0 ORDER BY m.weakness DESC LIMIT 5`).all(c.user.id, exam.id, subject, topic);
  const pyq = db.prepare("SELECT text,concept FROM questions WHERE source_type='VERIFIED_PYQ' AND exam_id=? AND subject=? AND topic=? LIMIT 5").all(exam.id, subject, topic);
  const notes = NOTES[subject + '|' + topic] || null;
  return { subject, topic, notes, notes_source: notes ? 'curated' : null, mistakes, pyq_concepts: pyq, ai_available: ai.aiEnabled() };
});
route('POST', '/api/revision/complete', ONB, (c) => {
  const exam = loadExam(c.user.exam_id), { subject, topic } = c.body;
  const s = exam.syllabus.find(x => x.subject === subject); if (!s || !s.topics.includes(topic)) throw bad('Topic not in your syllabus.');
  db.prepare(`INSERT OR IGNORE INTO topic_stats (user_id,exam_id,subject,topic) VALUES (?,?,?,?)`).run(c.user.id, exam.id, subject, topic);
  const st = db.prepare('SELECT * FROM topic_stats WHERE user_id=? AND exam_id=? AND subject=? AND topic=?').get(c.user.id, exam.id, subject, topic);
  const a = acc(st.correct, st.attempted);
  const stage = a !== null && a < 50 ? 1 : Math.min(st.rev_stage + 1, REV_DAYS.length - 1); // struggling → restart shorter cycle
  db.prepare('UPDATE topic_stats SET rev_stage=?, last_rev_at=?, next_rev_at=? WHERE user_id=? AND exam_id=? AND subject=? AND topic=?').run(stage, now(), now() + REV_DAYS[stage] * DAY, c.user.id, exam.id, subject, topic);
  return { ok: true, next_in_days: REV_DAYS[stage], message: 'Revision complete 🎯' };
});

// Tests
route('POST', '/api/tests/create', ONB, async (c) => {
  const exam = loadExam(c.user.exam_id);
  return guarded(c.user, 'testcreate', async () => buildTest(c.user, exam, c.body));
});
route('GET', '/api/tests', ONB, (c) => ({ tests: db.prepare('SELECT id,kind,title,status,minutes,result,started_at,submitted_at FROM tests WHERE user_id=? AND exam_id=? ORDER BY id DESC LIMIT 30').all(c.user.id, c.user.exam_id)
  .map(t => { const r = J(t.result); return { id: t.id, kind: t.kind, title: t.title, status: t.status, minutes: t.minutes, started_at: t.started_at, score: r?.score ?? null, max: r?.max ?? null, accuracy: r?.accuracy ?? null }; }) }));
route('GET', '/api/tests/:id', ONB, (c) => {
  const t = db.prepare('SELECT * FROM tests WHERE id=? AND user_id=?').get(+c.params.id, c.user.id);
  if (!t) throw new HttpError(404, 'Test not found.'); return { test: testView(t, c.user) };
});
route('PUT', '/api/tests/:id/save', ONB, (c) => {
  const t = db.prepare('SELECT * FROM tests WHERE id=? AND user_id=?').get(+c.params.id, c.user.id);
  if (!t) throw new HttpError(404, 'Test not found.'); if (t.status !== 'active') return { ok: true, status: t.status };
  const questionIds = J(t.question_ids), ids = new Set(questionIds.map(String));
  const ans = cleanTestAnswers(questionIds, c.body.answers), times = cleanTestTimes(questionIds, c.body.times);
  const marked = [...new Set((Array.isArray(c.body.marked) ? c.body.marked : []).map(String).filter(k => ids.has(k)))].slice(0, 200);
  const currentIdx = Math.min(questionIds.length - 1, Math.max(0, Math.floor(Number(c.body.current_idx) || 0)));
  db.prepare('UPDATE tests SET answers=?, marked=?, times=?, current_idx=?, updated_at=? WHERE id=?')
    .run(JSON.stringify(ans), JSON.stringify(marked), JSON.stringify(times), currentIdx, now(), t.id);
  return { ok: true, saved_at: now() };
});
route('POST', '/api/tests/:id/submit', ONB, (c) => {
  const t = db.prepare('SELECT * FROM tests WHERE id=? AND user_id=?').get(+c.params.id, c.user.id);
  if (!t) throw new HttpError(404, 'Test not found.');
  if (t.status === 'submitted') return { test: testView(t, c.user), duplicate: true }; // idempotent: no double submission
  const exam = loadExam(t.exam_id) || loadExam(c.user.exam_id);
  const questionIds = J(t.question_ids);
  const answers = { ...cleanTestAnswers(questionIds, J(t.answers)), ...cleanTestAnswers(questionIds, c.body.answers) };
  const times = { ...cleanTestTimes(questionIds, J(t.times)), ...cleanTestTimes(questionIds, c.body.times) };
  const res = scoreTest(t, exam, c.user, answers, times);
  // atomic claim to defeat concurrent duplicate submits
  const claim = db.prepare("UPDATE tests SET status='submitted', answers=?, times=?, result=?, submitted_at=?, updated_at=? WHERE id=? AND status='active'")
    .run(JSON.stringify(answers), JSON.stringify(times), JSON.stringify(res), now(), now(), t.id);
  if (claim.changes === 1) {
    const rows = db.prepare(`SELECT * FROM questions WHERE id IN (${[...ids].map(() => '?').join(',')})`).all(...ids);
    for (const q of rows) { const ch = answers[q.id]; if (ch !== undefined && ch !== null) recordAnswer(c.user, exam, q, ch, +times[q.id] || 0, 'test'); }
  }
  return { test: testView(db.prepare('SELECT * FROM tests WHERE id=?').get(t.id), c.user) };
});

// PYQs
route('GET', '/api/pyq/papers', ONB, (c) => ({ papers: db.prepare("SELECT pyq_year year, pyq_paper paper, pyq_shift shift, COUNT(*) questions FROM questions WHERE source_type='VERIFIED_PYQ' AND exam_id=? GROUP BY 1,2,3 ORDER BY 1 DESC").all(c.user.exam_id) }));
route('GET', '/api/pyq/analysis', ONB, (c) => {
  const total = db.prepare("SELECT COUNT(*) c FROM questions WHERE source_type='VERIFIED_PYQ' AND exam_id=?").get(c.user.exam_id).c;
  if (total < 30) return { sufficient: false, total, message: `Only ${total} verified PYQ(s) are available for your exam. Trend analysis needs at least 30, so no trends are shown.` };
  const bySubject = db.prepare("SELECT subject, COUNT(*) n FROM questions WHERE source_type='VERIFIED_PYQ' AND exam_id=? GROUP BY subject ORDER BY n DESC").all(c.user.exam_id);
  const byTopic = db.prepare("SELECT subject,topic, COUNT(*) n FROM questions WHERE source_type='VERIFIED_PYQ' AND exam_id=? GROUP BY 1,2 ORDER BY n DESC LIMIT 15").all(c.user.exam_id);
  const byYear = db.prepare("SELECT pyq_year y, COUNT(*) n FROM questions WHERE source_type='VERIFIED_PYQ' AND exam_id=? GROUP BY 1 ORDER BY 1").all(c.user.exam_id);
  return { sufficient: true, total, by_subject: bySubject, top_topics: byTopic, papers_covered: byYear };
});

// Current affairs
route('GET', '/api/ca', ONB, async (c) => {
  const limit = Math.min(+c.query.limit || 30, 50), offset = +c.query.offset || 0, cat = c.query.category;
  const period = c.query.period === 'weekly' ? 'weekly' : 'daily';
  const today = dayStr();
  const from = period === 'weekly' ? dayStr(now() - 6 * DAY) : today;
  let sql = "SELECT * FROM current_affairs WHERE (exams='ALL' OR (',' || exams || ',') LIKE ?) AND (event_date IS NULL OR event_date>=?)";
  const p = ['%,' + c.user.exam_id + ',%', from];
  if (cat) { sql += ' AND category=?'; p.push(cat); }
  const items = db.prepare(sql + " ORDER BY COALESCE(event_date,'') DESC, id DESC LIMIT ? OFFSET ?").all(...p, limit, offset);
  return { items, categories: CA_CATS, period, from, updated: dayStr() };
});
const CA_CATS = ['National', 'International', 'Defence', 'Economy', 'Science & Technology', 'Environment', 'Sports', 'Awards', 'Appointments', 'Government Schemes', 'Important Days', 'Reports & Indexes', 'Books & Authors', 'Important Persons', 'Defence Exercises'];

// Progress & analyst
route('GET', '/api/progress', ONB, (c) => {
  const u = c.user, exam = loadExam(u.exam_id), t = now();
  const wk = (from, to) => db.prepare('SELECT COUNT(*) n, COALESCE(SUM(correct),0) c, COALESCE(SUM(time_ms),0) ms FROM answers WHERE user_id=? AND exam_id=? AND created_at>=? AND created_at<?').get(u.id, exam.id, from, to);
  const thisW = wk(t - 7 * DAY, t + 1), prevW = wk(t - 14 * DAY, t - 7 * DAY);
  const topics = db.prepare('SELECT subject,topic,attempted,correct FROM topic_stats WHERE user_id=? AND exam_id=? AND attempted>=3').all(u.id, exam.id).map(r => ({ ...r, accuracy: acc(r.correct, r.attempted) })).sort((a, b) => b.accuracy - a.accuracy);
  const subj = db.prepare('SELECT subject, SUM(attempted) a, SUM(correct) c FROM topic_stats WHERE user_id=? AND exam_id=? GROUP BY subject').all(u.id, exam.id).map(r => ({ subject: r.subject, attempted: r.a, accuracy: acc(r.c, r.a) }));
  const days = []; for (let i = 6; i >= 0; i--) { const d = dayStr(t - i * DAY); days.push({ day: d, n: 0 }); }
  for (const r of db.prepare('SELECT created_at t FROM answers WHERE user_id=? AND exam_id=? AND created_at>=?').all(u.id, exam.id, t - 8 * DAY)) { const d = days.find(x => x.day === dayStr(r.t)); if (d) d.n++; }
  const lines = [];
  if (thisW.n) lines.push(`You solved ${thisW.n} question${thisW.n === 1 ? '' : 's'} this week.`);
  const a1 = acc(thisW.c, thisW.n), a0 = acc(prevW.c, prevW.n);
  if (a1 !== null && a0 !== null) lines.push(a1 === a0 ? `Accuracy held steady at ${a1}%.` : `Accuracy ${a1 > a0 ? 'improved' : 'dropped'} from ${a0}% to ${a1}%.`);
  else if (a1 !== null) lines.push(`Your accuracy this week is ${a1}%. Next week this will be compared with it.`);
  let rec = null;
  if (topics.length >= 2) { lines.push(`Strongest: ${topics[0].topic}`); const w = topics[topics.length - 1]; lines.push(`Weakest: ${w.topic}`); if (w.accuracy < 70) rec = `Recommendation: Revise ${w.topic} and take a 20-question timed test.`; }
  else if (thisW.n) lines.push('Answer at least 3 questions in two or more topics to unlock strongest/weakest analysis.');
  if (rec) lines.push(rec);
  if (!lines.length) lines.push('No activity yet this week. Solve a few questions to get your first analysis.');
  return { week: { questions: thisW.n, accuracy: a1, minutes: Math.round(thisW.ms / 60000) }, prev_week: { questions: prevW.n, accuracy: a0 }, analyst: lines,
    strongest: topics.slice(0, 3), weakest: topics.slice(-3).reverse(), by_subject: subj, last7: days, streak: streak(u.id),
    tests: db.prepare("SELECT id,title,result,submitted_at FROM tests WHERE user_id=? AND exam_id=? AND status='submitted' ORDER BY id DESC LIMIT 10").all(u.id, exam.id).map(r => { const x = J(r.result); return { id: r.id, title: r.title, score: x.score, max: x.max, accuracy: x.accuracy, at: r.submitted_at }; }).reverse() };
});

// Plan
route('GET', '/api/plan', ONB, (c) => ({ plan: buildPlan(c.user, loadExam(c.user.exam_id)), days_left: daysLeft(c.user) }));
route('POST', '/api/plan/done', ONB, (c) => {
  const key = String(c.body.key || '').slice(0, 100); if (!key) throw bad('Missing task.');
  if (c.body.done === false) db.prepare('DELETE FROM plan_done WHERE user_id=? AND day=? AND task_key=?').run(c.user.id, dayStr(), key);
  else db.prepare('INSERT OR IGNORE INTO plan_done VALUES (?,?,?)').run(c.user.id, dayStr(), key);
  return { ok: true };
});

// Search + library
route('GET', '/api/search', ONB, (c) => {
  const qs = String(c.query.q || '').trim().slice(0, 80); if (qs.length < 2) return { topics: [], questions: [], pyqs: [], current_affairs: [], tests: [], library: [] };
  const exam = loadExam(c.user.exam_id), low = qs.toLowerCase(), like = '%' + qs.replace(/[%_]/g, '') + '%';
  const topics = []; for (const s of exam.syllabus) for (const t of s.topics) if (t.toLowerCase().includes(low) || s.subject.toLowerCase().includes(low)) topics.push({ subject: s.subject, topic: t });
  const v = visible(c.user, exam);
  const questions = db.prepare(`SELECT q.* FROM questions q WHERE ${v.sql} AND q.source_type!='VERIFIED_PYQ' AND (q.text LIKE ? OR q.topic LIKE ?) LIMIT 8`).all(...v.params, like, like).map(pubQ);
  const pyqs = db.prepare("SELECT * FROM questions WHERE source_type='VERIFIED_PYQ' AND exam_id=? AND (text LIKE ? OR topic LIKE ?) LIMIT 8").all(exam.id, like, like).map(pubQ);
  const ca = db.prepare("SELECT id,title,category FROM current_affairs WHERE (exams='ALL' OR (',' || exams || ',') LIKE ?) AND (title LIKE ? OR summary LIKE ?) LIMIT 8").all('%,' + exam.id + ',%', like, like);
  const tests = db.prepare('SELECT id,title,status FROM tests WHERE user_id=? AND exam_id=? AND title LIKE ? ORDER BY id DESC LIMIT 5').all(c.user.id, exam.id, like);
  const library = db.prepare('SELECT id,kind,title FROM bookmarks WHERE user_id=? AND (title LIKE ? OR body LIKE ?) LIMIT 8').all(c.user.id, like, like);
  return { topics: topics.slice(0, 8), questions, pyqs, current_affairs: ca, tests, library };
});
route('GET', '/api/library', ONB, (c) => {
  const items = db.prepare('SELECT id,kind,ref_id,title,body,created_at FROM bookmarks WHERE user_id=? ORDER BY id DESC LIMIT 200').all(c.user.id);
  const mistakes = db.prepare('SELECT COUNT(*) c FROM mistakes WHERE user_id=? AND exam_id=? AND resolved=0').get(c.user.id, c.user.exam_id).c;
  return { bookmarks: items.filter(i => ['question', 'pyq', 'ai', 'revision'].includes(i.kind)), notes: items.filter(i => i.kind === 'note'), saved_ca: items.filter(i => i.kind === 'ca'),
    mistakes_open: mistakes, revision_items: revisionQueue(c.user, loadExam(c.user.exam_id)) };
});
route('POST', '/api/bookmarks', ONB, (c) => {
  const { kind, ref_id, title, body } = c.body;
  if (!['question', 'pyq', 'ca', 'note', 'ai', 'revision'].includes(kind)) throw bad('Invalid bookmark type.');
  const ref = String(ref_id ?? crypto.randomUUID()); const ex = db.prepare('SELECT id FROM bookmarks WHERE user_id=? AND kind=? AND ref_id=?').get(c.user.id, kind, ref);
  if (ex && kind !== 'note') { db.prepare('DELETE FROM bookmarks WHERE id=?').run(ex.id); return { saved: false }; }
  db.prepare('INSERT OR REPLACE INTO bookmarks (user_id,kind,ref_id,title,body,created_at) VALUES (?,?,?,?,?,?)').run(c.user.id, kind, ref, String(title || '').slice(0, 200), String(body || '').slice(0, 8000), now());
  return { saved: true };
});
route('DELETE', '/api/bookmarks/:id', ONB, (c) => { db.prepare('DELETE FROM bookmarks WHERE id=? AND user_id=?').run(+c.params.id, c.user.id); return { ok: true }; });

// ---------- AI routes ----------
route('POST', '/api/ai/ask', ONB, (c) => guarded(c.user, 'ask', async () => {
  const exam = loadExam(c.user.exam_id), msg = String(c.body.message || '').trim().slice(0, 4000), mode = c.body.mode;
  const files = mediaBlocks(c.body.files);
  if (!msg && !files.length && !MODE_HINT[mode]) throw bad('Type a question or upload an image.');
  const hist = db.prepare('SELECT role,content FROM ai_conversations WHERE user_id=? AND exam_id=? ORDER BY id DESC LIMIT 6').all(c.user.id, exam.id).reverse();
  let text = MODE_HINT[mode] ? `${MODE_HINT[mode]}${msg ? '\nStudent note: ' + msg : ''}` : msg;
  if (files.length) text = `The student uploaded ${files.length > 1 ? 'files' : 'a file'} containing an exam question. Read it carefully, identify the subject and topic, solve it, explain, and give the final answer. If the content is blurry, cropped, or otherwise not clearly readable, reply with exactly: "Please upload a clearer image so I can solve it accurately." and nothing else. Never guess unreadable content.\n${msg}`;
  const messages = [...hist.map(h => ({ role: h.role, content: h.content })), { role: 'user', content: files.length ? [...files, { type: 'text', text }] : text }];
  const r = await ai.callClaude({ system: ai.TUTOR_SYSTEM(tutorCtx(c.user, exam)), messages, maxTokens: 2000 });
  if (!r.ok) throw new HttpError(502, ai.friendlyError(r.error), { retry: true, code: r.error });
  const saveUser = msg || (files.length ? '[uploaded file]' : MODE_HINT[mode]);
  db.prepare('INSERT INTO ai_conversations (user_id,exam_id,role,content,created_at) VALUES (?,?,?,?,?)').run(c.user.id, exam.id, 'user', saveUser, now());
  const id = Number(db.prepare('INSERT INTO ai_conversations (user_id,exam_id,role,content,created_at) VALUES (?,?,?,?,?)').run(c.user.id, exam.id, 'assistant', r.text, now()).lastInsertRowid);
  return { id, reply: r.text };
}));
route('GET', '/api/ai/history', ONB, (c) => ({ messages: db.prepare('SELECT id,role,content,created_at FROM ai_conversations WHERE user_id=? AND exam_id=? ORDER BY id DESC LIMIT 40').all(c.user.id, c.user.exam_id).reverse() }));
route('POST', '/api/ai/clear', ONB, (c) => { db.prepare('DELETE FROM ai_conversations WHERE user_id=? AND exam_id=?').run(c.user.id, c.user.exam_id); return { ok: true }; });

route('POST', '/api/ai/generate', ONB, (c) => guarded(c.user, 'gen', async () => {
  const exam = loadExam(c.user.exam_id); let { subject, topic } = c.body;
  const count = Math.min(Math.max(+c.body.count || 5, 1), 10), difficulty = ['easy', 'medium', 'hard'].includes(c.body.difficulty) ? c.body.difficulty : 'medium';
  let focus = '';
  if (!subject) { const w = weakTopics(c.user, exam, 1)[0]; if (w) { subject = w.subject; topic = w.topic; focus = 'the student keeps getting this topic wrong'; } }
  const s = exam.syllabus.find(x => x.subject === subject); if (!s) throw bad('Choose a subject from your exam.');
  if (!topic || !s.topics.includes(topic)) throw bad('Choose a topic from your syllabus.');
  const mistakes = db.prepare('SELECT q.text FROM mistakes m JOIN questions q ON q.id=m.question_id WHERE m.user_id=? AND q.subject=? AND q.topic=? ORDER BY m.updated_at DESC LIMIT 2').all(c.user.id, subject, topic).map(x => x.text);
  if (mistakes.length) focus += (focus ? '; ' : '') + 'recent mistakes were like: ' + mistakes.join(' | ');
  const r = await ai.generateQuestions({ examName: exam.name, subject, topic, difficulty, count, weakNote: focus, level: c.user.level });
  if (!r.ok) throw new HttpError(502, r.error === 'AI_INVALID' ? 'The AI response was not valid. Please try again.' : ai.friendlyError(r.error), { retry: true, code: r.error });
  return { questions: storeAiQuestions(c.user, exam, r.questions).map(pubQ), dropped_invalid: r.dropped, label: 'AI Generated Practice' };
}));
route('POST', '/api/ai/notes', ONB, (c) => guarded(c.user, 'notes', async () => {
  const exam = loadExam(c.user.exam_id), { kind, subject, topic } = c.body;
  const s = exam.syllabus.find(x => x.subject === subject); if (!s || !s.topics.includes(topic)) throw bad('Choose a subject and topic from your syllabus.');
  const KINDS = { short: 'concise short notes', revision: 'revision notes with key points and common traps', formula: 'a formula sheet (only if the topic has formulas; otherwise key facts)', summary: 'a topic summary', facts: 'a list of important facts', onepage: 'a one-page revision sheet', flashcards: 'flashcards in the form "Q: ...\\nA: ..." (10 cards)' };
  if (!KINDS[kind]) throw bad('Unknown material type.');
  const r = await ai.callClaude({ system: ai.TUTOR_SYSTEM(tutorCtx(c.user, exam)), maxTokens: 1800, messages: [{ role: 'user', content: `Create ${KINDS[kind]} for ${subject} → ${topic}, tailored to ${exam.name} and a ${c.user.level} student. Only include facts you are confident are correct.` }] });
  if (!r.ok) throw new HttpError(502, ai.friendlyError(r.error), { retry: true });
  return { text: r.text, label: 'AI Generated' };
}));
route('POST', '/api/ai/paper-parse', ONB, (c) => guarded(c.user, 'paper', async () => {
  const exam = loadExam(c.user.exam_id), text = String(c.body.text || '').slice(0, 60001);
  if (text.length > 60000) throw bad('This paper is too long to process at once. Please upload it section by section.');
  const files = mediaBlocks(c.body.files); if (!text && !files.length) throw bad('Upload a question paper (image or PDF) or paste its text.');
  const sys = `You extract questions from an uploaded exam paper. Output ONLY JSON: {"readable":boolean,"sections":[{"name":string,"questions":[{"no":string,"text":string,"options":[strings],"subject":string,"topic":string,"difficulty":"easy|medium|hard"}]}]}.
Copy question text exactly; never invent or guess unreadable content (if the paper is not clearly readable set readable=false). Maximum 40 questions per call; if more exist, extract the first 40.`;
  const r = await ai.callClaude({ system: sys, maxTokens: 6000, timeoutMs: 90000, messages: [{ role: 'user', content: [...files, { type: 'text', text: text || 'Extract the questions from the attached paper.' }] }] });
  if (!r.ok) throw new HttpError(502, ai.friendlyError(r.error), { retry: true });
  const j = ai.extractJson(r.text);
  if (!j || j.readable === false || !Array.isArray(j.sections)) throw bad('Please upload a clearer image so I can solve it accurately.');
  const secs = j.sections.map(s => ({ name: String(s.name || 'Section').slice(0, 80), questions: (s.questions || []).filter(q => q && q.text).slice(0, 40).map(q => ({ no: String(q.no || ''), text: String(q.text).slice(0, 2000), options: Array.isArray(q.options) ? q.options.map(String).slice(0, 6) : [], subject: String(q.subject || ''), topic: String(q.topic || ''), difficulty: ['easy', 'medium', 'hard'].includes(q.difficulty) ? q.difficulty : 'medium' })) }));
  const freq = {}; for (const s of secs) for (const q of s.questions) if (q.topic) freq[q.topic] = (freq[q.topic] || 0) + 1;
  return { sections: secs, important_topics: Object.entries(freq).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([topic, n]) => ({ topic, questions: n })), hard: secs.flatMap(s => s.questions.filter(q => q.difficulty === 'hard').map(q => q.no)) };
}));
route('POST', '/api/ai/solve-question', ONB, (c) => guarded(c.user, 'solveq', async () => {
  const exam = loadExam(c.user.exam_id), text = String(c.body.text || '').trim().slice(0, 3000); if (!text) throw bad('Missing question.');
  const opts = Array.isArray(c.body.options) ? c.body.options.slice(0, 6).map((o, i) => `${String.fromCharCode(65 + i)}. ${o}`).join('\n') : '';
  const r = await ai.callClaude({ system: ai.TUTOR_SYSTEM(tutorCtx(c.user, exam)), maxTokens: 1500, messages: [{ role: 'user', content: `Solve this question and explain:\n${text}\n${opts}` }] });
  if (!r.ok) throw new HttpError(502, ai.friendlyError(r.error), { retry: true });
  return { reply: r.text };
}));
route('POST', '/api/ai/ca-explain', ONB, (c) => guarded(c.user, 'ca', async () => {
  const exam = loadExam(c.user.exam_id), item = db.prepare('SELECT * FROM current_affairs WHERE id=?').get(+c.body.id); if (!item) throw new HttpError(404, 'Item not found.');
  const r = await ai.callClaude({ system: ai.TUTOR_SYSTEM(tutorCtx(c.user, exam)), maxTokens: 1000, messages: [{ role: 'user', content: `Explain this news item using ONLY the text provided (do not add new facts about the event). Then explain why it matters and how it connects to ${exam.name}, and list 2 likely exam angles.\nTitle: ${item.title}\nCategory: ${item.category}\nSummary: ${item.summary}` }] });
  if (!r.ok) throw new HttpError(502, ai.friendlyError(r.error), { retry: true });
  return { reply: r.text };
}));
route('POST', '/api/ai/ca-quiz', ONB, (c) => guarded(c.user, 'caq', async () => {
  const exam = loadExam(c.user.exam_id);
  const items = db.prepare("SELECT title,summary FROM current_affairs WHERE (exams='ALL' OR (',' || exams || ',') LIKE ?) ORDER BY COALESCE(event_date,'') DESC, id DESC LIMIT 8").all('%,' + exam.id + ',%');
  if (!items.length) throw bad('No current-affairs items have been added yet, so there is nothing to build a quiz from.');
  const subject = exam.subjects.includes('General Awareness') ? 'General Awareness' : exam.subjects[0];
  const r = await ai.generateQuestions({ examName: exam.name, subject, topic: exam.syllabus.find(s => s.subject === subject).topics.includes('Current Affairs') ? 'Current Affairs' : exam.syllabus.find(s => s.subject === subject).topics[0], difficulty: 'medium', count: Math.min(items.length * 2, 8), level: c.user.level,
    weakNote: 'Base every question ONLY on this material, no outside facts:\n' + items.map(i => `- ${i.title}: ${i.summary}`).join('\n') });
  if (!r.ok) throw new HttpError(502, ai.friendlyError(r.error), { retry: true });
  return { questions: storeAiQuestions(c.user, exam, r.questions).map(pubQ) };
}));
route('POST', '/api/ai/feedback', ONB, (c) => {
  const kind = c.body.kind; if (!['helpful', 'not_helpful', 'report'].includes(kind)) throw bad('Invalid feedback.');
  db.prepare('INSERT INTO ai_feedback (user_id,conversation_id,kind,note,created_at) VALUES (?,?,?,?,?)').run(c.user.id, +c.body.conversation_id || null, kind, String(c.body.note || '').slice(0, 1000), now());
  return { ok: true };
});

// ---------- admin ----------
route('GET', '/api/admin/stats', ADM, () => ({ users: db.prepare('SELECT COUNT(*) c FROM users').get().c, questions: db.prepare('SELECT source_type, COUNT(*) c FROM questions GROUP BY 1').all(), exams: db.prepare('SELECT COUNT(*) c FROM exams').get().c, open_reports: db.prepare("SELECT COUNT(*) c FROM ai_feedback WHERE kind='report' AND status='open'").get().c }));
route('POST', '/api/admin/exams', ADM, (c) => {
  const b = c.body, id = String(b.id || '').toUpperCase().replace(/[^A-Z0-9_]/g, '').slice(0, 30);
  if (!id || !b.name || !b.category) throw bad('id, name and category are required.');
  const sections = (b.sections || []).map(s => ({ subject: String(s.subject), questions: +s.questions, marks: +s.marks, negative: +s.negative || 0 }));
  if (!sections.length || sections.some(s => !s.subject || !(s.questions > 0) || !(s.marks > 0))) throw bad('Provide at least one valid section (subject, questions, marks).');
  const pattern = { minutes: Math.max(1, +b.minutes || 60), sections, note: null };
  const syllabus = sections.map(s => ({ subject: s.subject, topics: (b.syllabus && b.syllabus[s.subject]) || TOPICS[s.subject] || ['General'] }));
  db.prepare('INSERT INTO exams (id,name,category,pattern,syllabus,verified) VALUES (?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET name=?,category=?,pattern=?,syllabus=?,verified=?')
    .run(id, b.name, b.category, JSON.stringify(pattern), JSON.stringify(syllabus), b.verified ? 1 : 0, b.name, b.category, JSON.stringify(pattern), JSON.stringify(syllabus), b.verified ? 1 : 0);
  return { ok: true, id };
});
route('POST', '/api/admin/questions', ADM, (c) => {
  const list = Array.isArray(c.body.questions) ? c.body.questions : [c.body], meta = Array.isArray(c.body.questions) ? c.body : {};
  if (list.length > 300) throw bad('Add at most 300 questions per request.');
  const ins = db.prepare(`INSERT INTO questions (exam_id,subject,topic,difficulty,text,options,answer,explanation,concept,tip,source_type,pyq_year,pyq_paper,pyq_shift,source_ref,created_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`);
  const added = [], errors = [];
  list.forEach((x, i) => {
    const m = { ...meta, ...x }, type = m.source_type || 'ADMIN_PRACTICE';
    try {
      if (!['ADMIN_PRACTICE', 'VERIFIED_PYQ', 'PYQ_PATTERN'].includes(type)) throw new Error('source_type must be ADMIN_PRACTICE, VERIFIED_PYQ or PYQ_PATTERN');
      const v = ai.validateQuestion({ ...m, difficulty: m.difficulty || 'medium' }, {}); if (!v) throw new Error('invalid question (need text, 2-6 distinct options, valid answer index, explanation, subject, topic, difficulty)');
      if (m.exam_id && !loadExam(m.exam_id)) throw new Error('unknown exam_id');
      if (type !== 'ADMIN_PRACTICE' && !m.exam_id) throw new Error('exam_id required for PYQ / PYQ-pattern questions');
      if (type === 'VERIFIED_PYQ' && !(m.pyq_year && m.pyq_paper && m.source_ref)) throw new Error('VERIFIED_PYQ needs pyq_year, pyq_paper and source_ref');
      const id = ins.run(m.exam_id || null, v.subject, v.topic, v.difficulty, v.text, JSON.stringify(v.options), v.answer, v.explanation, v.concept, v.tip, type, m.pyq_year ? +m.pyq_year : null, m.pyq_paper || null, m.pyq_shift || null, m.source_ref || null, now()).lastInsertRowid;
      added.push(Number(id));
    } catch (e) { errors.push({ index: i, error: e.message }); }
  });
  return { added: added.length, ids: added, errors };
});
route('POST', '/api/admin/ca', ADM, (c) => {
  const b = c.body; if (!b.title || !b.summary || !CA_CATS.includes(b.category)) throw bad('title, summary and a valid category are required.');
  const exams = b.exams === 'ALL' || !b.exams ? 'ALL' : ',' + [].concat(b.exams).join(',') + ',';
  const id = db.prepare('INSERT INTO current_affairs (title,summary,category,exams,event_date,source,created_at) VALUES (?,?,?,?,?,?,?)').run(String(b.title).slice(0, 300), String(b.summary).slice(0, 4000), b.category, exams, b.event_date || null, b.source || null, now()).lastInsertRowid;
  return { id: Number(id) };
});
route('DELETE', '/api/admin/ca/:id', ADM, (c) => { db.prepare('DELETE FROM current_affairs WHERE id=?').run(+c.params.id); return { ok: true }; });
route('POST', '/api/admin/ca/refresh', ADM, async () => {
  return await refreshCurrentAffairsFeeds();
});

route('GET', '/api/admin/reports', ADM, () => ({ reports: db.prepare(`SELECT f.id,f.kind,f.note,f.status,f.created_at,u.email, c.content answer,
  (SELECT content FROM ai_conversations p WHERE p.user_id=c.user_id AND p.id<c.id AND p.role='user' ORDER BY p.id DESC LIMIT 1) question
  FROM ai_feedback f JOIN users u ON u.id=f.user_id LEFT JOIN ai_conversations c ON c.id=f.conversation_id WHERE f.kind='report' ORDER BY f.status='open' DESC, f.id DESC LIMIT 100`).all() }));
route('POST', '/api/admin/reports/:id/resolve', ADM, (c) => { db.prepare("UPDATE ai_feedback SET status='resolved' WHERE id=?").run(+c.params.id); return { ok: true }; });
route('GET', '/api/admin/questions', ADM, (c) => {
  const limit = Math.min(+c.query.limit || 25, 100), offset = +c.query.offset || 0; const p = [], w = ["source_type!='AI_GENERATED'"];
  if (c.query.source) { w.push('source_type=?'); p.push(c.query.source); } if (c.query.subject) { w.push('subject=?'); p.push(c.query.subject); }
  return { questions: db.prepare(`SELECT * FROM questions WHERE ${w.join(' AND ')} ORDER BY id DESC LIMIT ? OFFSET ?`).all(...p, limit, offset).map(fullQ) };
});
route('DELETE', '/api/admin/questions/:id', ADM, (c) => { db.prepare("DELETE FROM questions WHERE id=? AND source_type!='AI_GENERATED'").run(+c.params.id); return { ok: true }; });

// ---------- automatic current-affairs refresh ----------
let caRefreshBusy = false;
async function refreshCurrentAffairsAuto(days, maxItems) {
  if (caRefreshBusy || !ai.aiEnabled() || ai.aiProvider() !== 'gemini' || !ai.generateCurrentAffairs) return;
  caRefreshBusy = true;
  try {
    const examIds = listExams().map(e => e.id);
    if (!examIds.length) return;
    const r = await ai.generateCurrentAffairs({ today: dayStr(), days, examList: examIds, maxItems });
    if (!r.ok) { console.error('[ca-refresh]', r.error); return; }
    for (const x of r.items || []) {
      const exists = db.prepare('SELECT id FROM current_affairs WHERE title=? AND event_date=?').get(x.title, x.event_date);
      if (exists) continue;
      try {
        const exams = ',' + [...new Set(x.exams)].join(',') + ',';
        db.prepare('INSERT INTO current_affairs (title,summary,category,exams,event_date,source,created_at) VALUES (?,?,?,?,?,?,?)')
          .run(x.title, x.summary, x.category, exams, x.event_date, x.source_url, now());
      } catch (e) { console.error('[ca-refresh-insert]', e.message); }
    }
  } finally {
    caRefreshBusy = false;
  }
}
// ---------- low-cost official current-affairs feed ingestion ----------
const CA_FEEDS = [
  { name: 'Press Information Bureau', url: 'https://pib.gov.in/RssMain.aspx?ModId=6&Lang=1&Regid=3' },
  { name: 'Reserve Bank of India', url: 'https://www.rbi.org.in/Scripts/RSS.aspx?Id=6' }
];
function xmlText(value) {
  return String(value || '').replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/<[^>]*>/g, ' ').replace(/&nbsp;|&#160;/gi, ' ')
    .replace(/&amp;/gi, '&').replace(/&quot;/gi, '"').replace(/&#39;|&apos;/gi, "'")
    .replace(/&lt;/gi, '<').replace(/&gt;/gi, '>')
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Math.min(0x10ffff, +n)))
    .replace(/\s+/g, ' ').trim();
}
function xmlField(block, tag) {
  const m = block.match(new RegExp('<' + tag + '(?:\s[^>]*)?>([\s\S]*?)<\/' + tag + '>', 'i'));
  return m ? xmlText(m[1]) : '';
}
function caCategory(title, summary, feed) {
  const t = (title + ' ' + summary).toLowerCase();
  if (/rbi|reserve bank|inflation|gdp|repo rate|banking|economy|trade|finance|budget/.test(t)) return 'Economy';
  if (/defen[cs]e|army|navy|air force|missile|military|exercise/.test(t)) return 'Defence';
  if (/space|isro|science|technology|quantum|satellite|research|digital/.test(t)) return 'Science & Technology';
  if (/climate|environment|forest|wildlife|renewable|pollution/.test(t)) return 'Environment';
  if (/sport|cricket|hockey|olympic|medal|tournament/.test(t)) return 'Sports';
  if (/award|prize|honour/.test(t)) return 'Awards';
  if (/appointed|appointment|chairman|chief justice|governor|president of/.test(t)) return 'Appointments';
  if (/scheme|yojana|benefit|launched.*scheme/.test(t)) return 'Government Schemes';
  if (/international|bilateral|united nations|world bank|imf|summit|foreign minister/.test(t)) return 'International';
  return feed === 'Press Information Bureau' ? 'National' : 'Economy';
}
async function refreshCurrentAffairsFeeds() {
  const results = [];
  let added = 0, skipped = 0, failed = 0;
  for (const feed of CA_FEEDS) {
    try {
      const response = await fetch(feed.url, { headers: { 'user-agent': 'CompetitiveExamAI/1.0 (official public RSS reader)', accept: 'application/rss+xml, application/xml, text/xml' }, signal: AbortSignal.timeout(9000) });
      if (!response.ok) throw new Error('HTTP ' + response.status);
      const xml = await response.text();
      const entries = [...xml.matchAll(/<(item|entry)\b[^>]*>([\s\S]*?)<\/(?:item|entry)>/gi)].slice(0, 40);
      let feedAdded = 0;
      for (const [, , block] of entries) {
        const title = xmlField(block, 'title').slice(0, 300);
        if (!title) continue;
        const summary = (xmlField(block, 'description') || xmlField(block, 'summary') || xmlField(block, 'content')).slice(0, 4000) || title;
        const link = xmlField(block, 'link') || ((block.match(/<link\b[^>]*href=["']([^"']+)/i) || [])[1] || '');
        const pub = xmlField(block, 'pubDate') || xmlField(block, 'published') || xmlField(block, 'updated');
        const parsedDate = pub ? Date.parse(pub) : NaN;
        const eventDate = Number.isFinite(parsedDate) ? dayStr(parsedDate) : dayStr();
        if (eventDate < dayStr(now() - 7 * DAY) || eventDate > dayStr(now() + DAY)) { skipped++; continue; }
        if (db.prepare('SELECT id FROM current_affairs WHERE title=? AND event_date=?').get(title, eventDate)) { skipped++; continue; }
        const category = caCategory(title, summary, feed.name);
        try {
          db.prepare('INSERT INTO current_affairs (title,summary,category,exams,event_date,source,created_at) VALUES (?,?,?,?,?,?,?)')
            .run(title, summary, category, 'ALL', eventDate, (link && /^https?:\/\//i.test(link)) ? link : feed.name, now());
          added++; feedAdded++;
        } catch (e) { if (!/unique|constraint/i.test(e.message)) console.error('[ca-feed-insert]', e.message); skipped++; }
      }
      results.push({ source: feed.name, fetched: entries.length, added: feedAdded });
    } catch (e) {
      failed++; results.push({ source: feed.name, error: e.message });
      console.error('[ca-feed]', feed.name, e.message);
    }
  }
  return { ok: failed < CA_FEEDS.length, added, skipped, failed, sources: results, updated: dayStr() };
}
let caFeedRefreshBusy = false;
async function runCaFeedRefresh() {
  if (caFeedRefreshBusy) return;
  caFeedRefreshBusy = true;
  try { await refreshCurrentAffairsFeeds(); }
  catch (e) { console.error('[ca-feed-refresh]', e.message); }
  finally { caFeedRefreshBusy = false; }
}
function startCurrentAffairsAutoRefresh() {
  // Official RSS only: no AI calls. Refresh at startup and every 6 hours.
  setTimeout(() => runCaFeedRefresh(), 15000);
  setInterval(() => runCaFeedRefresh(), 6 * 60 * 60 * 1000);
}

// ---------- request hardening ----------
const MUTATING = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);
function requestOrigin(req) {
  const proto = String(req.headers['x-forwarded-proto'] || (req.socket.encrypted ? 'https' : 'http')).split(',')[0].trim();
  const host = String(req.headers.host || '').trim().toLowerCase();
  return host ? proto + '://' + host : null;
}
function enforceSameOrigin(req, userPresent) {
  if (!userPresent || !MUTATING.has(req.method)) return;
  if (String(req.headers['sec-fetch-site'] || '').toLowerCase() === 'cross-site') throw new HttpError(403, 'Cross-site request blocked.');
  const target = requestOrigin(req);
  const origin = String(req.headers.origin || '').trim();
  if (origin) {
    if (origin !== target) throw new HttpError(403, 'Cross-origin request blocked.');
    return;
  }
  const referer = String(req.headers.referer || '').trim();
  if (referer) {
    try { if (new URL(referer).origin !== target) throw new HttpError(403, 'Cross-origin request blocked.'); }
    catch (e) { if (e instanceof HttpError) throw e; throw new HttpError(403, 'Request origin could not be verified.'); }
    return;
  }
  throw new HttpError(403, 'Request origin could not be verified.');
}
function validFileSignature(mediaType, data) {
  try {
    const b = Buffer.from(data, 'base64');
    if (mediaType === 'image/png') return b.subarray(0, 8).toString('hex') === '89504e470d0a1a0a';
    if (mediaType === 'image/jpeg') return b.subarray(0, 3).toString('hex') === 'ffd8ff';
    if (mediaType === 'image/webp') return b.subarray(0, 4).toString('ascii') === 'RIFF' && b.subarray(8, 12).toString('ascii') === 'WEBP';
    if (mediaType === 'application/pdf') return b.subarray(0, 5).toString('ascii') === '%PDF-';
  } catch {}
  return false;
}
// ---------- http plumbing ----------
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png', '.ico': 'image/x-icon', '.json': 'application/json' };
const PUB = path.join(__dirname, 'public');
const SEC = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), payment=(), usb=()',
  'Cross-Origin-Opener-Policy': 'same-origin',
  'Cross-Origin-Resource-Policy': 'same-origin',
  'Content-Security-Policy': "default-src 'self'; base-uri 'none'; object-src 'none'; img-src 'self' data: blob:; style-src 'self' 'unsafe-inline'; script-src 'self'; connect-src 'self'; frame-ancestors 'none'; form-action 'self'"
};
function responseHeaders(extra = {}) {
  return { ...SEC, ...(PROD ? { 'Strict-Transport-Security': 'max-age=31536000; includeSubDomains' } : {}), ...extra };
}

function readBody(req, limit = 2e6) {
  return new Promise((resolve, reject) => {
    let size = 0; const chunks = [];
    req.on('data', d => { size += d.length; if (size > limit) { reject(new HttpError(413, 'That upload is too large.')); req.destroy(); } else chunks.push(d); });
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    req.on('error', reject);
  });
}
function send(res, status, obj) { const body = JSON.stringify(obj); res.writeHead(status, { ...responseHeaders(), 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' }); res.end(body); }

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://x'); const ip = req.socket.remoteAddress;
  try {
    if (url.pathname.startsWith('/api/')) {
      const method = req.method; let matched = null, params = {};
      for (const r of routes) { if (r.method !== method) continue; const m = r.re.exec(url.pathname); if (m) { matched = r; params = m.groups || {}; break; } }
      if (!matched) return send(res, 404, { error: 'Not found' });
      const user = getUser(req);
      enforceSameOrigin(req, !!user);
      if (matched.opts.auth && !user) return send(res, 401, { error: 'Please log in.' });
      if (matched.opts.admin && user.role !== 'admin') return send(res, 403, { error: 'Admins only.' });
      if (matched.opts.onboarded && !user.onboarded) return send(res, 409, { error: 'Please finish setting up your profile.', code: 'ONBOARDING' });
      let body = {};
      if (method !== 'GET' && method !== 'DELETE') {
        if (!/application\/json/.test(req.headers['content-type'] || '')) throw bad('Expected JSON.');
        const bodyLimit = ['/api/ai/paper-parse', '/api/ai/solve-question', '/api/ai/notes'].includes(url.pathname) ? 16e6 : 2e6;
        const raw = await readBody(req, bodyLimit); try { body = raw ? JSON.parse(raw) : {}; } catch { throw bad('Invalid JSON.'); }
      }
      const out = await matched.fn({ req, res, user, body, params, query: Object.fromEntries(url.searchParams), ip });
      return send(res, 200, out);
    }
    // static
    let p = decodeURIComponent(url.pathname); if (p === '/' || !path.extname(p)) p = '/index.html';
    const file = path.join(PUB, path.normalize(p));
    if (!file.startsWith(PUB + path.sep)) { res.writeHead(403); return res.end(); }
    fs.readFile(file, (err, data) => {
      if (err) { res.writeHead(404, SEC); return res.end('Not found'); }
      res.writeHead(200, { ...responseHeaders({ 'content-type': MIME[path.extname(file)] || 'application/octet-stream', 'cache-control': 'no-cache' }) }); res.end(data);
    });
  } catch (e) {
    if (e instanceof HttpError) return send(res, e.status, { error: e.message, ...(e.extra || {}) });
    console.error('[error]', req.method, url.pathname, e);
    send(res, 500, { error: 'Something went wrong. Please try again.', retry: true }); // never leak internals; app stays up
  }
});
process.on('uncaughtException', e => console.error('[uncaught]', e));
process.on('unhandledRejection', e => console.error('[unhandled]', e));
server.listen(PORT, () => { console.log(`Competitive Exam AI running on http://localhost:${PORT}  (AI ${ai.aiEnabled() ? 'enabled' : 'NOT configured'})`); startCurrentAffairsAutoRefresh(); });
module.exports = { server };