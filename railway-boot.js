const fs = require('fs');
const path = require('path');

const p = path.join(__dirname, 'server.js');
let s = fs.readFileSync(p, 'utf8');

function replaceOnce(find, repl, label) {
  const next = s.replace(find, repl);
  if (next === s) throw new Error('Boot repair failed: ' + label);
  s = next;
}

// Repair malformed password hashing helper.
const hs = s.indexOf('function hashPassword(password) {');
const he = s.indexOf('function getUser(req) {', hs);
if (hs < 0 || he < 0) throw new Error('Boot repair failed: auth helper block not found');
s = s.slice(0, hs) + [
  'function hashPassword(password) {',
  '  const salt = crypto.randomBytes(16);',
  '  const derived = crypto.scryptSync(password, salt, 64, { N: 16384, r: 8, p: 1 });',
  "  return 'scrypt:' + salt.toString('base64url') + ':' + derived.toString('base64url');",
  '}',
  'function verifyPassword(stored, password) {',
  '  try {',
  "    const [scheme, saltText, hashText] = String(stored || '').split(':');",
  "    if (scheme !== 'scrypt' || !saltText || !hashText) return false;",
  "    const salt = Buffer.from(saltText, 'base64url');",
  "    const expected = Buffer.from(hashText, 'base64url');",
  "    const actual = crypto.scryptSync(password, salt, expected.length, { N: 16384, r: 8, p: 1 });",
  '    return expected.length === actual.length && crypto.timingSafeEqual(expected, actual);',
  '  } catch { return false; }',
  '}',
  ''
].join('\n') + s.slice(he);

// Restore password login/setup.
const logoutMarker = "route('POST', '/api/auth/logout'";
if (!s.includes("/api/auth/login")) {
  const auth = [
    "route('POST', '/api/auth/login', {}, (c) => {",
    "  const email = String(c.body.email || '').trim().toLowerCase();",
    "  const password = String(c.body.password || '');",
    "  if (!EMAIL_RE.test(email) || !password) throw bad('Enter your email and password.');",
    "  rateLimit('login:' + c.ip, 20, 3600000);",
    "  const u = db.prepare('SELECT * FROM users WHERE email=?').get(email);",
    "  if (!u) throw new HttpError(401, 'Incorrect email or password.');",
    "  if (!u.password_hash) throw new HttpError(409, 'This account needs a one-time email verification before password login.', { code: 'PASSWORD_SETUP_REQUIRED' });",
    "  if (!verifyPassword(u.password_hash, password)) throw new HttpError(401, 'Incorrect email or password.');",
    "  newSession(c.res, u.id);",
    "  return { user: meJson(u) };",
    '});',
    "route('POST', '/api/auth/set-password', A, (c) => {",
    "  validatePassword(String(c.body.password || ''), String(c.body.confirm_password || ''));",
    "  db.prepare('UPDATE users SET password_hash=? WHERE id=?').run(hashPassword(String(c.body.password)), c.user.id);",
    "  const u = db.prepare('SELECT * FROM users WHERE id=?').get(c.user.id);",
    "  return { user: meJson(u) };",
    '});',
    ''
  ].join('\n');
  const pos = s.indexOf(logoutMarker);
  if (pos < 0) throw new Error('Boot repair failed: logout route not found');
  s = s.slice(0, pos) + auth + s.slice(pos);
}

// OTP purpose and password flag.
replaceOnce(
  "const email = String(c.body.email || '').trim().toLowerCase(), code = String(c.body.code || '').trim();",
  "const email = String(c.body.email || '').trim().toLowerCase(), code = String(c.body.code || '').trim(), purpose = String(c.body.purpose || 'signup');",
  'OTP purpose'
);
replaceOnce(
  "return { user: meJson(u), is_new: isNew };",
  "return { user: meJson(u), is_new: isNew, needs_password: purpose === 'reset' || !u.password_hash };",
  'OTP password flag'
);

// Enforce the 20-question minimum for every non-full-exam test.
const guard = "if (!qs.length) throw bad('No questions are available yet for this selection. Try another subject/topic, or generate questions with the AI Tutor.');";
if (s.includes(guard) && !s.includes('Every test needs at least 20 questions')) {
  s = s.replace(guard, guard + "\n  if (kind !== 'full_mock' && qs.length < 20) throw bad('Every test needs at least 20 questions. Add more questions or choose a larger set.');");
}
s = s.replace("const count = Math.min(Math.max(+b.count || 10, 1), 100);", "const count = Math.min(Math.max(+b.count || 20, 20), 100);");
s = s.replace("const requestedTotal = Math.min(100, Math.max(1, +b.count || patternTotal));", "const requestedTotal = kind === 'sectional' ? Math.max(20, patternTotal) : patternTotal;");

fs.writeFileSync(p, s);
require('./server.js');
