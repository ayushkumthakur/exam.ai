// End-to-end smoke test. Usage: BASE=http://localhost:3111 node tests/smoke.js
const BASE = process.env.BASE || 'http://localhost:3111';
let cookie = '', fails = 0;
async function api(method, url, body, opts = {}) {
  const r = await fetch(BASE + url, { method, headers: { 'content-type': 'application/json', origin: BASE, ...(opts.nocookie ? {} : { cookie }) }, body: body ? JSON.stringify(body) : undefined });
  const sc = r.headers.get('set-cookie'); if (sc && !opts.nocookie) cookie = sc.split(';')[0];
  return { status: r.status, data: await r.json().catch(() => ({})) };
}
const ok = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) fails++; };
(async () => {
  const email = `s${Date.now()}@test.com`;
  ok((await api('GET', '/api/home')).status === 401, 'unauthenticated home blocked');
  const headerCheck = await fetch(BASE + '/api/config');
  ok(headerCheck.headers.get('x-content-type-options') === 'nosniff' && headerCheck.headers.get('x-frame-options') === 'DENY',
    'security headers protect API responses');
  ok(Boolean(headerCheck.headers.get('content-security-policy')), 'content security policy present');
  const malformedPath = await fetch(BASE + '/%E0%A4%A');
  ok(malformedPath.status === 400, 'malformed URL encoding rejected safely');
  const sourceProbe = await fetch(BASE + '/server.js');
  ok(sourceProbe.status === 404, 'server source file is not publicly served');
  // Seed enough admin questions: every test needs at least 20 questions.
  const pw0 = process.env.SMOKE_ADMIN_PASSWORD || 'Test@12345', adminEmail = 'admin@x.com';
  let ar = await api('POST', '/api/auth/signup', { email: adminEmail, password: pw0, confirm_password: pw0 });
  if (ar.status === 409) ar = await api('POST', '/api/auth/login', { email: adminEmail, password: pw0 });
  let seeded = 0;
  for (let i = 0; i < 20; i++) {
    const q = await api('POST', '/api/admin/questions', { exam_id: 'SSC_CHSL', subject: 'Quantitative Aptitude', topic: 'Percentage', difficulty: 'easy', text: `Smoke question ${Date.now()}-${i}: what is ${10 + i}% of 200?`, options: [String(2 * (10 + i)), String(3 * (10 + i)), String(4 * (10 + i)), String(5 * (10 + i))], answer: 0, explanation: `${10 + i}% of 200 equals ${10 + i} x 2 = ${2 * (10 + i)}.`, source_type: 'ADMIN_PRACTICE' });
    if (q.status === 200) seeded++;
  }
  ok(seeded === 20, 'admin can add practice questions (20 seeded)');
  await api('POST', '/api/auth/logout', {});
  cookie = '';
  const pw = 'Test@12345';
  let r = await api('POST', '/api/auth/signup', { email: 'bad', password: pw, confirm_password: pw }); ok(r.status === 400, 'invalid email rejected');
  r = await api('POST', '/api/auth/signup', { email, password: 'abc', confirm_password: 'abc' }); ok(r.status === 400, 'weak password rejected');
  r = await api('POST', '/api/auth/signup', { email, password: pw, confirm_password: pw + 'x' }); ok(r.status === 400, 'mismatched confirm password rejected');
  // Browser cross-site requests must be rejected even before a session exists.
  const csrf = await fetch(BASE + '/api/auth/signup', { method: 'POST', headers: { 'content-type': 'application/json', origin: 'https://attacker.invalid', 'sec-fetch-site': 'cross-site' }, body: JSON.stringify({ email: `csrf${Date.now()}@test.com`, password: pw, confirm_password: pw }) });
  ok(csrf.status === 403, 'cross-site signup request rejected before session creation');
  r = await api('POST', '/api/auth/signup', { email, password: pw, confirm_password: pw }); ok(r.status === 200 && r.data.user && r.data.user.email === email, 'signup creates account + session');
  r = await api('POST', '/api/auth/signup', { email, password: pw, confirm_password: pw }, { nocookie: true }); ok(r.status === 409, 'duplicate signup rejected');
  const oldSessionCookie = cookie;
  await api('POST', '/api/auth/logout', {});
  ok((await api('GET', '/api/me')).data.user === null, 'logout clears session cookie');
  cookie = oldSessionCookie;
  ok((await api('GET', '/api/me')).data.user === null, 'logout revokes server-side session token');
  cookie = '';
  r = await api('POST', '/api/auth/login', { email, password: 'Wrong@12345' }); ok(r.status === 401, 'wrong password rejected');
  r = await api('POST', '/api/auth/login', { email, password: pw }); ok(r.status === 200 && r.data.user, 'login with correct password');
  const missingOrigin = await fetch(BASE + '/api/me', {
    method: 'PUT',
    headers: { 'content-type': 'application/json', cookie },
    body: JSON.stringify({ name: 'Should be blocked' })
  });
  ok(missingOrigin.status === 403, 'authenticated mutation without origin is rejected');
  ok((await api('GET', '/api/home')).status === 409, 'home blocked until onboarding');
  ok((await api('GET', '/api/admin/stats')).status === 403, 'student cannot reach admin');
  const fut = new Date(Date.now() + 120 * 864e5).toISOString().slice(0, 10);
  r = await api('POST', '/api/me/onboarding', { name: 'Ayush', exam_id: 'SSC_CHSL', level: 'Intermediate', target_date: fut, daily_minutes: 120 }); ok(r.status === 200 && r.data.user.onboarded, 'onboarding');
  r = await api('GET', '/api/home'); ok(r.data.exam.id === 'SSC_CHSL' && r.data.days_left >= 119 && r.data.recommendation.cta, 'home personalised + one recommendation');
  r = await api('GET', '/api/practice/questions?subject=Mathematics'); ok(r.status === 400, 'SSC CHSL cannot pull Mathematics (not in its pattern)');
  r = await api('GET', '/api/practice/questions?subject=Quantitative%20Aptitude&limit=20'); ok(r.data.questions.length > 0 && !('answer' in r.data.questions[0]), 'practice questions hide answers');
  const qs = r.data.questions;
  r = await api('POST', '/api/practice/answer', { question_id: qs[0].id, choice: 0, time_ms: 5000 }); ok(r.status === 200 && r.data.explanation, 'answer returns explanation');
  // force a wrong answer to test mistake analysis
  let wrong; for (const q of qs) { const a = await api('POST', '/api/practice/answer', { question_id: q.id, choice: 3 }); if (!a.data.correct) { wrong = a.data; break; } }
  ok(wrong && wrong.mistake && wrong.mistake.how_to_avoid, 'mistake analysis present');
  r = await api('GET', '/api/mistakes'); ok(r.data.total >= 1, 'mistake stored');
  r = await api('GET', '/api/practice/smart');
  ok(r.status === 200 && r.data.exam_id === 'SSC_CHSL' && ['easy', 'medium', 'hard'].includes(r.data.difficulty) &&
    ['adaptive', 'baseline'].includes(r.data.strategy) && r.data.subject, 'Smart Practice selects exam-safe adaptive plan');
  const smartQs = await api('GET', '/api/practice/questions' + '?' + new URLSearchParams({
    subject: r.data.subject, ...(r.data.topic ? { topic: r.data.topic } : {}), difficulty: r.data.difficulty, limit: '20'
  }).toString());
  ok(smartQs.status === 200 && smartQs.data.questions.every(q => q.subject === r.data.subject &&
    (!r.data.topic || q.topic === r.data.topic)), 'Smart Practice questions match the recommended topic');
  // NDA user must never see SSC-only content: switch exam, history preserved
  r = await api('PUT', '/api/me', { exam_id: 'NDA' }); ok(r.data.user.exam_id === 'NDA', 'change exam');
  r = await api('GET', '/api/mistakes'); ok(r.data.total === 0, 'exams do not mix: SSC mistakes not shown under NDA');
  r = await api('PUT', '/api/me', { exam_id: 'SSC_CHSL' }); r = await api('GET', '/api/mistakes'); ok(r.data.total >= 1, 'history preserved after switching back');
  // test flow
  r = await api('POST', '/api/tests/create', { kind: 'pyq' }); ok(r.status === 400, 'PYQ test refused when no verified PYQs exist (no mislabelling)');
  const fullMock = await api('POST', '/api/tests/create', { kind: 'full_mock', mode: 'real', difficulty: 'hard', minutes: 5 });
  if (fullMock.status === 200 && Number.isInteger(fullMock.data.id)) {
    const fullMockTest = await api('GET', '/api/tests/' + fullMock.data.id);
    const pattern = (await api('GET', '/api/exams/SSC_CHSL')).data.exam.pattern;
    const expectedCount = pattern.sections.reduce((n, s) => n + s.questions, 0);
    ok(fullMockTest.status === 200 && fullMockTest.data.test.questions.length === expectedCount,
      'full mock contains the complete exam pattern');
    ok(fullMockTest.data.test.blueprint?.questionCount === expectedCount && fullMockTest.data.test.blueprint.sections.length === pattern.sections.length,
      'full mock returns a persisted section-by-section paper blueprint');
    ok(fullMockTest.data.test.blueprint.mode === 'real' && fullMockTest.data.test.blueprint.timedSections === false,
      'real mock defaults to fixed difficulty and only uses verified sectional timers');
    ok(fullMockTest.data.test.minutes === pattern.minutes, 'real mock ignores custom duration and keeps the official paper duration');
    await api('POST', '/api/tests/' + fullMock.data.id + '/submit', { answers: {} });
  } else {
    ok(fullMock.status === 400 && /complete/i.test(fullMock.data.error || ''),
      'incomplete full mock is rejected instead of being mislabeled');
  }
  r = await api('POST', '/api/tests/create', { kind: 'topic', subject: 'Quantitative Aptitude', topic: 'Percentage', count: 20 });
  ok(r.status === 200 && Number.isInteger(r.data.id), `create topic test (HTTP ${r.status}${r.data.error ? `: ${r.data.error}` : ''})`);
  if (r.status !== 200 || !Number.isInteger(r.data.id)) {
    console.error('Topic test creation response:', JSON.stringify(r.data));
  } else {
  const tid = r.data.id;
  r = await api('GET', '/api/tests/' + tid); ok(r.status === 200 && r.data.test?.questions?.length > 0 && !('answer' in r.data.test.questions[0]), 'test hides answers while active');
  const q0 = r.data.test.questions[0];
  r = await api('PUT', `/api/tests/${tid}/save`, { answers: { [q0.id]: 1 }, marked: [q0.id], current_idx: 0, times: { [q0.id]: 4000 } }); ok(r.data.ok, 'autosave');
  r = await api('GET', '/api/tests/' + tid); ok(r.data.test.answers[q0.id] === 1 && r.data.test.marked.map(String).includes(String(q0.id)), 'resume preserves answers + marks');
  const [s1, s2] = await Promise.all([api('POST', `/api/tests/${tid}/submit`, { answers: { [q0.id]: 1 } }), api('POST', `/api/tests/${tid}/submit`, { answers: { [q0.id]: 1 } })]);
  ok(s1.status === 200 && s2.status === 200 && s1.data.test.result.score === s2.data.test.result.score, 'duplicate submit is idempotent');
  const cnt = (await api('GET', '/api/progress')).data; ok(cnt.analyst.length > 0, 'progress analyst');
  ok(s1.data.test.result.coaching.went_well.length > 0 && s1.data.test.questions[0].explanation, 'result has coaching + review');
  r = await api('GET', '/api/plan'); ok(r.data.plan.tasks.length >= 2, 'daily plan');
  r = await api('GET', '/api/search?q=percent'); ok(r.data.topics.length > 0, 'search finds topics');
  r = await api('POST', '/api/ai/ask', { message: 'hi' }); ok(r.status === 502 && /not configured/.test(r.data.error), 'AI unconfigured fails gracefully');
  r = await api('GET', '/api/pyq/analysis'); ok(r.data.sufficient === false, 'no trend claims from insufficient PYQ data');
  }
  r = await api('POST', '/api/auth/logout', {}); r = await api('GET', '/api/me'); ok(r.data.user === null, 'logout');
  // admin
  cookie = ''; const ae = 'admin@x.com'; r = await api('POST', '/api/auth/login', { email: ae, password: process.env.SMOKE_ADMIN_PASSWORD || pw });
  ok(r.data.user && r.data.user.role === 'admin', 'admin role via ADMIN_EMAILS');
  r = await api('POST', '/api/admin/questions', { exam_id: 'SSC_CHSL', subject: 'English', topic: 'Grammar', difficulty: 'easy', text: 'Pick the correct spelling:', options: ['Recieve', 'Receive'], answer: 1, explanation: 'i before e except after c.', source_type: 'VERIFIED_PYQ' }); ok(r.data.errors.length === 1, 'VERIFIED_PYQ without source metadata rejected');
  r = await api('POST', '/api/admin/questions', { exam_id: 'SSC_CHSL', subject: 'English', topic: 'Grammar', difficulty: 'easy', text: 'Pick the correct spelling:', options: ['Recieve', 'Receive', 'Recieved', 'Receeve'], answer: 1, explanation: 'Receive is the correct spelling; i comes after c.', source_type: 'VERIFIED_PYQ', pyq_year: 2024, pyq_paper: 'Tier-I', source_ref: 'javascript:alert(1)' }); ok(r.data.errors.length === 1 && /HTTPS URL/.test(r.data.errors[0].error), 'verified PYQ rejects non-HTTPS source links');
  r = await api('POST', '/api/admin/exams', { id: 'MY_EXAM', name: 'My Exam', category: 'Other', minutes: 30, sections: [{ subject: 'Reasoning', questions: 20, marks: 1, negative: 0.25 }] }); ok(r.data.ok, 'admin can add exam');
  console.log(fails ? `\n${fails} FAILED` : '\nALL PASSED'); process.exit(fails ? 1 : 0);
})();