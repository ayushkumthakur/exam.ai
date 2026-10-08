'use strict';
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const db = require('./db');
const { slugify } = require('./seed');

const PORT = Number(process.env.PORT || 3000);
const PROD = process.env.NODE_ENV === 'production';
const ADMIN_EMAILS = (process.env.ADMIN_EMAILS || '').toLowerCase().split(',').map(s => s.trim()).filter(Boolean);
const OTP_TTL_MS = 5 * 60 * 1000;
const OTP_RESEND_MS = 30 * 1000;
const OTP_MAX_ATTEMPTS = 5;
const OTP_MAX_PER_HOUR = 5;
const SESSION_TTL_MS = 30 * 24 * 3600 * 1000;
const PUBLIC_DIR = path.join(__dirname, '..', 'public');

const now = () => Date.now();
const sha = s => crypto.createHash('sha256').update(s).digest('hex');
const emailRe = /^[^\s@]{1,64}@[^\s@]{1,255}\.[^\s@]{2,}$/;
const dayKey = (t = now()) => new Date(t + 5.5 * 3600 * 1000).toISOString().slice(0, 10); // IST day

class HttpError extends Error { constructor(status, msg, extra) { super(msg); this.status = status; this.extra = extra; } }

// ---------- tiny in-memory IP rate limiter (OTP endpoints) ----------
const ipHits = new Map();
function ipLimit(ip, max = 30, windowMs = 3600 * 1000) {
  const t = now();
  const arr = (ipHits.get(ip) || []).filter(x => t - x < windowMs);
  if (arr.length >= max) throw new HttpError(429, 'Too many requests. Please try again later.');
  arr.push(t); ipHits.set(ip, arr);
}

// ---------- email delivery ----------
async function sendOtpEmail(email, code) {
  const key = process.env.RESEND_API_KEY;
  if (!key) { console.log(`[dev] OTP for ${email}: ${code}`); return { delivered: false }; }
  const r = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from: process.env.MAIL_FROM || 'Competitive Exam AI <onboarding@resend.dev>',
      to: [email],
      subject: `Your Competitive Exam AI code: ${code}`,
      text: `Your verification code is ${code}. It expires in 5 minutes. If you didn't request it, ignore this email.`,
    }),
    signal: AbortSignal.timeout(10000),
  });
  if (!r.ok) throw new Error('mail provider error ' + r.status);
  return { delivered: true };
}

// ---------- http helpers ----------
function send(res, status, body, headers = {}) {
  const data = JSON.stringify(body);
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', ...headers });
  res.end(data);
}
function readJson(req) {
  return new Promise((resolve, reject) => {
    let size = 0; const chunks = [];
    req.on('data', c => { size += c.length; if (size > 100_000) { reject(new HttpError(413, 'Request too large')); req.destroy(); } else chunks.push(c); });
    req.on('end', () => {
      if (!chunks.length) return resolve({});
      try { resolve(JSON.parse(Buffer.concat(chunks).toString('utf8'))); } catch { reject(new HttpError(400, 'Invalid JSON')); }
    });
    req.on('error', reject);
  });
}
function cookies(req) {
  const out = {};
  (req.headers.cookie || '').split(';').forEach(p => { const i = p.indexOf('='); if (i > 0) out[p.slice(0, i).trim()] = decodeURIComponent(p.slice(i + 1).trim()); });
  return out;
}
function sessionCookie(req, token, maxAgeSec) {
  const secure = PROD || req.headers['x-forwarded-proto'] === 'https';
  return `sid=${token}; HttpOnly; SameSite=Lax; Path=/; Max-Age=${maxAgeSec}${secure ? '; Secure' : ''}`;
}
function currentUser(req) {
  const tok = cookies(req).sid;
  if (!tok) return null;
  const row = db.prepare(`SELECT u.id,u.email,u.name,u.role,s.expires_at FROM sessions s JOIN users u ON u.id=s.user_id WHERE s.token_hash=?`).get(sha(tok));
  if (!row) return null;
  if (row.expires_at < now()) { db.prepare('DELETE FROM sessions WHERE token_hash=?').run(sha(tok)); return null; }
  return row;
}
function requireUser(req) { const u = currentUser(req); if (!u) throw new HttpError(401, 'Please log in.'); return u; }
function requireAdmin(req) { const u = requireUser(req); if (u.role !== 'admin') throw new HttpError(403, 'Admin access required.'); return u; }

// ---------- domain helpers ----------
function getProfile(userId) {
  return db.prepare(`SELECT p.*, e.name AS exam_name, e.category AS exam_category FROM profiles p LEFT JOIN exams e ON e.id=p.exam_id WHERE p.user_id=?`).get(userId) || null;
}
function daysUntil(dateStr) {
  if (!dateStr) return null;
  const d = new Date(dateStr + 'T00:00:00+05:30').getTime();
  return Math.max(0, Math.ceil((d - now()) / 86400000));
}
function validateProfile(b, partial) {
  const out = {};
  if (b.exam_id !== undefined) {
    const ex = db.prepare('SELECT id FROM exams WHERE id=? AND active=1').get(Number(b.exam_id));
    if (!ex) throw new HttpError(400, 'Unknown exam.');
    out.exam_id = ex.id;
  } else if (!partial) throw new HttpError(400, 'Please select an exam.');
  if (b.level !== undefined) { if (!['beginner', 'intermediate', 'advanced'].includes(b.level)) throw new HttpError(400, 'Invalid level.'); out.level = b.level; }
  else if (!partial) throw new HttpError(400, 'Please select your preparation level.');
  if (b.target_date !== undefined) {
    if (b.target_date !== null && b.target_date !== '') {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(b.target_date) || isNaN(Date.parse(b.target_date))) throw new HttpError(400, 'Invalid target date.');
      if (new Date(b.target_date + 'T23:59:59+05:30').getTime() < now()) throw new HttpError(400, 'Target date must be in the future.');
      out.target_date = b.target_date;
    } else out.target_date = null;
  } else if (!partial) throw new HttpError(400, 'Please choose a target exam date.');
  if (b.daily_hours !== undefined) { const h = Number(b.daily_hours); if (![1, 2, 3, 4, 5].includes(h)) throw new HttpError(400, 'Invalid daily study time.'); out.daily_hours = h; }
  else if (!partial) throw new HttpError(400, 'Please choose your daily study time.');
  if (b.stage !== undefined && b.stage !== null) { if (!['just_started', 'preparing', 'revision'].includes(b.stage)) throw new HttpError(400, 'Invalid stage.'); out.stage = b.stage; }
  return out;
}
function cleanName(n) { return String(n || '').replace(/[<>]/g, '').trim().slice(0, 60); }

function syllabus(examId) {
  const subs = db.prepare('SELECT id,name FROM subjects WHERE exam_id=? ORDER BY position,id').all(examId);
  const tq = db.prepare('SELECT id,name FROM topics WHERE subject_id=? ORDER BY position,id');
  return subs.map(s => ({ id: s.id, name: s.name, topics: tq.all(s.id) }));
}
function flatTopics(examId) {
  const syl = syllabus(examId); const out = []; let i = 0, more = true;
  while (more) { more = false; for (const s of syl) if (s.topics[i]) { out.push({ subject: s.name, topic: s.topics[i].name, topic_id: s.topics[i].id }); more = true; } i++; }
  return out; // interleaved across subjects so no subject dominates a week
}
function topicStats(userId, examId) {
  return db.prepare(`SELECT ts.topic_id, t.name AS topic, s.name AS subject, ts.attempted, ts.correct, ts.last_practiced
    FROM topic_stats ts JOIN topics t ON t.id=ts.topic_id JOIN subjects s ON s.id=t.subject_id
    WHERE ts.user_id=? AND ts.exam_id=?`).all(userId, examId);
}
const MIN_SAMPLE = 5; // never call a topic weak/strong from fewer attempts
function weakTopics(stats) {
  return stats.filter(s => s.attempted >= MIN_SAMPLE).map(s => ({ ...s, accuracy: Math.round(100 * s.correct / s.attempted) }))
    .filter(s => s.accuracy < 60).sort((a, b) => a.accuracy - b.accuracy);
}
function round5(n) { return Math.max(10, Math.round(n / 5) * 5); }

function buildPlan(user, profile, offsetDays = 0) {
  const topics = flatTopics(profile.exam_id);
  const total = (profile.daily_hours || 2) * 60;
  const startDay = Math.floor(new Date(dayKey(user.created_at ?? now())).getTime() / 86400000);
  const today = Math.floor(new Date(dayKey()).getTime() / 86400000);
  const idx = (today - startDay + offsetDays);
  const n = topics.length || 1;
  const pick = i => topics[((i % n) + n) % n];
  const weak = weakTopics(topicStats(user.id, profile.exam_id));
  const learn = pick(idx * 2), learn2 = pick(idx * 2 + 1);
  // Revise a weak topic if one is proven weak; otherwise something studied earlier; on day 1 just recap today's topic.
  const rev = weak.length ? { subject: weak[0].subject, topic: weak[0].topic, recap: false }
    : idx >= 1 ? { ...pick(idx * 2 - 2), recap: false } : { ...learn, recap: true };
  const ca = db.prepare(`SELECT 1 FROM subjects WHERE exam_id=? AND (name LIKE '%Current%' OR name LIKE '%General%') LIMIT 1`).get(profile.exam_id);
  // Shares sum to 100%; each block rounded to 5 min, then the largest block absorbs the rounding so the total never exceeds the student's time.
  const shares = ca ? { learn: 0.35, practice: 0.30, revision: 0.15, mistakes: 0.10, current_affairs: 0.10 } : { learn: 0.38, practice: 0.32, revision: 0.18, mistakes: 0.12 };
  const mins = {}; let used = 0;
  for (const k of Object.keys(shares)) { mins[k] = Math.max(5, Math.round(total * shares[k] / 5) * 5); used += mins[k]; }
  mins.learn = Math.max(5, mins.learn + (total - used));
  const items = [
    { type: 'learn', title: `Learn: ${learn?.topic}`, subject: learn?.subject, minutes: mins.learn },
    { type: 'practice', title: `Practice: ${learn?.topic}`, subject: learn?.subject, minutes: mins.practice },
    { type: 'revision', title: rev.recap ? `Quick recap: ${rev.topic}` : `Revise: ${rev.topic}`, subject: rev.subject, minutes: mins.revision },
    { type: 'mistakes', title: 'Review your mistakes', minutes: mins.mistakes },
  ];
  if (ca) items.push({ type: 'current_affairs', title: 'Current affairs', minutes: mins.current_affairs });
  return items;
}

// ---------- route handlers ----------
const routes = [];
const route = (method, pattern, fn) => routes.push({ method, re: new RegExp('^' + pattern.replace(/:(\w+)/g, '(?<$1>[^/]+)') + '$'), fn });

route('POST', '/api/auth/send-otp', async (req, res, ctx) => {
  ipLimit(ctx.ip, 20);
  const email = String(ctx.body.email || '').trim().toLowerCase();
  if (!emailRe.test(email)) throw new HttpError(400, 'Please enter a valid email address.');
  const last = db.prepare('SELECT created_at FROM otps WHERE email=? ORDER BY created_at DESC LIMIT 1').get(email);
  if (last && now() - last.created_at < OTP_RESEND_MS) {
    const wait = Math.ceil((OTP_RESEND_MS - (now() - last.created_at)) / 1000);
    throw new HttpError(429, `Please wait ${wait}s before requesting another code.`, { resendIn: wait });
  }
  const hourly = db.prepare('SELECT COUNT(*) c FROM otps WHERE email=? AND created_at>?').get(email, now() - 3600000).c;
  if (hourly >= OTP_MAX_PER_HOUR) throw new HttpError(429, 'Too many codes requested. Try again in an hour.');
  const code = String(crypto.randomInt(0, 1_000_000)).padStart(6, '0');
  const salt = crypto.randomBytes(8).toString('hex');
  db.prepare('UPDATE otps SET used=1 WHERE email=? AND used=0').run(email);
  db.prepare('INSERT INTO otps (email,code_hash,salt,expires_at,created_at) VALUES (?,?,?,?,?)').run(email, sha(salt + code), salt, now() + OTP_TTL_MS, now());
  let mail;
  try { mail = await sendOtpEmail(email, code); }
  catch (e) { console.error('mail error', e.message); throw new HttpError(502, 'We could not send the email right now. Please try again.'); }
  const body = { ok: true, expiresIn: OTP_TTL_MS / 1000, resendIn: OTP_RESEND_MS / 1000 };
  if (!mail.delivered && !PROD) { body.devOtp = code; body.devNote = 'No email provider configured (set RESEND_API_KEY). Dev mode only.'; }
  send(res, 200, body);
});

route('POST', '/api/auth/verify-otp', async (req, res, ctx) => {
  ipLimit(ctx.ip, 60);
  const email = String(ctx.body.email || '').trim().toLowerCase();
  const code = String(ctx.body.code || '').trim();
  if (!emailRe.test(email) || !/^\d{6}$/.test(code)) throw new HttpError(400, 'Enter the 6-digit code.');
  const otp = db.prepare('SELECT * FROM otps WHERE email=? AND used=0 ORDER BY created_at DESC LIMIT 1').get(email);
  if (!otp) throw new HttpError(400, 'No active code. Please request a new one.', { code: 'NO_OTP' });
  if (otp.expires_at < now()) throw new HttpError(400, 'This code has expired. Please request a new one.', { code: 'EXPIRED' });
  if (otp.attempts >= OTP_MAX_ATTEMPTS) throw new HttpError(429, 'Too many wrong attempts. Please request a new code.', { code: 'LOCKED' });
  const ok = crypto.timingSafeEqual(Buffer.from(sha(otp.salt + code)), Buffer.from(otp.code_hash));
  if (!ok) {
    db.prepare('UPDATE otps SET attempts=attempts+1 WHERE id=?').run(otp.id);
    const left = OTP_MAX_ATTEMPTS - otp.attempts - 1;
    throw new HttpError(400, left > 0 ? `Incorrect code. ${left} attempt${left === 1 ? '' : 's'} left.` : 'Too many wrong attempts. Please request a new code.', { code: 'INVALID', attemptsLeft: left });
  }
  db.prepare('UPDATE otps SET used=1 WHERE id=?').run(otp.id);
  let user = db.prepare('SELECT * FROM users WHERE email=?').get(email);
  let isNew = false;
  if (!user) {
    const r = db.prepare('INSERT INTO users (email,role,created_at) VALUES (?,?,?)').run(email, ADMIN_EMAILS.includes(email) ? 'admin' : 'student', now());
    user = db.prepare('SELECT * FROM users WHERE id=?').get(r.lastInsertRowid); isNew = true;
  } else if (ADMIN_EMAILS.includes(email) && user.role !== 'admin') {
    db.prepare("UPDATE users SET role='admin' WHERE id=?").run(user.id);
  }
  const token = crypto.randomBytes(32).toString('hex');
  db.prepare('INSERT INTO sessions (token_hash,user_id,expires_at,created_at) VALUES (?,?,?,?)').run(sha(token), user.id, now() + SESSION_TTL_MS, now());
  db.prepare('DELETE FROM sessions WHERE expires_at<?').run(now());
  const prof = getProfile(user.id);
  send(res, 200, { ok: true, isNew, onboarded: !!prof?.onboarded }, { 'Set-Cookie': sessionCookie(req, token, SESSION_TTL_MS / 1000) });
});

route('POST', '/api/auth/logout', async (req, res) => {
  const tok = cookies(req).sid;
  if (tok) db.prepare('DELETE FROM sessions WHERE token_hash=?').run(sha(tok));
  send(res, 200, { ok: true }, { 'Set-Cookie': sessionCookie(req, '', 0) });
});

route('GET', '/api/me', async (req, res) => {
  const u = currentUser(req);
  if (!u) return send(res, 200, { user: null });
  send(res, 200, { user: { id: u.id, email: u.email, name: u.name, role: u.role }, profile: getProfile(u.id) });
});

route('GET', '/api/exams', async (req, res) => {
  const rows = db.prepare('SELECT id,category,name,duration_min,total_questions,total_marks,negative_marking,pattern_verified,pattern_note FROM exams WHERE active=1 ORDER BY category,name').all();
  const groups = {};
  for (const r of rows) (groups[r.category] ||= []).push(r);
  send(res, 200, { groups: Object.entries(groups).map(([category, exams]) => ({ category, exams })) });
});

route('GET', '/api/syllabus', async (req, res) => {
  const u = requireUser(req); const p = getProfile(u.id);
  if (!p?.exam_id) throw new HttpError(400, 'Select an exam first.');
  send(res, 200, { exam: db.prepare('SELECT * FROM exams WHERE id=?').get(p.exam_id), subjects: syllabus(p.exam_id) });
});

route('PUT', '/api/profile', async (req, res, ctx) => {
  const u = requireUser(req);
  const existing = getProfile(u.id);
  const b = ctx.body;
  if (b.name !== undefined) {
    const nm = cleanName(b.name);
    if (!nm) throw new HttpError(400, 'Please enter your name.');
    db.prepare('UPDATE users SET name=? WHERE id=?').run(nm, u.id);
  }
  const onboarding = !existing?.onboarded;
  const v = validateProfile(b, !onboarding);
  if (onboarding && !(b.name || u.name)) throw new HttpError(400, 'Please enter your name.');
  if (!existing) db.prepare('INSERT INTO profiles (user_id,updated_at) VALUES (?,?)').run(u.id, now());
  const cols = Object.keys(v);
  if (cols.length) db.prepare(`UPDATE profiles SET ${cols.map(c => c + '=?').join(',')}, updated_at=? WHERE user_id=?`).run(...cols.map(c => v[c]), now(), u.id);
  if (onboarding) db.prepare('UPDATE profiles SET onboarded=1 WHERE user_id=?').run(u.id);
  send(res, 200, { ok: true, profile: getProfile(u.id) });
});

route('POST', '/api/profile/reset', async (req, res) => {
  const u = requireUser(req);
  // Resets preferences only. Practice history (topic_stats/activity) is never touched here.
  db.prepare('UPDATE profiles SET onboarded=0, level=NULL, target_date=NULL, daily_hours=NULL, stage=NULL, updated_at=? WHERE user_id=?').run(now(), u.id);
  send(res, 200, { ok: true });
});

route('GET', '/api/dashboard', async (req, res) => {
  const u = requireUser(req); const p = getProfile(u.id);
  if (!p?.onboarded) throw new HttpError(409, 'Please finish onboarding.', { code: 'ONBOARDING' });
  const stats = topicStats(u.id, p.exam_id);
  const attempted = stats.reduce((a, s) => a + s.attempted, 0);
  const correct = stats.reduce((a, s) => a + s.correct, 0);
  const weak = weakTopics(stats).slice(0, 5);
  const plan = buildPlan({ id: u.id, created_at: db.prepare('SELECT created_at FROM users WHERE id=?').get(u.id).created_at }, p);
  const practiceMin = plan.find(i => i.type === 'practice')?.minutes || 30;
  const targetQuestions = Math.round(practiceMin / 1.5);
  const todayRow = db.prepare('SELECT questions,correct FROM activity WHERE user_id=? AND day=?').get(u.id, dayKey()) || { questions: 0, correct: 0 };
  // streak: consecutive days (ending today or yesterday) with at least one question
  const days = new Set(db.prepare('SELECT day FROM activity WHERE user_id=? AND questions>0').all(u.id).map(r => r.day));
  let streak = 0; let t = now();
  if (!days.has(dayKey(t))) t -= 86400000;
  while (days.has(dayKey(t))) { streak++; t -= 86400000; }

  let rec;
  if (weak.length) {
    const w = weak[0];
    rec = { headline: `Your ${w.topic} accuracy is ${w.accuracy}%.`, detail: `Recommended: revise ${w.topic} (${w.subject}) for ${plan.find(i => i.type === 'revision').minutes} minutes.`, cta: 'Start Revision', route: 'revision' };
  } else if (attempted === 0) {
    const first = plan[0];
    rec = { headline: "Let's find your starting point.", detail: `Begin with ${first.title.replace('Learn: ', '')} (${first.subject}). Your weak topics will appear here once you've practised enough questions.`, cta: 'Start Learning', route: 'practice' };
  } else {
    rec = { headline: 'You are on track.', detail: `Continue with: ${plan[0].title.replace('Learn: ', '')}.`, cta: 'Practice Now', route: 'practice' };
  }
  send(res, 200, {
    greetingName: u.name, exam: { id: p.exam_id, name: p.exam_name, category: p.exam_category },
    daysRemaining: daysUntil(p.target_date), targetDate: p.target_date,
    today: { targetQuestions, solved: todayRow.questions, minutes: (p.daily_hours || 0) * 60 },
    recommendation: rec, plan, weakTopics: weak,
    totals: { questionsSolved: attempted, accuracy: attempted >= MIN_SAMPLE ? Math.round(100 * correct / attempted) : null, streak },
    notYetAvailable: ['upcomingTest', 'currentAffairsFeed', 'recentPerformance'],
  });
});

route('GET', '/api/study-plan', async (req, res) => {
  const u = requireUser(req); const p = getProfile(u.id);
  if (!p?.onboarded) throw new HttpError(409, 'Please finish onboarding.');
  const created = db.prepare('SELECT created_at FROM users WHERE id=?').get(u.id).created_at;
  const week = [];
  for (let d = 0; d < 7; d++) week.push({ date: dayKey(now() + d * 86400000), items: buildPlan({ id: u.id, created_at: created }, p, d) });
  send(res, 200, { exam: p.exam_name, dailyMinutes: p.daily_hours * 60, daysRemaining: daysUntil(p.target_date), week });
});

// ----- admin: exams are expandable without code changes -----
route('POST', '/api/admin/exams', async (req, res, ctx) => {
  requireAdmin(req);
  const b = ctx.body;
  const name = String(b.name || '').trim().slice(0, 80), category = String(b.category || '').trim().slice(0, 40);
  if (!name || !category) throw new HttpError(400, 'name and category are required.');
  const slug = slugify(name);
  if (db.prepare('SELECT 1 FROM exams WHERE slug=?').get(slug)) throw new HttpError(409, 'An exam with this name already exists.');
  const num = k => (b[k] === undefined || b[k] === null || b[k] === '' ? null : Number(b[k]));
  const r = db.prepare('INSERT INTO exams (category,name,slug,duration_min,total_questions,total_marks,negative_marking,pattern_verified,pattern_note) VALUES (?,?,?,?,?,?,?,?,?)')
    .run(category, name, slug, num('duration_min'), num('total_questions'), num('total_marks'), num('negative_marking'), b.pattern_verified ? 1 : 0, String(b.pattern_note || '').slice(0, 300));
  send(res, 201, { ok: true, id: r.lastInsertRowid });
});
route('POST', '/api/admin/exams/:id/subjects', async (req, res, ctx) => {
  requireAdmin(req);
  const ex = db.prepare('SELECT id FROM exams WHERE id=?').get(Number(ctx.params.id));
  if (!ex) throw new HttpError(404, 'Exam not found.');
  const name = String(ctx.body.name || '').trim().slice(0, 80);
  if (!name) throw new HttpError(400, 'name is required.');
  const pos = db.prepare('SELECT COALESCE(MAX(position),-1)+1 p FROM subjects WHERE exam_id=?').get(ex.id).p;
  const r = db.prepare('INSERT INTO subjects (exam_id,name,position) VALUES (?,?,?)').run(ex.id, name, pos);
  send(res, 201, { ok: true, id: r.lastInsertRowid });
});
route('POST', '/api/admin/subjects/:id/topics', async (req, res, ctx) => {
  requireAdmin(req);
  const s = db.prepare('SELECT id FROM subjects WHERE id=?').get(Number(ctx.params.id));
  if (!s) throw new HttpError(404, 'Subject not found.');
  const name = String(ctx.body.name || '').trim().slice(0, 100);
  if (!name) throw new HttpError(400, 'name is required.');
  const pos = db.prepare('SELECT COALESCE(MAX(position),-1)+1 p FROM topics WHERE subject_id=?').get(s.id).p;
  const r = db.prepare('INSERT INTO topics (subject_id,name,position) VALUES (?,?,?)').run(s.id, name, pos);
  send(res, 201, { ok: true, id: r.lastInsertRowid });
});
route('PATCH', '/api/admin/exams/:id', async (req, res, ctx) => {
  requireAdmin(req);
  const r = db.prepare('UPDATE exams SET active=? WHERE id=?').run(ctx.body.active ? 1 : 0, Number(ctx.params.id));
  if (!r.changes) throw new HttpError(404, 'Exam not found.');
  send(res, 200, { ok: true });
});

// ---------- static files ----------
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png', '.ico': 'image/x-icon', '.json': 'application/json' };
function serveStatic(req, res, pathname) {
  let rel = decodeURIComponent(pathname);
  if (rel === '/' || !path.extname(rel)) rel = '/index.html';
  const file = path.normalize(path.join(PUBLIC_DIR, rel));
  if (!file.startsWith(PUBLIC_DIR + path.sep)) { res.writeHead(403); return res.end('Forbidden'); }
  fs.readFile(file, (err, data) => {
    if (err) { res.writeHead(404, { 'Content-Type': 'text/plain' }); return res.end('Not found'); }
    res.writeHead(200, { 'Content-Type': MIME[path.extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-cache' });
    res.end(data);
  });
}

const server = http.createServer(async (req, res) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'same-origin');
  res.setHeader('Content-Security-Policy', "default-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; frame-ancestors 'none'");
  const url = new URL(req.url, 'http://x');
  try {
    if (!url.pathname.startsWith('/api/')) return serveStatic(req, res, url.pathname);
    const method = req.method;
    if (method !== 'GET') {
      const origin = req.headers.origin;
      if (origin && new URL(origin).host !== req.headers.host) throw new HttpError(403, 'Cross-origin request blocked.');
    }
    for (const r of routes) {
      if (r.method !== method) continue;
      const m = r.re.exec(url.pathname);
      if (!m) continue;
      const ctx = { params: m.groups || {}, ip: req.socket.remoteAddress || 'ip', body: {} };
      if (method !== 'GET') {
        if (!String(req.headers['content-type'] || '').startsWith('application/json') && Number(req.headers['content-length'] || 0) > 0) throw new HttpError(415, 'Use application/json.');
        ctx.body = await readJson(req);
      }
      return await r.fn(req, res, ctx);
    }
    throw new HttpError(404, 'Not found');
  } catch (e) {
    if (e instanceof HttpError) return send(res, e.status, { error: e.message, ...(e.extra || {}) });
    console.error(e);
    send(res, 500, { error: 'Something went wrong. Please try again.' });
  }
});

if (require.main === module) server.listen(PORT, () => console.log(`Competitive Exam AI running on http://localhost:${PORT}`));
module.exports = server;