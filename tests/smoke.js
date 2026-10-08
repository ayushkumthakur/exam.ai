// End-to-end smoke test. Usage: BASE=http://localhost:3111 node tests/smoke.js
const BASE = process.env.BASE || 'http://localhost:3111';
let cookie = '', fails = 0;
async function api(method, url, body, opts = {}) {
  const r = await fetch(BASE + url, { method, headers: { 'content-type': 'application/json', ...(opts.nocookie ? {} : { cookie }) }, body: body ? JSON.stringify(body) : undefined });
  const sc = r.headers.get('set-cookie'); if (sc && !opts.nocookie) cookie = sc.split(';')[0];
  return { status: r.status, data: await r.json().catch(() => ({})) };
}
const ok = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) fails++; };
(async () => {
  const email = `s${Date.now()}@test.com`;
  ok((await api('GET', '/api/home')).status === 401, 'unauthenticated home blocked');
  let r = await api('POST', '/api/auth/send-otp', { email: 'bad', purpose: 'signup' }); ok(r.status === 400, 'invalid email rejected');
  r = await api('POST', '/api/auth/send-otp', { email, purpose: 'signup' }); ok(r.status === 200 && r.data.dev_otp, 'send signup otp');
  const code = r.data.dev_otp;
  r = await api('POST', '/api/auth/send-otp', { email, purpose: 'signup' }); ok(r.status === 429, 'resend throttled');
  r = await api('POST', '/api/auth/verify-otp', { email, code: code === '000000' ? '111111' : '000000', purpose: 'signup' }); ok(r.status === 400, 'wrong otp rejected');
  r = await api('POST', '/api/auth/verify-otp', { email, code, purpose: 'signup' }); ok(r.status === 200 && r.data.is_new && r.data.needs_password, 'verify otp -> new user + password setup');
  r = await api('POST', '/api/auth/set-password', { password: 'TestPass123!', confirm_password: 'TestPass123!' }); ok(r.status === 200, 'set password');
  r = await api('POST', '/api/auth/logout', {}); r = await api('GET', '/api/me'); ok(r.data.user === null, 'logout after signup');
  r = await api('POST', '/api/auth/login', { email, password: 'wrong-pass' }); ok(r.status === 401 && r.data.code === 'INVALID_LOGIN', 'wrong password rejected');
  r = await api('POST', '/api/auth/login', { email, password: 'TestPass123!' }); ok(r.status === 200 && r.data.user.email === email, 'password login works');
  r = await api('POST', '/api/auth/logout', {});
  r = await api('POST', '/api/auth/send-otp', { email, purpose: 'reset' }); ok(r.status === 200 && r.data.dev_otp, 'send reset otp');
  const resetCode = r.data.dev_otp;
  r = await api('POST', '/api/auth/verify-otp', { email, code: resetCode, purpose: 'reset' }); ok(r.status === 200 && r.data.needs_password, 'reset otp verified');
  r = await api('POST', '/api/auth/set-password', { password: 'NewPass123!', confirm_password: 'NewPass123!' }); ok(r.status === 200, 'reset password');
  r = await api('POST', '/api/auth/logout', {});
  r = await api('POST', '/api/auth/login', { email, password: 'NewPass123!' }); ok(r.status === 200, 'new password login works');

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
  // NDA user must never see SSC-only content: switch exam, history preserved
  r = await api('PUT', '/api/me', { exam_id: 'NDA' }); ok(r.data.user.exam_id === 'NDA', 'change exam');
  r = await api('GET', '/api/mistakes'); ok(r.data.total === 0, 'exams do not mix: SSC mistakes not shown under NDA');
  r = await api('PUT', '/api/me', { exam_id: 'SSC_CHSL' }); r = await api('GET', '/api/mistakes'); ok(r.data.total >= 1, 'history preserved after switching back');
  // test flow
  r = await api('POST', '/api/tests/create', { kind: 'pyq' }); ok(r.status === 400, 'PYQ test refused when no verified PYQs exist (no mislabelling)');
  r = await api('POST', '/api/tests/create', { kind: 'topic', subject: 'Quantitative Aptitude', topic: 'Percentage', count: 5 }); ok(r.status === 200, 'create topic test');
  const tid = r.data.id;
  r = await api('GET', '/api/tests/' + tid); ok(r.data.test.questions.length > 0 && !('answer' in r.data.test.questions[0]), 'test hides answers while active');
  const q0 = r.data.test.questions[0];
  r = await api('PUT', `/api/tests/${tid}/save`, { answers: { [q0.id]: 1 }, marked: [q0.id], current_idx: 0, times: { [q0.id]: 4000 } }); ok(r.data.ok, 'autosave');
  r = await api('GET', '/api/tests/' + tid); ok(r.data.test.answers[q0.id] === 1 && r.data.test.marked.includes(q0.id), 'resume preserves answers + marks');
  const [s1, s2] = await Promise.all([api('POST', `/api/tests/${tid}/submit`, { answers: { [q0.id]: 1 } }), api('POST', `/api/tests/${tid}/submit`, { answers: { [q0.id]: 1 } })]);
  ok(s1.status === 200 && s2.status === 200 && s1.data.test.result.score === s2.data.test.result.score, 'duplicate submit is idempotent');
  const cnt = (await api('GET', '/api/progress')).data; ok(cnt.analyst.length > 0, 'progress analyst');
  ok(s1.data.test.result.coaching.went_well.length > 0 && s1.data.test.questions[0].explanation, 'result has coaching + review');
  r = await api('GET', '/api/plan'); ok(r.data.plan.tasks.length >= 2, 'daily plan');
  r = await api('GET', '/api/search?q=percent'); ok(r.data.topics.length > 0, 'search finds topics');
  r = await api('POST', '/api/ai/ask', { message: 'hi' }); ok(r.status === 502 && /not configured/.test(r.data.error), 'AI unconfigured fails gracefully');
  r = await api('GET', '/api/pyq/analysis'); ok(r.data.sufficient === false, 'no trend claims from insufficient PYQ data');
  r = await api('POST', '/api/auth/logout', {}); r = await api('GET', '/api/me'); ok(r.data.user === null, 'logout');
  // admin
  const ae = 'admin@x.com'; r = await api('POST', '/api/auth/send-otp', { email: ae }, { nocookie: true });
  r = await api('POST', '/api/auth/verify-otp', { email: ae, code: r.data.dev_otp }); ok(r.data.user.role === 'admin', 'admin role via ADMIN_EMAILS');
  r = await api('POST', '/api/admin/questions', { exam_id: 'SSC_CHSL', subject: 'English', topic: 'Grammar', difficulty: 'easy', text: 'Pick the correct spelling:', options: ['Recieve', 'Receive'], answer: 1, explanation: 'i before e except after c.', source_type: 'VERIFIED_PYQ' }); ok(r.data.errors.length === 1, 'VERIFIED_PYQ without source metadata rejected');
  r = await api('POST', '/api/admin/exams', { id: 'MY_EXAM', name: 'My Exam', category: 'Other', minutes: 30, sections: [{ subject: 'Reasoning', questions: 20, marks: 1, negative: 0.25 }] }); ok(r.data.ok, 'admin can add exam');
  console.log(fails ? `\n${fails} FAILED` : '\nALL PASSED'); process.exit(fails ? 1 : 0);
})();