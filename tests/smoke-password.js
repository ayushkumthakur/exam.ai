// Password-auth smoke test. Run against a LOCAL instance only:
//   BASE=http://localhost:8080 node tests/smoke-password.js
// Creates a throwaway account and test history; do not point at production.
const BASE = process.env.BASE || 'http://localhost:8080';
let cookie = '';
let failures = 0;
const origin = new URL(BASE).origin;

async function api(method, path, body, { keepCookie = true } = {}) {
  const headers = { 'content-type': 'application/json', origin };
  if (keepCookie && cookie) headers.cookie = cookie;
  const response = await fetch(BASE + path, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const setCookie = response.headers.get('set-cookie');
  if (setCookie && keepCookie) cookie = setCookie.split(';')[0];
  return { status: response.status, data: await response.json().catch(() => ({})) };
}
function check(condition, message) {
  console.log((condition ? 'PASS ' : 'FAIL ') + message);
  if (!condition) failures++;
}
function passStatus(result, status, message) {
  check(result.status === status, message + ' (HTTP ' + result.status + ')');
}

(async () => {
  try {
    const email = 'smoke-' + Date.now() + '@example.test';
    const password = 'SmokeTest!482';
    passStatus(await api('GET', '/api/home'), 401, 'unauthenticated home is blocked');

    let r = await api('POST', '/api/auth/signup', { email: 'bad-email', password });
    check(r.status >= 400, 'invalid signup details rejected');

    r = await api('POST', '/api/auth/signup', { email, password });
    passStatus(r, 200, 'password signup');
    check(!!r.data.user, 'signup returns user');

    r = await api('POST', '/api/me/onboarding', {
      name: 'Smoke Test',
      exam_id: 'SSC_CHSL',
      level: 'Intermediate',
      target_date: new Date(Date.now() + 120 * 86400000).toISOString().slice(0, 10),
      daily_minutes: 120,
      stage: 'Preparing',
    });
    passStatus(r, 200, 'onboarding saves profile');

    r = await api('GET', '/api/home');
    check(r.status === 200 && r.data.exam?.id === 'SSC_CHSL' && !!r.data.recommendation, 'personalised home loads');

    r = await api('GET', '/api/practice/questions?subject=Quantitative%20Aptitude&limit=5');
    check(r.status === 200 && Array.isArray(r.data.questions) && r.data.questions.length > 0, 'practice questions load');
    if (r.data.questions?.[0]) {
      check(!Object.prototype.hasOwnProperty.call(r.data.questions[0], 'answer'), 'practice response does not reveal answer key');
      const q = r.data.questions[0];
      const answer = await api('POST', '/api/practice/answer', {
        question_id: q.id, choice: 0, time_ms: 2500,
      });
      check(answer.status === 200 && typeof answer.data.explanation === 'string', 'answer submission returns explanation');
    }

    r = await api('POST', '/api/tests/create', {
      kind: 'topic', subject: 'Quantitative Aptitude', topic: 'Percentage', count: 20,
    });
    check(r.status === 200 && Number.isInteger(r.data.id), 'topic test can be created');
    if (r.status === 200 && r.data.id) {
      const tid = r.data.id;
      const active = await api('GET', '/api/tests/' + tid);
      check(active.status === 200 && Array.isArray(active.data.test?.questions), 'active test loads');
      check(!(active.data.test?.questions || []).some(q => Object.prototype.hasOwnProperty.call(q, 'answer')), 'active test hides answer keys');
      const q0 = active.data.test?.questions?.[0];
      if (q0) {
        const saved = await api('PUT', '/api/tests/' + tid + '/save', {
          answers: { [q0.id]: 0 }, marked: [q0.id], current_idx: 0, times: { [q0.id]: 2500 },
        });
        check(saved.status === 200 && saved.data.ok, 'test autosave succeeds');
        const resumed = await api('GET', '/api/tests/' + tid);
        check(resumed.status === 200 && resumed.data.test?.marked?.includes(q0.id), 'test resumes saved marked question');
      }
      const submitted = await api('POST', '/api/tests/' + tid + '/submit', {});
      check(submitted.status === 200 && !!submitted.data.test?.result, 'test submission produces result');
      check((submitted.data.test?.result?.coaching?.went_well || []).length > 0, 'test result includes coaching feedback');
    }

    r = await api('GET', '/api/progress');
    check(r.status === 200 && Array.isArray(r.data.analyst), 'progress analytics endpoint loads');

    r = await api('POST', '/api/auth/logout', {});
    passStatus(r, 200, 'logout succeeds');
    r = await api('GET', '/api/me');
    check(r.status === 200 && r.data.user === null, 'logout clears session');

    r = await api('POST', '/api/auth/login', { email, password }, { keepCookie: true });
    check(r.status === 200 && !!r.data.user, 'password login works');
    r = await api('POST', '/api/auth/login', { email, password: 'WrongPassword!1' });
    check(r.status === 401, 'wrong password rejected');
    await api('POST', '/api/auth/logout', {});
  } catch (error) {
    console.error('Smoke test crashed:', error);
    failures++;
  }
  console.log(failures ? '\n' + failures + ' CHECK(S) FAILED' : '\nALL CHECKS PASSED');
  process.exitCode = failures ? 1 : 0;
})();
