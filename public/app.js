'use strict';
// ---------- helpers ----------
const $ = (s, el = document) => el.querySelector(s);
function h(tag, attrs, ...kids) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs || {})) {
    if (v === false || v == null) continue;
    if (k.startsWith('on')) el.addEventListener(k.slice(2), v);
    else if (k === 'class') el.className = v;
    else if (k === 'value') el.value = v;
    else if (k === 'html') throw new Error('no raw html');
    else el.setAttribute(k, v === true ? '' : v);
  }
  for (const kid of kids.flat(Infinity)) { if (kid == null || kid === false) continue; el.append(kid.nodeType ? kid : document.createTextNode(String(kid))); }
  return el;
}
const svg = (d) => { const s = document.createElementNS('http://www.w3.org/2000/svg', 'svg'); s.setAttribute('viewBox', '0 0 24 24'); const p = document.createElementNS('http://www.w3.org/2000/svg', 'path'); p.setAttribute('d', d); s.append(p); return s; };
const ICONS = { dashboard: 'M3 3h7v7H3zM14 3h7v7h-7zM14 14h7v7h-7zM3 14h7v7H3z', mock: 'M8 3v3m8-3v3M4 8h16M6 5h12a2 2 0 0 1 2 2v12H4V7a2 2 0 0 1 2-2zM8 12h3m-3 4h6', doubt: 'M14 4h-4l-1.4 2H5a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-4zM12 10a3 3 0 1 0 0 6 3 3 0 0 0 0-6z', mistakes: 'M12 9v4m0 4h.01M10.3 3.8L2.8 17a2 2 0 0 0 1.7 3h15a2 2 0 0 0 1.7-3l-7.5-13.2a2 2 0 0 0-3.4 0z', leaderboard: 'M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0zM7 7H4v2a4 4 0 0 0 4 4M17 7h3v2a4 4 0 0 1-4 4M9 3h6', bookmarks: 'M6 3h12v18l-6-4-6 4z', home: 'M3 11l9-8 9 8M5 10v10h14V10', practice: 'M4 5.5A2.5 2.5 0 0 1 6.5 3H20v16H6.5A2.5 2.5 0 0 0 4 21.5zM4 5.5v16M8 7h8M8 11h5M15 15l2 2 3-4', revision: 'M3 12a9 9 0 1 0 3-6.7M3 4v5h5', pyqs: 'M6 3h9l4 4v14H6zM14 3v5h5', tests: 'M9 11l3 3 8-8M4 4h10M4 10h3M4 16h8', ca: 'M4 5h13v14H4zM17 8h3v9a2 2 0 0 1-2 2M7 9h7M7 13h7', tutor: 'M4 5h16v11H9l-5 4zM8 10h8', plan: 'M4 6h16v14H4zM4 10h16M8 3v4M16 3v4', progress: 'M4 20V10M10 20V4M16 20v-7M22 20H2', profile: 'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM4 21a8 8 0 0 1 16 0', logout: 'M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9', more: 'M5 12h.01M12 12h.01M19 12h.01', library: 'M5 4h5v16H5zM12 4h3l4 16h-3z', admin: 'M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z' };
const logo = () => { const s = document.createElementNS('http://www.w3.org/2000/svg', 'svg'); s.setAttribute('viewBox', '0 0 32 32'); s.innerHTML = '<defs><linearGradient id="ceaLogoGradient" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#4234bd"/><stop offset="1" stop-color="#8d3e78"/></linearGradient></defs><rect width="32" height="32" rx="9" fill="url(#ceaLogoGradient)"/><path d="M3.8 10.5L16 4.6l12.2 5.9L16 16.4z" fill="none" stroke="#fff" stroke-width="1.8" stroke-linejoin="round"/><path d="M8.7 13v6c4.3 2.4 10.3 2.4 14.6 0v-6M27.8 11v7" fill="none" stroke="#fff" stroke-width="1.8" stroke-linecap="round"/>'; return s; };
const toast = (m) => { const t = $('#toast'); t.textContent = m; t.classList.add('show'); clearTimeout(toast.t); toast.t = setTimeout(() => t.classList.remove('show'), 2600); };
const pct = (v) => v === null || v === undefined ? '–' : v + '%';
const fmtDate = (t) => new Date(t).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });

async function api(method, url, body) {
  let r;
  try { r = await fetch(url, { method, headers: body ? { 'content-type': 'application/json' } : {}, body: body ? JSON.stringify(body) : undefined, credentials: 'same-origin' }); }
  catch { throw Object.assign(new Error('Network problem. Check your connection and try again.'), { network: true, retry: true }); }
  const data = await r.json().catch(() => ({}));
  if (r.status === 401 && S.user) { S.user = null; location.hash = '#/'; renderAuth(); }
  if (!r.ok) throw Object.assign(new Error(data.error || 'Something went wrong.'), { status: r.status, data, retry: data.retry });
  return data;
}
const get = (u) => api('GET', u), post = (u, b) => api('POST', u, b || {}), put = (u, b) => api('PUT', u, b);

// Render a safe subset of markdown (bold, lists, headings) into DOM nodes; never uses innerHTML.
function md(text) {
  const root = h('div', { class: 'md' }); let list = null;
  const inline = (s) => { const out = []; s.split(/(\*\*[^*]+\*\*)/).forEach(p => out.push(/^\*\*[^*]+\*\*$/.test(p) ? h('strong', {}, p.slice(2, -2)) : p)); return out; };
  for (const line of String(text).split('\n')) {
    const li = /^\s*(?:[-*•]|\d+[.)])\s+(.*)$/.exec(line);
    if (li) { if (!list) { list = h('ul'); root.append(list); } list.append(h('li', {}, inline(li[1]))); continue; }
    list = null; if (!line.trim()) continue;
    const hd = /^#{1,4}\s+(.*)$/.exec(line);
    root.append(hd ? h('h4', {}, inline(hd[1])) : h('p', {}, inline(line)));
  }
  return root;
}
const SRC = { VERIFIED_PYQ: ['Verified PYQ', 'pyq'], AI_GENERATED: ['AI Generated Practice', 'ai'], PYQ_PATTERN: ['PYQ Pattern Question', 'pat'], ADMIN_PRACTICE: ['Admin Practice Question', 'adm'] };
const srcBadge = (q) => { const [l, c] = SRC[q.source_type] || ['', 'adm']; return h('span', { class: 'badge ' + c }, q.pyq ? `${l} · ${q.pyq.year || ''} ${q.pyq.paper || ''}`.trim() : l); };

function errBox(e, retryFn) {
  return h('div', { class: 'err', role: 'alert' }, h('div', {}, e.message || 'Something went wrong.'), retryFn && e.retry !== false ? h('button', { class: 'btn sm', style: 'margin-top:.5rem', onclick: retryFn }, 'Try Again') : null);
}
// Run an async loader into a container; failures stay local so the rest of the app keeps working.
async function load(box, fn) {
  box.replaceChildren(h('div', { class: 'empty' }, h('span', { class: 'spin' }), ' Loading…'));
  try { const n = await fn(); box.replaceChildren(n); } catch (e) { box.replaceChildren(errBox(e, () => load(box, fn))); }
}
const cleanups = [];
const onLeave = (f) => cleanups.push(f);
function runCleanups() { while (cleanups.length) { try { cleanups.pop()(); } catch { } } }

// ---------- state ----------
const S = { user: null, config: {}, exams: [], exam: null };
const NAV = [['home', 'Home'], ['practice', 'Practice'], ['revision', 'Revision'], ['pyqs', 'PYQs'], ['tests', 'Tests'], ['ca', 'Current Affairs'], ['tutor', 'AI Tutor'], ['plan', 'Study Plan'], ['progress', 'Progress'], ['profile', 'Profile']];
const MOBILE = [['home', 'Home'], ['practice', 'Practice'], ['tests', 'Tests'], ['tutor', 'AI Tutor'], ['more', 'More']];

function getTheme() {
  return localStorage.getItem('cea-theme') || (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
}
function applyTheme(theme) {
  document.documentElement.dataset.theme = theme;
  localStorage.setItem('cea-theme', theme);
}
function toggleTheme() { applyTheme(getTheme() === 'dark' ? 'light' : 'dark'); route(); }
applyTheme(getTheme());

async function boot() {
  try {
    S.config = await get('/api/config'); S.exams = (await get('/api/exams')).exams;
    S.user = (await get('/api/me')).user;
  } catch (e) { $('#app').replaceChildren(h('div', { class: 'auth' }, h('div', { class: 'card' }, errBox(e, () => location.reload())))); return; }
  route();
}
window.addEventListener('hashchange', () => route());

function route() {
  runCleanups();
  if (!S.user) return renderAuth();
  if (!S.user.onboarded) return renderOnboarding();
  const [path, qs] = (location.hash.slice(2) || 'home').split('?');
  const parts = path.split('/'); const params = new URLSearchParams(qs || '');
  S.exam = S.exams.find(e => e.id === S.user.exam_id);
  renderShell(parts[0], parts, params);
}
const go = (hash) => { if (location.hash === hash) route(); else location.hash = hash; };
const q = (o) => '?' + new URLSearchParams(Object.entries(o).filter(([, v]) => v !== undefined && v !== null && v !== '')).toString();

// ---------- auth ----------
function renderAuth() {
  const app = $('#app'); let email = '';
  const card = h('div', { class: 'card stack' });
  app.replaceChildren(h('div', { class: 'auth' }, card));

  function passwordField(placeholder, autocomplete, label) {
    const input = h('input', { type: 'password', autocomplete, placeholder, required: true, minlength: 8, 'aria-label': label });
    const toggle = h('button', { type: 'button', class: 'password-toggle', 'aria-label': 'Show password', title: 'Show password' }, '◉');
    const wrap = h('div', { class: 'password-wrap' }, input, toggle);
    toggle.onclick = () => {
      const visible = input.type === 'text';
      input.type = visible ? 'password' : 'text';
      toggle.textContent = visible ? '◉' : '◌';
      toggle.setAttribute('aria-label', visible ? 'Show password' : 'Hide password');
      toggle.title = visible ? 'Show password' : 'Hide password';
      input.focus();
    };
    return { input, wrap };
  }

  function stepLogin(msg) {
    const emailInp = h('input', { type: 'email', inputmode: 'email', autocomplete: 'email', placeholder: 'you@example.com', value: email, required: true, 'aria-label': 'Email address' });
    const pass = passwordField('Password', 'current-password', 'Password');
    const err = h('div');
    const login = h('button', { class: 'btn primary', style: 'width:100%', type: 'submit' }, 'Log in');
    const signup = h('button', { class: 'btn ghost sm', type: 'button' }, 'Create account');
    signup.onclick = () => { email = emailInp.value.trim(); stepSignup(); };

    card.replaceChildren(
      h('div', { class: 'brand' }, logo(), 'Competitive Exam AI'),
      h('div', {}, h('h1', {}, 'Welcome back'), h('p', { class: 'muted' }, 'Log in with your email and password.')),
      h('form', { onsubmit: async (ev) => {
        ev.preventDefault(); email = emailInp.value.trim(); err.replaceChildren();
        login.disabled = true; login.replaceChildren(h('span', { class: 'spin' }));
        try {
          const r = await post('/api/auth/login', { email, password: pass.input.value });
          S.user = r.user; location.hash = '#/'; route();
        } catch (e) {
          err.replaceChildren(errBox(e));
          login.disabled = false; login.replaceChildren('Log in');
        }
      } }, emailInp, pass.wrap, err, h('div', { style: 'margin-top:1rem' }, login)),
      h('div', { class: 'row between', style: 'margin-top:.5rem' }, h('span', { class:'small muted' }, 'New here?'), signup),
      h('p', { class: 'small muted', style: 'margin-top:1rem' },
        h('a', { href: '/terms.html', target: '_blank', rel: 'noopener' }, 'Terms'), ' · ',
        h('a', { href: '/privacy.html', target: '_blank', rel: 'noopener' }, 'Privacy'))
    );
    emailInp.focus();
  }

  function stepSignup() {
    const emailInp = h('input', { type: 'email', inputmode: 'email', autocomplete: 'email', placeholder: 'you@example.com', value: email, required: true, 'aria-label': 'Email address' });
    const p1 = passwordField('Password', 'new-password', 'Password');
    const p2 = passwordField('Confirm password', 'new-password', 'Confirm password');
    const err = h('div');
    const create = h('button', { class: 'btn primary', style: 'width:100%', type: 'submit' }, 'Create account');

    card.replaceChildren(
      h('div', { class: 'brand' }, logo(), 'Competitive Exam AI'),
      h('div', {}, h('h1', {}, 'Create your account'), h('p', { class: 'muted' }, 'Create an account with email and password. No OTP required.')),
      h('form', { onsubmit: async (ev) => {
        ev.preventDefault(); email = emailInp.value.trim(); err.replaceChildren();
        create.disabled = true; create.replaceChildren(h('span', { class: 'spin' }));
        try {
          const r = await post('/api/auth/signup', { email, password: p1.input.value, confirm_password: p2.input.value });
          S.user = r.user; location.hash = '#/'; route();
        } catch (e) {
          err.replaceChildren(errBox(e));
          create.disabled = false; create.replaceChildren('Create account');
        }
      } }, emailInp, p1.wrap, p2.wrap, err, h('div', { style: 'margin-top:1rem' }, create)),
      h('p', { class: 'small muted', style: 'margin-top:.75rem' }, 'By creating an account you agree to our ',
        h('a', { href: '/terms.html', target: '_blank', rel: 'noopener' }, 'Terms of Service'), ' and ',
        h('a', { href: '/privacy.html', target: '_blank', rel: 'noopener' }, 'Privacy Policy'), '.'),
      h('button', { class: 'btn ghost sm', onclick: () => stepLogin() }, 'Back to login')
    );
    emailInp.focus();
  }

  stepLogin();
}
// ---------- onboarding ----------
function renderOnboarding() {
  const d = { name: S.user.name || '', exam_id: S.user.exam_id || '', selected_subjects: [], level: '', target_date: '', daily_minutes: 0, stage: 'Preparing' };
  const app = $('#app'); const card = h('div', { class: 'card stack' });
  app.replaceChildren(h('div', { class: 'auth' }, h('div', { style: 'width:100%;max-width:760px' }, card)));

  let step = 0;
  const school = () => String(S.exams.find(e => e.id === d.exam_id)?.category || '').startsWith('School');
  const selectedExam = () => S.exams.find(e => e.id === d.exam_id);
  const steps = (n) => h('div', { class: 'steps' }, [0,1,2].map(i => h('i', { class: i <= n ? 'on' : '' })));

  function s1() {
    let filter = '', cat = 'All';
    const chips = h('div', { class: 'chips' });
    const grid = h('div', { class: 'examgrid', role: 'listbox' });
    const next = h('button', { class: 'btn primary', disabled: !d.exam_id }, 'Continue');

    function categories() { return ['All', 'School · CBSE', 'Competitive Exams', ...new Set(S.exams.map(e => e.category).filter(x => !x.startsWith('School')))]; }
    function inCat(e) {
      if (cat === 'All') return true;
      if (cat === 'School · CBSE') return e.category.startsWith('School');
      if (cat === 'Competitive Exams') return !e.category.startsWith('School');
      return e.category === cat;
    }
    function draw() {
      chips.replaceChildren(...categories().map(c => h('button', {
        class: 'chip' + (c === cat ? ' on' : ''),
        onclick: () => { cat = c; draw(); }
      }, c)));
      const priority = e => e.id === 'UPSC_CSE' ? 0 : e.id === 'SSC_CGL' ? 1 : 2;
      const list = S.exams.filter(e => inCat(e) && e.name.toLowerCase().includes(filter))
        .sort((a, b) => priority(a) - priority(b) || a.name.localeCompare(b.name));
      grid.replaceChildren(...(list.length ? list.map(e => h('button', {
        class: 'exam' + (e.id === d.exam_id ? ' on' : ''),
        role: 'option',
        'aria-selected': e.id === d.exam_id,
        onclick: () => {
          d.exam_id = e.id;
          d.selected_subjects = [];
          next.disabled = false;
          draw();
        }
      }, h('b', {}, e.name),
        (e.id === 'UPSC_CSE' || e.id === 'SSC_CGL') ? h('span', { class: 'badge', style: 'align-self:flex-start;margin-top:.35rem' }, e.id === 'UPSC_CSE' ? 'Priority focus · UPSC' : 'Priority focus · SSC CGL') : null,
        h('span', { class: 'small muted' }, e.category))) :
        [h('div', { class: 'empty' }, 'No exam or class matches your search.')]));
    }

    next.onclick = () => school() ? s2Subjects() : s3Profile();
    card.replaceChildren(
      h('div', { class: 'brand' }, logo(), 'Competitive Exam AI'),
      steps(0),
      h('h1', {}, 'Choose your exam / class first'),
      h('p', { class: 'muted' }, 'This is your main preference. It controls the syllabus, subjects, questions, tests, PYQ hub and study plan.'),
      h('input', { type: 'search', placeholder: 'Search NDA, SSC, CBSE Class 9, Class 11 Science, Commerce…', 'aria-label': 'Search exam or class', oninput: e => { filter = e.target.value.toLowerCase(); draw(); } }),
      chips, grid,
      h('div', { class: 'row', style: 'justify-content:flex-end' }, next)
    );
    draw();
  }

  function s2Subjects() {
    const ex = selectedExam();
    const available = ex ? ex.subjects : [];
    if (!d.selected_subjects.length) d.selected_subjects = available.slice();
    const err = h('div');
    const selected = () => d.selected_subjects;
    const subjectGrid = h('div', { class: 'grid g2' });
    const count = h('span', { class: 'small muted' });

    function draw() {
      subjectGrid.replaceChildren(...available.map(sub => {
        const on = selected().includes(sub);
        return h('button', {
          class: 'exam' + (on ? ' on' : ''),
          onclick: () => {
            if (on) d.selected_subjects = d.selected_subjects.filter(x => x !== sub);
            else d.selected_subjects = [...d.selected_subjects, sub];
            draw();
          }
        }, h('b', {}, sub), h('span', { class: 'small muted' }, on ? 'Selected' : 'Tap to select'));
      }));
      count.textContent = d.selected_subjects.length + ' subject(s) selected';
    }

    const next = h('button', { class: 'btn primary', onclick: () => {
      err.replaceChildren();
      if (!d.selected_subjects.length) {
        err.append(h('div', { class: 'err' }, 'Select at least one subject.'));
        return;
      }
      s3Profile();
    }}, 'Continue');

    card.replaceChildren(
      h('div', { class: 'brand' }, logo(), 'Competitive Exam AI'),
      steps(1),
      h('h1', {}, 'Choose your subjects'),
      h('p', { class: 'muted' }, ex ? ex.name + ' · Select every subject you actually study. You can change this later in Profile.' : ''),
      h('div', { class: 'row between' }, h('b', {}, 'Your subjects'), count),
      subjectGrid, err,
      h('div', { class: 'row between' }, h('button', { class: 'btn ghost', onclick: s1 }, '← Back'), next)
    );
    draw();
  }

  function s3Profile() {
    const err = h('div');
    const min = new Date(Date.now() + 864e5).toISOString().slice(0, 10);
    const pick = (opts, key, fmt) => h('div', { class: 'chips' }, opts.map(o => {
      const b = h('button', { type: 'button', class: 'chip' + (d[key] === o ? ' on' : ''), onclick: () => {
        d[key] = o;
        b.parentNode.querySelectorAll('.chip').forEach(c => c.classList.remove('on'));
        b.classList.add('on');
      }}, fmt ? fmt(o) : o);
      return b;
    }));
    const name = h('input', { value: d.name, placeholder: 'Your name', maxlength: 60, autocomplete: 'given-name' });
    const date = h('input', { type: 'date', min, value: d.target_date });
    const finish = h('button', { class: 'btn primary', onclick: async () => {
      d.name = name.value.trim(); d.target_date = date.value; err.replaceChildren();
      if (!d.name || !d.level || !d.target_date || !d.daily_minutes || (school() && !d.selected_subjects.length)) {
        err.append(h('div', { class: 'err' }, 'Please complete your name, level, target date, daily study time and school subjects.'));
        return;
      }
      finish.disabled = true;
      try {
        const r = await post('/api/me/onboarding', d);
        S.user = r.user;
        planReady();
      } catch (e) {
        err.replaceChildren(errBox(e));
        finish.disabled = false;
      }
    }}, 'Create my plan');

    card.replaceChildren(
      h('div', { class: 'brand' }, logo(), 'Competitive Exam AI'),
      steps(school() ? 2 : 1),
      h('h1', {}, 'A few quick details'),
      h('label', {}, 'Your name'), name,
      h('label', {}, 'Preparation level'), pick(['Beginner', 'Intermediate', 'Advanced'], 'level'),
      h('label', {}, 'Target exam date'), date,
      h('label', {}, 'Daily study time'), pick([60,120,180,240,300], 'daily_minutes', m => m === 300 ? '5+ hours' : m / 60 + (m === 60 ? ' hour' : ' hours')),
      h('label', {}, 'Preparation stage (optional)'), pick(['Just Started', 'Preparing', 'Revision'], 'stage'),
      err,
      h('div', { class: 'row between', style: 'margin-top:1rem' },
        h('button', { class: 'btn ghost', onclick: school() ? s2Subjects : s1 }, '← Back'),
        finish
      )
    );
  }

  function planReady() {
    const ex = selectedExam();
    card.replaceChildren(h('div', { class: 'center stack', style: 'padding:1.5rem 0' },
      h('div', { style: 'font-size:3rem' }, '🎯'),
      h('h1', {}, 'Your preparation plan is ready!'),
      h('p', { class: 'muted' }, 'Personalised for ' + (ex ? ex.name : 'your selection')),
      h('button', { class: 'btn primary', onclick: () => { location.hash = '#/home'; route(); } }, 'Go to my dashboard')
    ));
  }

  s1();
}

// ---------- shell ----------
function renderShell(page, parts, params) {
  let mobileScrim = null, mobileMenuButton = null;
  const closeMobileNavigation = () => {
    const sideEl = $('#mobileSideNav');
    if (sideEl) sideEl.classList.remove('mobile-open');
    if (mobileScrim) mobileScrim.classList.remove('is-open');
    if (mobileMenuButton) {
      mobileMenuButton.setAttribute('aria-expanded', 'false');
      mobileMenuButton.textContent = '☰';
    }
  };
  const navItem = ([k, label], cls = '') => h('a', { class: 'nav' + (k === page || (k === 'more' && !MOBILE.some(m => m[0] === page)) ? ' on' : '') + cls, href: '#/' + k }, svg(ICONS[k] || ICONS.more), label);
  const main = h('div', { class: 'page', id: 'page' });
  const isAdmin = S.user.role === 'admin';
  const sideItems = [
    { label: 'Dashboard', icon: 'dashboard', href: '#/home', active: page === 'home' },
    { label: 'Practice', icon: 'practice', href: '#/practice', active: page === 'practice' },
    { label: 'Mock Tests', icon: 'mock', href: '#/tests', active: page === 'tests' || page === 'test' || page === 'result' },
    { label: 'Doubt Solver', icon: 'doubt', href: '#/tutor?mode=doubt', active: page === 'tutor' && params.get('mode') === 'doubt' },
    { label: 'Mistakes', icon: 'mistakes', href: '#/revision?mistakes=1', active: page === 'revision' && !!params.get('mistakes') },
    { label: 'Revision', icon: 'revision', href: '#/revision', active: page === 'revision' && !params.get('mistakes') },
    { label: 'PYQs', icon: 'pyqs', href: '#/pyqs', active: page === 'pyqs' },
    { label: 'Leaderboard', icon: 'leaderboard', href: '#/progress', active: page === 'progress' },
    { label: 'Current Affairs', icon: 'ca', href: '#/ca', active: page === 'ca' },
    { label: 'Study Plan', icon: 'plan', href: '#/plan', active: page === 'plan' },
    { label: 'Bookmarks', icon: 'bookmarks', href: '#/library', active: page === 'library' },
    { label: 'AI Assistant', icon: 'tutor', href: '#/tutor', active: page === 'tutor' && params.get('mode') !== 'doubt' },
    { label: 'Profile', icon: 'profile', href: '#/profile', active: page === 'profile' },
    ...(isAdmin ? [{ label: 'Admin', icon: 'admin', href: '#/admin', active: page === 'admin' }] : [])
  ];
  const sideNavItem = (item) => h('a', { class: 'nav side-nav' + (item.active ? ' on' : ''), href: item.href, 'aria-current': item.active ? 'page' : null, onclick: closeMobileNavigation },
    svg(ICONS[item.icon] || ICONS.more), h('span', {}, item.label));
  const search = h('form', { role: 'search', onsubmit: (e) => { e.preventDefault(); const v = e.target.q.value.trim(); if (v.length >= 2) go('#/search' + q({ q: v })); } },
    h('input', { name: 'q', type: 'search', placeholder: 'Search topics, questions, PYQs, notes…', 'aria-label': 'Search', value: page === 'search' ? params.get('q') || '' : '' }));
  const theme = h('button', { class: 'iconbtn', type: 'button', title: 'Toggle light/dark mode', 'aria-label': 'Toggle light/dark mode', onclick: toggleTheme }, getTheme() === 'dark' ? '☀' : '☾');
  const profile = h('a', { class: 'profile-mini', href: '#/profile', title: 'Open profile' },
    h('span', { class: 'avatar' }, (S.user.name || S.user.email || 'S').slice(0,1).toUpperCase()),
    h('span', { class: 'profile-mini-text' }, S.user.name || S.user.email || 'Student'));
  const side = h('nav', { class: 'side', id: 'mobileSideNav', 'aria-label': 'Main' },
      h('div', { class: 'brand' }, logo(), h('span', { class: 'brand-copy' }, h('b', {}, 'Competitive Exam AI'), h('small', {}, 'UPSC · NDA · SSC · BANKING'))),
      sideItems.map(sideNavItem),
      h('div', { class: 'side-foot' },
        h('div', { class: 'sidebar-profile' },
          h('a', { class: 'sidebar-profile-main', href: '#/profile', title: 'Open profile' },
            h('span', { class: 'sidebar-avatar' }, (S.user.name || S.user.email || 'S').slice(0, 1).toUpperCase()),
            h('span', { class: 'sidebar-user-copy' }, h('b', {}, S.user.name || 'Student'), h('small', {}, S.user.email || ''))),
          h('button', { class: 'sidebar-logout', type: 'button', title: 'Log out', 'aria-label': 'Log out', onclick: async () => {
            try { await post('/api/auth/logout'); S.user = null; location.hash = '#/'; route(); }
            catch (e) { toast(e.message || 'Could not log out. Please try again.'); }
          } }, svg(ICONS.logout)))));
  mobileScrim = h('button', { class: 'mobile-nav-scrim', type: 'button', 'aria-label': 'Close navigation menu', tabindex: '-1', onclick: closeMobileNavigation });
  mobileMenuButton = h('button', {
    class: 'iconbtn mobile-menu-toggle', type: 'button', 'aria-controls': 'mobileSideNav',
    'aria-expanded': 'false', 'aria-label': 'Open navigation menu', title: 'Open navigation menu',
    onclick: () => {
      const sideEl = $('#mobileSideNav');
      if (!sideEl || !mobileScrim) return;
      const opened = sideEl.classList.toggle('mobile-open');
      mobileScrim.classList.toggle('is-open', opened);
      mobileMenuButton.setAttribute('aria-expanded', String(opened));
      mobileMenuButton.setAttribute('aria-label', opened ? 'Close navigation menu' : 'Open navigation menu');
      mobileMenuButton.setAttribute('title', opened ? 'Close navigation menu' : 'Open navigation menu');
      mobileMenuButton.textContent = opened ? '×' : '☰';
      if (opened) sideEl.querySelector('.side-nav')?.focus();
    }
  }, '☰');
  $('#app').replaceChildren(h('div', { class: 'shell' },
    side,
    mobileScrim,
    h('div', { class: 'main' },
      h('div', { class: 'top' },
        mobileMenuButton,
        h('div', { class: 'top-brand' }, h('div', { class: 'brand' }, logo(), h('span', {}, 'Competitive Exam AI'))),
        search,
        h('span', { class: 'badge top-exam' }, S.exam ? S.exam.name : ''),
        theme,
        profile),
      main)),
    h('nav', { class: 'bottom', 'aria-label': 'Primary' }, MOBILE.map(i => navItem(i))));
  const pages = { home: pgHome, practice: pgPractice, revision: pgRevision, pyqs: pgPyqs, tests: pgTests, test: pgTestTake, result: pgResult, tutor: pgTutor, plan: pgPlan, progress: pgProgress, profile: pgProfile, library: pgLibrary, search: pgSearch, ca: pgCA, more: pgMore, admin: pgAdmin };
  const fn = pages[page] || pgHome; window.scrollTo(0, 0);
  load(main, () => fn(parts, params));
}
function pgMore() {
  return h('div', { class: 'stack' }, h('h1', {}, 'More'), h('div', { class: 'grid g2' }, [['revision', 'Revision'], ['pyqs', 'PYQs'], ['ca', 'Current Affairs'], ['plan', 'Study Plan'], ['progress', 'Progress'], ['library', 'My Library'], ['profile', 'Profile'], ...(S.user.role === 'admin' ? [['admin', 'Admin']] : [])].map(([k, l]) => h('a', { class: 'card nav', href: '#/' + k }, svg(ICONS[k] || ICONS.more), l))));
}

// ---------- action router (recommendation CTAs) ----------
async function doAction(a) {
  if (a.type === 'test') return go('#/test/' + a.id);
  if (a.type === 'revision') return go('#/revision' + q({ subject: a.subject, topic: a.topic }));
  if (a.type === 'practice') return go('#/practice' + q({ subject: a.subject, topic: a.topic, start: 1 }));
  if (a.type === 'topic_test') return startTest({ kind: 'topic', subject: a.subject, topic: a.topic, count: 10 });
  if (a.type === 'mistakes') return go('#/revision?mistakes=1');
  if (a.type === 'tutor') return go('#/tutor');
}
async function startTest(body) {
  try { const r = await post('/api/tests/create', body); (r.notices || []).forEach(n => toast(n)); go('#/test/' + r.id); } catch (e) { toast(e.message); }
}

// ---------- home ----------
async function pgHome() {
  const results = await Promise.all([
    get('/api/home'),
    get('/api/tests').catch(() => ({ tests: [] })),
    get('/api/library').catch(() => ({ bookmarks: [], notes: [], saved_ca: [] }))
  ]);
  const d = results[0];
  const testData = results[1];
  const libraryData = results[2];
  const reco = d.recommendation || {};
  const allTests = testData.tests || [];
  const submittedTests = allTests.filter(t => t.status === 'submitted');
  const bookmarkCount = (libraryData.bookmarks || []).length + (libraryData.notes || []).length + (libraryData.saved_ca || []).length;
  const dailyGoal = Math.max(1, Number(d.target && d.target.questions) || 20);
  const doneToday = Math.max(0, Number(d.today && d.today.questions) || 0);
  const goalPct = Math.min(100, Math.round(doneToday / dailyGoal * 100));
  let daysLabel = 'Target date not set';
  if (d.days_left !== null && d.days_left !== undefined) daysLabel = d.days_left > 0 ? d.days_left + ' days left' : d.days_left === 0 ? 'Exam day is today' : 'Target date passed';
  const greeting = (d.questions_solved || 0) === 0 ? 'Ready for your first session?' : 'Ready for your next session?';

  // Keep the two priority tracks first without hiding shortcuts for other exams.
  const shortcutSpecs = [
    ['UPSC_CSE', 'UPSC'], ['SSC_CGL', 'SSC CGL'], ['NDA', 'NDA'], ['CDS', 'CDS'], ['CAPF', 'CAPF'],
    ['SSC_CHSL', 'SSC CHSL'], ['IBPS_PO', 'IBPS'], ['RRB_NTPC', 'RRB'],
    ['JEE_MAIN', 'JEE'], ['NEET', 'NEET'], ['CUET', 'CUET'], ['CLAT', 'CLAT']
  ];
  const chipExams = shortcutSpecs.map(([id, label]) => {
    const exam = S.exams.find(e => e.id === id);
    return exam ? { exam, label } : null;
  }).filter(Boolean);
  if (S.exam && !chipExams.some(x => x.exam.id === S.exam.id)) chipExams.unshift({ exam: S.exam, label: S.exam.id });

  async function chooseExam(id) {
    if (!id || id === S.user.exam_id) return;
    try {
      const updated = await put('/api/me', { exam_id: id });
      S.user = updated.user;
      toast('Target exam updated');
      route();
    } catch (e) {
      toast(e.message || 'Could not change exam');
    }
  }

  const metric = (label, value, caption, iconName) => h('article', { class: 'card dash-stat' },
    h('div', { class: 'dash-stat-top' },
      h('span', { class: 'dash-stat-label' }, label),
      h('span', { class: 'dash-stat-icon', 'aria-hidden': 'true' }, svg(ICONS[iconName] || ICONS.more))),
    h('strong', { class: 'dash-stat-value' }, value),
    h('span', { class: 'dash-stat-caption' }, caption));

  const focusRows = (d.weak_topics || []).slice(0, 3).map(w =>
    h('div', { class: 'dash-focus-row' },
      h('span', { class: 'dash-focus-dot', 'aria-hidden': 'true' }),
      h('div', { class: 'dash-focus-copy' },
        h('b', {}, w.topic),
        h('small', {}, w.subject + ' · ' + (w.accuracy === null ? 'Needs practice' : w.accuracy + '% accuracy'))),
      h('button', { class: 'dash-text-action', onclick: () => go('#/revision' + q({ subject: w.subject, topic: w.topic })) }, 'Revise →')));
  let focusBlock;
  if (focusRows.length) {
    focusBlock = h('div', { class: 'dash-focus-list' }, focusRows);
  } else {
    focusBlock = h('div', { class: 'dash-empty-focus' },
      h('span', { class: 'dash-empty-icon', 'aria-hidden': 'true' }, svg(ICONS.progress)),
      h('div', {},
        h('b', {}, 'No strong or weak subjects set yet.'),
        h('p', {}, 'Add your subjects in your profile and practise a few questions. We’ll highlight the areas that need the most attention.'),
        h('a', { class: 'dash-inline-link', href: '#/profile' }, 'Add them in your profile →')));
  }

  const heroBadges = h('div', { class: 'dash-hero-badges' },
    h('span', { class: 'dash-hero-badge' }, svg(ICONS.dashboard), ' PREPARING FOR: ' + (d.exam && d.exam.name || 'Your exam')),
    h('span', { class: 'dash-hero-badge dash-target-badge' }, daysLabel));
  const heroActions = h('div', { class: 'dash-hero-actions' },
    h('a', { class: 'btn dash-primary-action', href: '#/practice?start=1' }, 'Start practice', h('span', { 'aria-hidden': 'true' }, '→')),
    h('a', { class: 'btn dash-secondary-action', href: '#/tests' }, 'Take a mock test'),
    h('a', { class: 'btn dash-secondary-action dash-ai-action', href: '#/tutor' }, svg(ICONS.tutor), ' Ask AI tutor'));
  const heroGoal = h('div', { class: 'dash-goal' },
    h('div', { class: 'dash-goal-heading' },
      h('span', {}, svg(ICONS.dashboard), ' Today’s goal · ' + dailyGoal + ' questions'),
      h('b', {}, doneToday + '/' + dailyGoal)),
    h('div', { class: 'dash-goal-track', role: 'progressbar', 'aria-valuemin': '0', 'aria-valuemax': String(dailyGoal), 'aria-valuenow': String(Math.min(doneToday, dailyGoal)), 'aria-label': 'Questions completed today' },
      h('span', { style: 'width:' + goalPct + '%' })));
  const hero = h('section', { class: 'dashboard-hero' },
    h('div', { class: 'dash-hero-orb', 'aria-hidden': 'true' }),
    heroBadges,
    h('h1', { class: 'dash-hero-title' }, (d.greeting || 'Hello') + ', ' + (d.name || 'Student') + '.'),
    h('h2', { class: 'dash-hero-prompt' }, greeting),
    h('p', { class: 'dash-hero-copy' }, (d.questions_solved || 0) === 0 ? 'Solve a short practice set so the app can learn your strengths and build your plan.' : 'You have solved ' + d.questions_solved + ' question' + (d.questions_solved === 1 ? '' : 's') + ' with ' + pct(d.accuracy) + ' accuracy. Keep the momentum going.'),
    heroActions,
    heroGoal);

  const examChipButtons = chipExams.map(({ exam, label }) =>
    h('button', {
      type: 'button',
      class: 'dash-exam-chip' + (exam.id === S.user.exam_id ? ' selected' : ''),
      'aria-pressed': exam.id === S.user.exam_id ? 'true' : 'false',
      title: exam.name,
      onclick: () => chooseExam(exam.id)
    }, label));
  const examPicker = h('section', { class: 'dash-exam-picker' },
    h('div', { class: 'dash-exam-picker-head' },
      h('span', { class: 'dash-section-kicker' }, 'YOUR TARGET EXAM'),
      h('a', { class: 'dash-inline-link', href: '#/profile' }, 'Change exam & preferences')),
    h('div', { class: 'dash-exam-chiprow' }, examChipButtons));

  const stats = h('section', { class: 'dash-stat-grid', 'aria-label': 'Your progress' },
    metric('QUESTIONS DONE', String(d.questions_solved || 0), (d.streak || 0) + '-day streak', 'dashboard'),
    metric('ACCURACY', pct(d.accuracy), 'All attempts so far', 'progress'),
    metric('TESTS TAKEN', String(submittedTests.length), 'Practice and mock', 'mock'),
    metric('BOOKMARKS', String(bookmarkCount), 'Saved to revise', 'bookmarks'));

  const recommendHead = h('div', { class: 'dash-panel-head' },
    h('div', {}, h('h2', {}, 'What should I do now?'), h('p', {}, 'Your next best step, picked from your progress.')),
    h('a', { class: 'dash-inline-link', href: '#/tests' }, 'All tests →'));
  const recommendRow = h('div', { class: 'dash-recommend-row' },
    h('span', { class: 'dash-recommend-icon', 'aria-hidden': 'true' }, svg(ICONS.tests)),
    h('div', { class: 'dash-recommend-copy' },
      h('b', {}, reco.title || 'Start a focused practice session'),
      h('p', {}, reco.detail || 'Take a short practice set to see what you already know and what to revise next.'),
      h('div', { class: 'dash-recommend-meta' }, h('span', {}, '✦ Personalised pick'), h('span', {}, 'Based on your progress'))),
    h('button', { class: 'btn dash-recommend-cta', onclick: () => doAction(reco.action || { type: 'practice' }) },
      String(reco.cta || 'Start now').replace(/\s*[→➜>]+\s*$/, ''), h('span', { 'aria-hidden': 'true' }, '→')));
  const recommendPanel = h('section', { class: 'card dash-panel' },
    recommendHead,
    recommendRow,
    h('div', { class: 'dash-panel-foot' },
      h('a', { class: 'dash-secondary-link', href: '#/practice?start=1' }, 'Practice questions'),
      h('a', { class: 'dash-secondary-link', href: '#/pyqs' }, 'Explore PYQs')));

  const focusHead = h('div', { class: 'dash-panel-head' },
    h('div', {}, h('h2', {}, 'Your focus areas'), h('p', {}, 'Built from your practice and updated as you learn.')));
  const focusPanel = h('section', { class: 'card dash-panel dash-focus-panel' }, focusHead, focusBlock);
  const columns = focusPanel;

  let recentBlock = null;
  if ((d.recent_tests || []).length) {
    const rows = d.recent_tests.slice(0, 5).map(t =>
      h('a', { class: 'dash-recent-row', href: '#/result/' + t.id },
        h('span', { class: 'dash-recent-mark', 'aria-hidden': 'true' }, svg(ICONS.tests)),
        h('span', { class: 'dash-recent-copy' },
          h('b', {}, t.title),
          h('small', {}, (t.score ?? '—') + '/' + (t.max ?? '—') + ' marks')),
        h('span', { class: 'dash-recent-score' }, pct(t.accuracy))));
    recentBlock = h('section', { class: 'card dash-recent-panel' },
      h('div', { class: 'dash-panel-head' },
        h('div', {}, h('h2', {}, 'Recent performance'), h('p', {}, 'Your latest mock and practice test results.')),
        h('a', { class: 'dash-inline-link', href: '#/tests' }, 'All tests →')),
      h('div', { class: 'dash-recent-list' }, rows));
  }

  return h('div', { class: 'dashboard stack' }, hero, recommendPanel, examPicker, stats, columns, recentBlock);
}

// ---------- question session runner (practice / mistakes / PYQ) ----------
function runSession(questions, { mode = 'practice', onFinish, title, examId } = {}) {
  let i = 0, correct = 0, startedAt = 0; const box = h('div', { class: 'stack' });
  function show() {
    if (i >= questions.length) return finish();
    const qn = questions[i]; let chosen = null, locked = false; startedAt = Date.now();
    const fb = h('div'), opts = h('div'), submit = h('button', { class: 'btn primary', disabled: true }, 'Check Answer');
    const letters = 'ABCDEF';
    const drawOpts = (res) => opts.replaceChildren(...qn.options.map((o, k) => h('button', { class: 'opt' + (res ? (k === res.correct_index ? ' right' : (k === chosen ? ' wrong' : '')) : (k === chosen ? ' sel' : '')), disabled: locked, 'aria-pressed': k === chosen, onclick: () => { chosen = k; submit.disabled = false; drawOpts(); } }, h('span', { class: 'k' }, letters[k]), h('span', {}, o))));
    submit.onclick = async () => {
      locked = true; submit.disabled = true; submit.replaceChildren(h('span', { class: 'spin' }));
      try {
        const r = await post('/api/practice/answer', { question_id: qn.id, choice: chosen, time_ms: Date.now() - startedAt, mode, exam_id: examId }); if (r.correct) correct++;
        drawOpts(r); submit.remove(); fb.replaceChildren(feedback(r, qn, qn.options)); fb.append(h('div', { class: 'row', style: 'margin-top:1rem' },
          h('button', { class: 'btn primary', onclick: () => { i++; show(); } }, i + 1 < questions.length ? 'Next Question →' : 'Finish'),
          bookmarkBtn('question', qn.id, qn.text), h('button', { class: 'btn', onclick: () => go('#/tutor' + q({ ask: 'Explain this question in detail: ' + qn.text })) }, 'Ask AI')));
      } catch (e) { locked = false; submit.disabled = false; submit.textContent = 'Check Answer'; fb.replaceChildren(errBox(e, () => submit.onclick())); drawOpts(); }
    };
    drawOpts();
    box.replaceChildren(h('div', { class: 'row between' }, h('b', {}, title || 'Practice'), h('span', { class: 'muted small' }, `Question ${i + 1} of ${questions.length}`)), h('div', { class: 'bar' }, h('i', { style: `width:${Math.round(100 * i / questions.length)}%` })),
      h('div', { class: 'card stack' }, h('div', { class: 'row' }, srcBadge(qn), h('span', { class: 'badge' }, qn.subject + ' · ' + qn.topic), h('span', { class: 'badge' }, qn.difficulty)), h('div', { class: 'q-text' }, qn.text), opts, submit, fb));
  }
  function finish() {
    box.replaceChildren(h('div', { class: 'card center stack' }, h('div', { style: 'font-size:2.5rem' }, correct / questions.length >= .7 ? '🎉' : '💪'), h('h2', {}, `${correct} / ${questions.length} correct`), h('div', { class: 'bar ' + (correct / questions.length >= .7 ? 'ok' : 'warn') }, h('i', { style: `width:${Math.round(100 * correct / questions.length)}%` })),
      h('p', { class: 'muted' }, correct < questions.length ? 'Wrong answers were added to My Mistakes so you can revise them.' : 'Perfect set. Try a harder one.'),
      h('div', { class: 'row', style: 'justify-content:center' }, h('button', { class: 'btn primary', onclick: () => onFinish && onFinish() }, 'Continue'), correct < questions.length ? h('a', { class: 'btn', href: '#/revision?mistakes=1' }, 'Revise My Mistakes') : null)));
  }
  show(); return box;
}
function feedback(r, qn, options) {
  const wrap = h('div', {});
  wrap.append(h('div', { class: 'sol ' + (r.correct ? 'good' : 'badc') }, h('h4', {}, r.correct ? 'Correct ✓' : 'Not quite ✗'), h('div', {}, h('b', {}, 'Correct Answer: '), `${'ABCDEF'[r.correct_index]} — ${options[r.correct_index]}`)));
  if (!r.correct && r.mistake) wrap.append(h('div', { class: 'sol badc' }, h('h4', {}, 'Mistake analysis'), h('p', {}, h('b', {}, 'Your Answer: '), r.mistake.your_answer), h('p', {}, h('b', {}, 'Correct Answer: '), r.mistake.correct_answer), h('p', {}, h('b', {}, 'Where You Went Wrong: '), r.mistake.where_wrong), h('p', {}, h('b', {}, 'Correct Concept: '), r.mistake.correct_concept), h('p', {}, h('b', {}, 'How to Avoid This Mistake: '), r.mistake.how_to_avoid)));
  else { wrap.append(h('div', { class: 'sol' }, h('h4', {}, 'Why?'), h('p', {}, r.explanation))); if (r.concept) wrap.append(h('div', { class: 'sol' }, h('h4', {}, 'Concept'), h('p', {}, r.concept))); }
  if (r.tip && r.correct) wrap.append(h('div', { class: 'sol' }, h('h4', {}, 'Exam Tip'), h('p', {}, r.tip)));
  return wrap;
}
function bookmarkBtn(kind, ref, title, body) {
  const b = h('button', { class: 'btn', onclick: async () => { try { const r = await post('/api/bookmarks', { kind, ref_id: String(ref), title: String(title).slice(0, 180), body }); toast(r.saved ? 'Saved to My Library' : 'Removed from My Library'); } catch (e) { toast(e.message); } } }, '🔖 Bookmark');
  return b;
}

// ---------- practice ----------
async function pgPractice(parts, params) {
  const paperId = params.get('paper') || '';
  if (S.user.exam_id === 'UPSC_CSE' && !paperId) {
    const choose = (id) => go('#/practice' + q({ paper: id }));
    return h('div', { class: 'stack' },
      h('h1', {}, 'UPSC CSE Practice'),
      h('p', { class: 'muted' }, 'Choose which Prelims paper you want to practise. Your main exam remains UPSC CSE.'),
      h('div', { class: 'grid g2' },
        h('button', { class: 'card stack', style: 'text-align:left;cursor:pointer', onclick: () => choose('UPSC_CSE') },
          h('span', { class: 'badge' }, 'Paper I'), h('h2', {}, 'General Studies'),
          h('p', { class: 'muted' }, 'History, Geography, Polity, Economy, Environment and General Awareness'),
          h('b', {}, '100 questions · 120 minutes'), h('span', { class: 'btn primary' }, 'Practise Paper I →')),
        h('button', { class: 'card stack', style: 'text-align:left;cursor:pointer', onclick: () => choose('UPSC_CSAT') },
          h('span', { class: 'badge' }, 'Paper II · Qualifying'), h('h2', {}, 'CSAT'),
          h('p', { class: 'muted' }, 'Quantitative Aptitude, Reasoning and English Comprehension'),
          h('b', {}, '80 questions · 120 minutes'), h('span', { class: 'btn primary' }, 'Practise CSAT →'))));
  }
  const examId = S.user.exam_id === 'UPSC_CSE' && ['UPSC_CSE','UPSC_CSAT'].includes(paperId) ? paperId : S.user.exam_id;
  const ex = (await get('/api/exams/' + examId)).exam; const box = h('div', { class: 'stack' });
  const sel = { subject: params.get('subject') || '', topic: params.get('topic') || '', difficulty: '', source: '' };
  async function start(src, titleOverride) {
    box.replaceChildren(h('div', { class: 'empty' }, h('span', { class: 'spin' }), ' Preparing questions…'));
    try {
      const r = await get('/api/practice/questions' + q({ ...sel, source: src ?? sel.source, limit: 20, exam_id: examId }));
      if (!r.questions.length) { setup(h('div', { class: 'note' }, 'No questions found for this selection yet. Try another topic, or generate questions with the AI Tutor.')); return; }
      box.replaceChildren(runSession(r.questions, { mode: 'practice', title: titleOverride || sel.topic || sel.subject || 'Mixed practice', examId, onFinish: () => setup() }));
    } catch (e) { setup(errBox(e, () => start(src, titleOverride))); }
  }
  async function startSmart() {
    try {
      const plan = await get('/api/practice/smart' + q({ exam_id: examId }));
      sel.subject = plan.subject || '';
      sel.topic = plan.topic || '';
      sel.difficulty = plan.difficulty || 'medium';
      sel.source = '';
      await start(undefined, 'Smart Practice');
    } catch (e) { setup(errBox(e, startSmart)); }
  }
  function setup(extra) {
    const subj = h('select', { 'aria-label': 'Subject', onchange: (e) => { sel.subject = e.target.value; sel.topic = ''; setup(); } }, h('option', { value: '' }, 'All subjects'), ex.syllabus.map(s => h('option', { value: s.subject, selected: s.subject === sel.subject }, s.subject)));
    const topics = ex.syllabus.find(s => s.subject === sel.subject)?.topics || [];
    const top = h('select', { 'aria-label': 'Topic', disabled: !sel.subject, onchange: (e) => sel.topic = e.target.value }, h('option', { value: '' }, 'All topics'), topics.map(t => h('option', { value: t, selected: t === sel.topic }, t)));
    const dif = h('select', { 'aria-label': 'Difficulty', onchange: (e) => sel.difficulty = e.target.value }, [['', 'Any difficulty'], ['easy', 'Easy'], ['medium', 'Medium'], ['hard', 'Hard']].map(([v, l]) => h('option', { value: v, selected: v === sel.difficulty }, l)));
    box.replaceChildren(h('div', { class: 'row between' }, h('h1', {}, 'Practice'), S.user.exam_id === 'UPSC_CSE' ? h('a', { class: 'btn ghost sm', href: '#/practice' }, '← Choose paper') : null), h('p', { class: 'muted' }, `Questions for ${ex.name} only. Every question shows where it came from.`), examId === 'UPSC_CSAT' ? h('div', { class: 'info' }, 'CSAT is a qualifying paper. You need at least 33% to qualify.') : null, extra || null,
      h('div', { class: 'card stack' }, h('div', { class: 'grid g3' }, h('div', {}, h('label', {}, 'Subject'), subj), h('div', {}, h('label', {}, 'Topic'), top), h('div', {}, h('label', {}, 'Difficulty'), dif)),
        h('div', { class: 'row' }, h('button', { class: 'btn primary', onclick: () => start() }, 'Practice Now'), h('button', { class: 'btn', onclick: () => startSmart() }, '✨ Smart Practice'), h('a', { class: 'btn', href: '#/revision?mistakes=1' }, 'Revise My Mistakes'), S.config.ai_enabled ? h('button', { class: 'btn', onclick: () => genPanel() }, '✨ Generate AI questions') : null)));
  }
  function genPanel() {
    if (!sel.subject || !sel.topic) { toast('Pick a subject and topic first.'); return; }
    box.replaceChildren(h('div', { class: 'empty' }, h('span', { class: 'spin' }), ' Generating and validating questions…'));
    post('/api/ai/generate', { subject: sel.subject, topic: sel.topic, difficulty: sel.difficulty || 'medium', count: 5, exam_id: examId }).then(r => box.replaceChildren(runSession(r.questions, { mode: 'practice', title: 'AI Generated Practice', examId, onFinish: () => setup() }))).catch(e => setup(errBox(e, genPanel)));
  }
  if (params.get('start')) start(); else setup();
  return box;
}

// ---------- PYQs ----------
async function pgPyqs() {
  const [p, an] = await Promise.all([get('/api/pyq/papers'), get('/api/pyq/analysis')]);
  const box = h('div', { class: 'stack' });

  const official = [];
  if (S.user.exam_id === 'UPSC_CSE') {
    official.push(
      ['UPSC previous question papers', 'Official UPSC archive for Civil Services Prelims and other examinations', 'https://upsc.gov.in/examinations/previous-question-papers'],
      ['UPSC examination notifications', 'Check official notices and examination updates before relying on any paper or pattern', 'https://upsc.gov.in/']
    );
  } else if (S.user.exam_id === 'SSC_CGL') {
    official.push(
      ['SSC official examination portal', 'Official SSC notices, answer-key announcements and candidate login links for CGL', 'https://ssc.gov.in/']
    );
  }
  if (S.user.exam_id === 'SSC_CHSL') {
    official.push(
      ['SSC CHSL 2025 Tier-I', 'Official SSC final answer key / response-sheet access (candidate login)', 'https://sscexams.cbexams.com/chsl2025finalkeylandingpagedh/LoginNew.aspx'],
      ['SSC CHSL 2024 Tier-I', 'SSC notice confirming final answer keys were uploaded with question papers', 'https://ssc.gov.in/api/attachment/uploads/masterData/NoticeBoards/Final%20Answer%20Key%20and%20marks%20CHSLE%202024%20Tier-I161024.pdf']
    );
  }
  official.push(['SSC official examination portal', 'Use the official SSC portal for current notices, answer keys and paper access', 'https://ssc.gov.in/']);

  const sourceCard = h('div', { class: 'card stack' },
    h('h3', {}, 'Official PYQ sources'),
    h('p', { class: 'small muted' }, 'Official papers may require candidate login. Competitive Exam AI does not reproduce copyrighted papers as its own content.'),
    ...official.map(([title, desc, url]) => h('div', { class: 'row between', style: 'align-items:flex-start;gap:1rem' },
      h('div', {}, h('b', {}, title), h('p', { class: 'small muted', style: 'margin:.2rem 0 0' }, desc)),
      h('a', { class: 'btn sm', href: url, target: '_blank', rel: 'noopener' }, 'Open official source')
    )),
    h('div', { class: 'row' },
      h('button', { class: 'btn sm primary', onclick: () => startTest({ kind: 'pyq_pattern', count: 20 }) }, '20-question PYQ Pattern Mock'),
      h('span', { class: 'small muted' }, 'Clearly labelled as PYQ Pattern — not an official PYQ.')
    )
  );

  const verifiedCard = h('div', { class: 'card' },
    h('h3', {}, 'Verified papers'),
    p.papers.length
      ? h('div', { class: 'list' }, p.papers.map(x => h('div', { class: 'row between' },
          h('span', {}, h('b', {}, `${x.year} · ${x.paper}`), x.shift ? ` · ${x.shift}` : '',
            h('span', { class: 'muted small' }, ` · ${x.questions}/${x.expected_questions} questions`),
            h('span', { class: `badge ${x.complete ? 'good' : 'warn'}` }, x.complete ? 'Complete paper' : 'Incomplete · practice only')),
          h('button', { class: `btn sm ${x.complete ? 'primary' : ''}`, disabled: !x.complete, title: x.complete ? 'Start verified paper' : 'Complete this paper before using real PYQ mode', onclick: () => startTest({ kind: 'pyq', year: x.year, paper: x.paper, shift: x.shift }) }, x.complete ? 'Take as test' : 'Not complete')
        )))
      : h('div', { class: 'empty' }, 'No verified PYQ papers have been imported for this exam yet. Official-source links are provided above.'));

  const analysis = h('div', { class: 'card' },
    h('h3', {}, 'PYQ analysis'),
    an.sufficient
      ? h('div', { class: 'stack' }, h('p', { class: 'small muted' }, `Based on ${an.total} verified questions.`),
          h('table', {}, h('thead', {}, h('tr', {}, h('th', {}, 'Top topics'), h('th', {}, 'Questions'))),
            h('tbody', {}, an.top_topics.map(t => h('tr', {}, h('td', {}, `${t.subject} → ${t.topic}`), h('td', {}, t.n))))))
      : h('p', { class: 'muted' }, an.message)
  );

  return h('div', { class: 'stack' },
    h('div', { class: 'row between' }, h('h1', {}, 'Previous Year Questions')),
    h('div', { class: 'info' }, 'Only questions an admin has verified against an official source appear here as “Verified PYQ”. Real PYQ mode is enabled only when the selected year/paper has a complete question set. AI-written questions are never presented as PYQs.'),
    sourceCard, verifiedCard, analysis
  );
}

// ---------- current affairs ----------
async function pgCA() {
  let period = 'daily', category = '';
  const root = h('div', { class: 'stack' });
  async function draw() {
    root.replaceChildren(h('div', { class: 'empty' }, h('span', { class: 'spin' }), ' Loading sourced current affairs…'));
    try {
      const data = await get('/api/ca' + q({ period, category, limit: 50 }));
      const controls = h('div', { class: 'card stack' },
        h('div', { class: 'row between' },
          h('div', {}, h('h1', {}, 'Daily Current Affairs'), h('p', { class: 'muted small' }, 'Short, exam-focused points with original source links.')),
          S.user.role === 'admin' ? h('button', { class: 'btn', onclick: async (ev) => {
            const btn = ev.currentTarget; btn.disabled = true; btn.textContent = 'Refreshing…';
            try { const r = await post('/api/admin/ca/refresh', {}); toast('Feed refresh complete · ' + r.added + ' new items'); await draw(); }
            catch (e) { toast(e.message || 'Refresh failed'); btn.disabled = false; btn.textContent = 'Refresh now'; }
          } }, 'Refresh now') : null),
        h('div', { class: 'row wrap' },
          h('button', { class: 'btn ' + (period === 'daily' ? 'primary' : ''), onclick: () => { period = 'daily'; draw(); } }, 'Today'),
          h('button', { class: 'btn ' + (period === 'weekly' ? 'primary' : ''), onclick: () => { period = 'weekly'; draw(); } }, 'Last 7 days'),
          h('select', { 'aria-label': 'Filter current affairs category', onchange: (ev) => { category = ev.target.value; draw(); } },
            h('option', { value: '', selected: !category }, 'All categories'),
            (data.categories || []).map(cat => h('option', { value: cat, selected: category === cat }, cat)))),
        h('p', { class: 'small muted' }, 'Auto-refresh: official feeds every 6 hours; sourced AI digest daily at 7:00 AM IST when Gemini grounding is configured.'));
      const cards = (data.items || []).map(item => {
        const sentences = String(item.summary || '').split(/(?:\\n+|(?<=[.!?])\\s+|;\\s+)/).map(s => s.replace(/^\\s*(?:[-•*]|\\d+[.)])\\s*/, '').trim()).filter(Boolean);
        const points = sentences.length ? sentences.slice(0, 4) : [String(item.title || '')];
        const source = String(item.source || '');
        let sourceNode = /^https?:\\/\\//i.test(source)
          ? h('a', { href: source, target: '_blank', rel: 'noopener noreferrer' }, 'Read original source ↗')
          : h('span', { class: 'small muted' }, source ? 'Source: ' + source : 'Source link unavailable');
        return h('article', { class: 'card stack' },
          h('div', { class: 'row wrap' }, h('span', { class: 'badge' }, item.category || 'Current Affairs'), h('span', { class: 'small muted' }, item.event_date || 'Recent')),
          h('h2', {}, item.title),
          h('ul', { class: 'ca-points' }, points.map(point => h('li', {}, point))),
          h('div', { class: 'row between wrap' }, sourceNode, h('button', { class: 'btn sm', onclick: async () => {
            try { await post('/api/library/save-ca', { id: item.id }); toast('Saved to your library'); }
            catch { toast('Use the bookmark option if available for this item.'); }
          } }, 'Save for revision')));
      });
      root.replaceChildren(controls, ...(cards.length ? cards : [h('div', { class: 'card empty stack' },
        h('h2', {}, 'No items for this period yet'),
        h('p', {}, 'The feed may not have published a relevant update today. Switch to “Last 7 days” or check back after the next automatic refresh.'),
        h('p', { class: 'small muted' }, 'Only items with a source link or an official feed origin should be relied on for revision.'))));
    } catch (e) {
      root.replaceChildren(h('div', { class: 'card stack' }, h('h1', {}, 'Daily Current Affairs'), errBox(e, draw)));
    }
  }
  await draw();
  return root;
}

// ---------- revision ----------
async function pgRevision(parts, params) {
  if (params.get('mistakes')) return revMistakes();
  if (params.get('topic')) return revTopic(params.get('subject'), params.get('topic'));
  const r = await get('/api/revision/queue'); const label = { high: ['High Priority', 'bad'], medium: ['Medium Priority', 'warn'], low: ['Low Priority', ''] };
  return h('div', { class: 'stack' }, h('div', { class: 'row between' }, h('h1', {}, 'Revision'), h('a', { class: 'btn primary', href: '#/revision?mistakes=1' }, 'Revise My Mistakes')),
    h('p', { class: 'muted' }, 'Revise → test → analyse → repeat. Priorities come from your own answers; spaced reminders at 1, 3, 7 and 14 days.'),
    r.queue.length ? ['high', 'medium', 'low'].map(pr => { const items = r.queue.filter(x => x.priority === pr); return items.length ? h('div', { class: 'card' }, h('span', { class: 'badge ' + label[pr][1] }, label[pr][0]), h('div', { class: 'list' }, items.map(x => h('div', { class: 'row between' }, h('span', {}, h('b', {}, x.topic), h('span', { class: 'muted small' }, ` · ${x.subject} · ${x.reason}`)), h('button', { class: 'btn sm primary', onclick: () => go('#/revision' + q({ subject: x.subject, topic: x.topic })) }, 'Revise')))) ) : null; })
      : h('div', { class: 'card empty' }, 'Nothing needs revision yet. Practise some questions and the system will tell you what to revise.'),
    h('div', { class: 'card' }, h('h3', {}, 'Pick any topic'), topicPicker((s, t) => go('#/revision' + q({ subject: s, topic: t })))));
}
function topicPicker(onPick) {
  const ex = S.examDetail; const wrap = h('div'); get('/api/exams/' + S.user.exam_id).then(({ exam }) => {
    const chosen = Array.isArray(S.user.selected_subjects) && S.user.selected_subjects.length ? S.user.selected_subjects : exam.subjects;
    const syllabus = exam.syllabus.filter(s => chosen.includes(s.subject));
    let subj = syllabus[0]?.subject; const draw = () => {
      const current = syllabus.find(s => s.subject === subj) || syllabus[0];
      wrap.replaceChildren(
        h('div', { class: 'chips' }, syllabus.map(s => h('button', { class: 'chip' + (s.subject === subj ? ' on' : ''), onclick: () => { subj = s.subject; draw(); } }, s.subject))),
        current ? h('div', { class: 'chips', style: 'margin-top:.6rem' }, current.topics.map(t => h('button', { class: 'chip', onclick: () => onPick(subj, t) }, t))) : h('p', { class: 'muted' }, 'No selected subjects yet.')
      );
    }; draw();
  }).catch(e => wrap.replaceChildren(errBox(e))); return wrap;
}
async function revTopic(subject, topic) {
  const c = await get('/api/revision/content' + q({ subject, topic })); const box = h('div', { class: 'stack' }); const n = c.notes;
  const sec = (t, items) => items && items.length ? h('div', { class: 'card' }, h('h3', {}, t), h('ul', {}, items.map(x => h('li', {}, x)))) : null;
  const aiBox = h('div');
  const aiBtn = (kind, label) => h('button', { class: 'btn sm', onclick: async (e) => { e.target.disabled = true; aiBox.replaceChildren(h('div', { class: 'empty' }, h('span', { class: 'spin' }), ' Generating…')); try { const r = await post('/api/ai/notes', { kind, subject, topic }); aiBox.replaceChildren(h('div', { class: 'card' }, h('span', { class: 'badge ai' }, 'AI Generated · double-check key facts'), md(r.text))); } catch (er) { aiBox.replaceChildren(errBox(er, () => e.target.click())); } e.target.disabled = false; } }, label);
  box.append(h('div', { class: 'row between' }, h('div', {}, h('span', { class: 'badge' }, 'Step 1 of 4 · Revision'), h('h1', {}, topic), h('p', { class: 'muted' }, subject)), h('a', { class: 'btn ghost', href: '#/revision' }, '← All topics')));
  if (n) { box.append(sec('Concepts', n.concepts), sec('Important formulas', n.formulas), sec('Key points', n.keypoints), n.examples?.length ? h('div', { class: 'card' }, h('h3', {}, 'Solved examples'), n.examples.map(x => h('div', { class: 'sol' }, h('b', {}, x.q), h('p', {}, x.a)))) : null); }
  else box.append(h('div', { class: 'info' }, 'No curated notes exist for this topic yet.' + (c.ai_available ? ' You can generate notes below.' : ' Ask your admin to enable AI to generate notes.')));
  if (c.mistakes.length) box.append(h('div', { class: 'card' }, h('h3', {}, 'Your previous mistakes here'), h('div', { class: 'list' }, c.mistakes.map(m => h('div', {}, h('div', {}, m.text), h('p', { class: 'small muted' }, m.concept || m.explanation))))));
  if (c.pyq_concepts.length) box.append(h('div', { class: 'card' }, h('h3', {}, 'Important PYQ concepts'), h('ul', {}, c.pyq_concepts.map(p => h('li', {}, p.concept || p.text)))));
  if (c.ai_available) box.append(h('div', { class: 'card' }, h('h3', {}, 'Generate study material'), h('div', { class: 'row' }, aiBtn('short', 'Short notes'), aiBtn('formula', 'Formula sheet'), aiBtn('onepage', 'One-page sheet'), aiBtn('flashcards', 'Flashcards')), aiBox));
  const done = h('button', { class: 'btn primary', onclick: async () => { done.disabled = true; try { await post('/api/revision/complete', { subject, topic }); toast('Revision complete 🎯'); startTest({ kind: 'topic', subject, topic, count: 10 }); } catch (e) { toast(e.message); done.disabled = false; } } }, 'I’ve revised → Start Test');
  box.append(h('div', { class: 'row' }, done, h('button', { class: 'btn', onclick: () => go('#/practice' + q({ subject, topic, start: 1 })) }, 'Practice first')));
  return box;
}
async function revMistakes() {
  const r = await get('/api/mistakes?limit=10');
  if (!r.total) return h('div', { class: 'stack' }, h('h1', {}, 'Revise My Mistakes'), h('div', { class: 'card empty' }, 'No unresolved mistakes. Nice work!'));
  return h('div', { class: 'stack' }, h('div', { class: 'info' }, `${r.total} unresolved mistake(s). Get one right to lower its weakness score; get it wrong and it rises.`), runSession(r.mistakes, { mode: 'mistake', title: 'Revise My Mistakes', onFinish: () => go('#/revision') }));
}

// ---------- tests ----------
async function pgTests(parts, params) {
  const paperId = params.get('paper') || '';
  if (S.user.exam_id === 'UPSC_CSE' && !paperId) {
    const choose = (id) => go('#/tests' + q({ paper: id }));
    return h('div', { class: 'stack' },
      h('h1', {}, 'UPSC CSE Mock Tests'),
      h('p', { class: 'muted' }, 'Choose a paper to build a mock test. Both papers remain under your UPSC CSE account.'),
      h('div', { class: 'grid g2' },
        h('button', { class: 'card stack', style: 'text-align:left;cursor:pointer', onclick: () => choose('UPSC_CSE') },
          h('span', { class: 'badge' }, 'Paper I'), h('h2', {}, 'General Studies'),
          h('p', { class: 'muted' }, 'Full-length Prelims Paper I mock'),
          h('b', {}, '100 questions · 120 minutes'), h('span', { class: 'btn primary' }, 'Create Paper I Mock →')),
        h('button', { class: 'card stack', style: 'text-align:left;cursor:pointer', onclick: () => choose('UPSC_CSAT') },
          h('span', { class: 'badge' }, 'Paper II · Qualifying'), h('h2', {}, 'CSAT'),
          h('p', { class: 'muted' }, 'Full-length aptitude, reasoning and comprehension mock'),
          h('b', {}, '80 questions · 120 minutes'), h('span', { class: 'btn primary' }, 'Create CSAT Mock →'))));
  }
  const examId = S.user.exam_id === 'UPSC_CSE' && ['UPSC_CSE','UPSC_CSAT'].includes(paperId) ? paperId : S.user.exam_id;
  const [list, ex] = await Promise.all([get('/api/tests' + q({ exam_id: examId })), get('/api/exams/' + examId)]); const exam = ex.exam;
  const availableSubjects = Array.isArray(S.user.selected_subjects) && S.user.selected_subjects.length ? S.user.selected_subjects : exam.subjects;
  const o = { kind: 'full_mock', subject: availableSubjects[0], topic: '', count: 20, difficulty: 'any', minutes: '', mode: 'real' }; const form = h('div', { class: 'card stack' });
  const KINDS = [['full_mock', 'Full Mock'], ['sectional', 'Sectional Mock'], ['subject', 'Subject Test'], ['topic', 'Topic Test'], ['pyq', 'PYQ Test'], ['pyq_pattern', 'PYQ Pattern Mock'], ['ai_mock', 'AI Generated Mock'], ['weak_topic', 'Weak Topic Test']];
  function draw() {
    const realMode = o.kind === 'full_mock' && o.mode === 'real';
    const needS = ['sectional', 'subject', 'topic'].includes(o.kind), needT = o.kind === 'topic', needN = ['subject', 'topic', 'weak_topic', 'pyq_pattern', 'ai_mock'].includes(o.kind), needD = ['subject', 'topic', 'sectional', 'ai_mock'].includes(o.kind) || (o.kind === 'full_mock' && !realMode);
    const topics = exam.syllabus.find(s => s.subject === o.subject)?.topics || []; if (needT && !topics.includes(o.topic)) o.topic = topics[0];
    const f = (l, el) => h('div', {}, h('label', {}, l), el);
    form.replaceChildren(h('div', { class: 'row between' }, h('h2', {}, 'Create My Test'), S.user.exam_id === 'UPSC_CSE' ? h('a', { class: 'btn ghost sm', href: '#/tests' }, '← Choose paper') : null), h('div', { class: 'chips' }, KINDS.map(([k, l]) => h('button', { class: 'chip' + (o.kind === k ? ' on' : ''), onclick: () => { o.kind = k; draw(); } }, l))),
      o.kind === 'full_mock' ? h('div', { class: 'chips blueprint-mode-picker' },
        h('button', { class: 'chip' + (realMode ? ' on' : ''), onclick: () => { o.mode = 'real'; draw(); } }, 'Real Exam Mode'),
        h('button', { class: 'chip' + (!realMode ? ' on' : ''), onclick: () => { o.mode = 'practice'; draw(); } }, 'Practice Mode')) : null,
      o.kind === 'full_mock' ? h('div', { class: 'info' }, `${exam.name} pattern: ${exam.pattern.sections.map(s => `${s.subject} ${s.questions} × ${s.marks} marks (−${s.negative})`).join(' · ')} · ${exam.pattern.minutes} min.` + (exam.pattern.audit?.sectionTimingMinutes && realMode ? ` Section timer: ${exam.pattern.audit.sectionTimingMinutes} minutes per section.` : '') + (exam.id === 'UPSC_CSAT' ? ' CSAT is qualifying (33% minimum).' : '') + (exam.verified ? '' : ' Subject splits are practice allocations where noted; confirm current details against the official notification.')) : null,
      realMode ? h('div', { class: 'blueprint-lock-note' }, 'Real Exam Mode fixes the configured paper length, section distribution, marking and duration. Difficulty targets are exam-style practice estimates, not official quotas; the result reports the actual question-bank mix.') : null,
      h('div', { class: 'grid g3' }, needS ? f('Subject', h('select', { onchange: (e) => { o.subject = e.target.value; draw(); } }, exam.syllabus.filter(s => availableSubjects.includes(s.subject)).map(s => h('option', { value: s.subject, selected: s.subject === o.subject }, s.subject)))) : null,
        needT ? f('Topic', h('select', { onchange: (e) => o.topic = e.target.value }, topics.map(t => h('option', { value: t, selected: t === o.topic }, t)))) : null,
        needN ? f('Number of questions', h('input', { type: 'number', min: 1, max: 100, value: o.count, oninput: (e) => o.count = +e.target.value })) : null,
        needD ? f('Difficulty', h('select', { onchange: (e) => o.difficulty = e.target.value }, [['any', 'Any'], ['easy', 'Easy'], ['medium', 'Medium'], ['hard', 'Hard']].map(([v, l]) => h('option', { value: v, selected: v === o.difficulty }, l)))) : null,
        !realMode ? f('Duration (minutes, optional)', h('input', { type: 'number', min: 1, max: 300, placeholder: 'Auto', value: o.minutes, oninput: (e) => o.minutes = e.target.value })) : null),
      h('button', { class: 'btn primary', style: 'align-self:flex-start', onclick: async (e) => { e.target.disabled = true; e.target.replaceChildren(h('span', { class: 'spin' }), ' Building…'); await startTest({ ...o, exam_id: examId, difficulty: realMode ? 'any' : o.difficulty, minutes: realMode ? undefined : (o.minutes || undefined) }); e.target.disabled = false; e.target.textContent = 'Start Test'; } }, 'Start Test'));
  } draw();
  return h('div', { class: 'stack mock-hub' },
    h('section', { class: 'mock-brand-hero' },
      h('div', { class: 'mock-brand-lockup' }, logo(), h('span', {}, 'COMPETITIVE EXAM AI')),
      h('div', { class: 'mock-hero-copy' }, h('span', { class: 'mock-eyebrow' }, 'YOUR EXAM. YOUR STRATEGY.'), h('h1', {}, 'Mock Test Arena'), h('p', {}, 'Practise under pressure. Learn from every answer. Walk into exam day prepared.'),
        h('div', { class: 'mock-promise-row' }, h('span', {}, '◷ Timed practice'), h('span', {}, '◎ Smart analysis'), h('span', {}, '↗ Track progress')))),
    h('div', { class: 'mock-section-heading' }, h('div', {}, h('h2', {}, 'Build your next test'), h('p', { class: 'muted' }, 'Choose a format, set your challenge, and get started.')),
      h('span', { class: 'badge' }, `${exam.name} · Personalised`)), form,
    h('div', { class: 'card mock-history' }, h('div', { class: 'mock-section-heading' }, h('div', {}, h('h2', {}, 'Your test history'), h('p', { class: 'muted' }, 'Every attempt is a step forward.'))), list.tests.length ? h('div', { class: 'list' }, list.tests.map(t => h('div', { class: 'row between' }, h('span', {}, h('b', {}, t.title), h('span', { class: 'muted small' }, ` · ${fmtDate(t.started_at)}`)), t.status === 'active' ? h('a', { class: 'btn sm accent', href: '#/test/' + t.id }, 'Resume Test') : h('span', { class: 'row' }, h('span', { class: 'badge' }, `${t.score}/${t.max} · ${pct(t.accuracy)}`), h('a', { class: 'btn sm', href: '#/result/' + t.id }, 'Analysis'))))) : h('p', { class: 'muted' }, 'No tests yet.')));
}
const fmtClock = (s) => `${String(Math.floor(s / 3600)).padStart(2, '0')}:${String(Math.floor(s % 3600 / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;

async function pgTestTake(parts) {
  const { test } = await get('/api/tests/' + parts[1]);
  if (test.status !== 'active') { location.replace('#/result/' + test.id); return h('div'); }
  const blueprint = test.blueprint || {};
  const timedSections = blueprint.timedSections ? (blueprint.sections || []).filter(s => Number(s.durationSeconds) > 0) : [];
  const st = { answers: { ...test.answers }, marked: new Set(test.marked.map(String)), times: { ...test.times }, idx: Math.min(test.current_idx || 0, test.questions.length - 1), dirty: false, submitting: false, paletteFilter: 'all', sectionId: null };
  const skew = test.serverNow - Date.now(); // keeps the timer honest even if the device clock is off
  const remaining = () => Math.max(0, Math.round((test.deadline - (Date.now() + skew)) / 1000));
  const elapsed = () => Math.max(0, ((Date.now() + skew) - test.started_at) / 1000);
  const currentSection = () => timedSections.find(s => elapsed() < s.endsAtOffsetSeconds) || timedSections[timedSections.length - 1] || null;
  const indexesFor = sec => test.questions.map((q, i) => ({ q, i })).filter(({ q }) => !sec || sec.questionIds.some(id => String(id) === String(q.id))).map(({ i }) => i);
  if (timedSections.length) { const sec = currentSection(); const ix = indexesFor(sec); if (!ix.includes(st.idx)) st.idx = ix[0] ?? 0; st.sectionId = sec?.id || null; }
  let enteredAt = Date.now(); const root = h('div', { class: 'stack' }), body = h('div'), pal = h('div'), timerEl = h('span', { class: 'timer' }), saveEl = h('span', { class: 'small muted' });
  const payload = () => ({ answers: st.answers, marked: [...st.marked].map(Number), times: st.times, current_idx: st.idx });
  const bank = () => { const id = test.questions[st.idx].id; st.times[id] = (st.times[id] || 0) + (Date.now() - enteredAt); enteredAt = Date.now(); };
  async function save() { if (!st.dirty || st.submitting) return; bank(); try { await put('/api/tests/' + test.id + '/save', payload()); st.dirty = false; saveEl.textContent = 'Saved ✓'; } catch { saveEl.textContent = 'Offline, will retry…'; } }
  const autosave = setInterval(save, 8000);
  const updateClock = () => {
    const total = remaining();
    if (timedSections.length) {
      const sec = currentSection();
      if (sec && sec.id !== st.sectionId) { bank(); st.sectionId = sec.id; st.idx = Math.max(0, indexesFor(sec)[0] ?? 0); st.dirty = true; draw(); save(); }
      const left = sec ? Math.max(0, Math.ceil(sec.endsAtOffsetSeconds - elapsed())) : total;
      timerEl.textContent = fmtClock(left); timerEl.classList.toggle('low', left < 120);
      overallTimerEl.textContent = fmtClock(total); overallTimerEl.classList.toggle('low', total < 300);
    } else { timerEl.textContent = fmtClock(total); timerEl.classList.toggle('low', total < 300); }
    if (total === 0 && !st.submitting) submit(true);
  };
  const tk = setInterval(updateClock, 250);
  const onHide = () => { if (document.hidden) save(); }; document.addEventListener('visibilitychange', onHide);
  onLeave(() => { clearInterval(autosave); clearInterval(tk); document.removeEventListener('visibilitychange', onHide); save(); });
  const touch = () => { st.dirty = true; saveEl.textContent = ''; };
  function draw() {
    const sec = timedSections.length ? currentSection() : null;
    const visibleIndexes = indexesFor(sec);
    if (timedSections.length && !visibleIndexes.includes(st.idx)) st.idx = visibleIndexes[0] ?? 0;
    const qn = test.questions[st.idx], letters = 'ABCDEF';
    body.replaceChildren(h('div', { class: 'card stack' }, h('div', { class: 'row between' }, h('div', { class: 'row' }, srcBadge(qn), h('span', { class: 'badge' }, qn.subject)), h('span', { class: 'muted small' }, `Question ${st.idx + 1} of ${test.questions.length}`)), sec ? h('div', { class: 'section-progress' }, h('b', {}, `Section ${sec.index + 1}: ${sec.name}`), h('span', {}, `${visibleIndexes.filter(i => st.answers[test.questions[i].id] !== undefined).length}/${visibleIndexes.length} answered · section locks when time expires`)) : null, h('div', { class: 'q-text' }, qn.text),
      h('div', {}, qn.options.map((o, k) => h('button', { class: 'opt' + (st.answers[qn.id] === k ? ' sel' : ''), 'aria-pressed': st.answers[qn.id] === k, onclick: () => { st.answers[qn.id] = k; touch(); draw(); } }, h('span', { class: 'k' }, letters[k]), h('span', {}, o)))),
      h('div', { class: 'row' }, h('button', { class: 'btn', onclick: () => { delete st.answers[qn.id]; touch(); draw(); } }, 'Clear'), h('button', { class: 'btn', onclick: () => { const k = String(qn.id); st.marked.has(k) ? st.marked.delete(k) : st.marked.add(k); touch(); draw(); } }, st.marked.has(String(qn.id)) ? '★ Unmark' : '☆ Mark for review'),
        h('span', { class: 'grow' }), h('button', { class: 'btn', disabled: st.idx === (visibleIndexes[0] ?? 0), onclick: () => move(-1) }, '← Prev'), h('button', { class: 'btn primary', disabled: st.idx === (visibleIndexes[visibleIndexes.length - 1] ?? test.questions.length - 1), onclick: () => move(1) }, 'Next →'))));
    const answered = Object.keys(st.answers).length;
    const unanswered = test.questions.length - answered;
    const filteredQuestions = test.questions.map((x, i) => ({ x, i })).filter(({ x, i }) =>
      (!sec || visibleIndexes.includes(i)) && (st.paletteFilter === 'all' ||
      (st.paletteFilter === 'unanswered' && st.answers[x.id] === undefined) ||
      (st.paletteFilter === 'marked' && st.marked.has(String(x.id)))));
    const filterButtons = [['all', 'All'], ['unanswered', 'Unanswered'], ['marked', 'Marked']].map(([v, label]) =>
      h('button', { class: 'chip' + (st.paletteFilter === v ? ' on' : ''), onclick: () => { st.paletteFilter = v; draw(); } }, label));
    pal.replaceChildren(
      h('div', { class: 'test-palette-summary' },
        h('div', {}, h('b', {}, answered + '/' + test.questions.length), h('span', {}, 'Answered')),
        h('div', {}, h('b', {}, unanswered), h('span', {}, 'Unanswered')),
        h('div', {}, h('b', {}, st.marked.size), h('span', {}, 'Marked for review'))),
      h('div', { class: 'chips test-palette-filters' }, filterButtons),
      filteredQuestions.length
        ? h('div', { class: 'pal' }, filteredQuestions.map(({ x, i }) => h('button', { class: (st.answers[x.id] !== undefined ? 'ans ' : '') + (st.marked.has(String(x.id)) ? 'mk ' : '') + (i === st.idx ? 'cur ' : '') + (st.answers[x.id] === undefined ? 'unanswered ' : ''), 'aria-label': `Question ${i + 1}`, title: `Question ${i + 1}${st.answers[x.id] !== undefined ? ' · Answered' : ' · Unanswered'}${st.marked.has(String(x.id)) ? ' · Marked for review' : ''}`, onclick: () => { bank(); st.idx = i; touch(); draw(); } }, i + 1)))
        : h('p', { class: 'empty' }, 'No questions match this filter.'),
      h('div', { class: 'test-palette-legend' }, h('span', {}, '● Answered'), h('span', {}, '○ Unanswered'), h('span', {}, '★ Marked for review')));
  }
  function move(d) { bank(); const sec = timedSections.length ? currentSection() : null; const ix = indexesFor(sec); const lo = sec ? ix[0] : 0, hi = sec ? ix[ix.length - 1] : test.questions.length - 1; st.idx = Math.max(lo, Math.min(hi, st.idx + d)); touch(); draw(); }
  async function submit(auto) {
    if (st.submitting) return;
    if (!auto) {
      const unanswered = test.questions.length - Object.keys(st.answers).length;
      const markedUnanswered = test.questions.filter(x => st.marked.has(String(x.id)) && st.answers[x.id] === undefined).length;
      const warning = unanswered ? `\\n\\n⚠ ${unanswered} question(s) are unanswered.` : '';
      const markedNote = st.marked.size ? `\\n${st.marked.size} marked for review (${markedUnanswered} unanswered).` : '';
      if (!confirm(`Submit ${test.title}?\\n\\nAnswered: ${Object.keys(st.answers).length}/${test.questions.length}${warning}${markedNote}\\n\\nYou cannot change answers after submission.`)) return;
    }
    st.submitting = true; bank(); const btn = $('#submitBtn'); if (btn) { btn.disabled = true; btn.replaceChildren(h('span', { class: 'spin' }), ' Submitting…'); }
    try { await post('/api/tests/' + test.id + '/submit', payload()); location.hash = '#/result/' + test.id; }
    catch (e) { st.submitting = false; if (btn) { btn.disabled = false; btn.textContent = 'Retry Submit'; } toast('Submit failed. Your answers are safe. Tap Retry Submit.'); }
  }
  const overallTimerEl = h('span', { class: 'timer overall-timer' });
  draw(); updateClock();
  root.append(h('div', { class: 'card row between test-sticky-header', style: 'position:sticky;top:60px;z-index:4' }, h('div', {}, h('b', {}, test.title), h('div', {}, saveEl)), timedSections.length ? h('div', { class: 'test-timers' }, h('span', { class: 'timer-caption' }, 'Section'), timerEl, h('span', { class: 'timer-caption' }, 'Overall'), overallTimerEl) : timerEl, h('button', { class: 'btn accent', id: 'submitBtn', onclick: () => submit(false) }, 'Submit Test')),
    h('div', { class: 'split' }, body, h('div', { class: 'card' }, h('h3', {}, 'Questions'), pal)));
  return root;
}

async function pgResult(parts) {
  const { test } = await get('/api/tests/' + parts[1]); if (test.status === 'active') { location.replace('#/test/' + test.id); return h('div'); }
  const r = test.result, c = r.coaching;
  const realism = test.blueprint?.realism || null;
  const difficultyDistribution = realism?.difficultyDistribution || {};
  const difficultyProfile = realism?.difficultyProfile || null;
  const blueprintSections = test.blueprint?.sections || []; const list = (t, a) => a && a.length ? h('div', { class: 'sol' }, h('h4', {}, t), h('ul', {}, a.map(x => h('li', {}, x)))) : null;
  const follow = h('button', { class: 'btn accent', onclick: () => c.recommended_revision ? go('#/revision' + q({ subject: c.recommended_revision.subject, topic: c.recommended_revision.topic })) : go('#/practice') }, 'Follow AI Recommendation');
  const nextAction = r.accuracy !== null && r.accuracy < 60 ? 'Accuracy is the priority: review wrong answers and redo a short topic set before another full mock.' : r.skipped / Math.max(r.total, 1) > 0.25 ? 'Pacing is the priority: try a timed set and answer the easiest questions first.' : r.wrong / Math.max(r.correct + r.wrong, 1) >= 0.3 ? 'Reduce avoidable negative marks: practise elimination and review each incorrect answer.' : 'Build consistency: revise your lowest-performing topic and test it again.';
  const answeredCount = r.correct + r.wrong;
  const scorePct = r.max > 0 ? Math.round(100 * r.score / r.max) : 0;
  const outcomeLabel = r.accuracy === null ? 'Not enough attempted answers to calculate accuracy' : r.accuracy >= 80 ? 'Strong accuracy' : r.accuracy >= 60 ? 'Developing accuracy' : 'Accuracy needs attention';
  const avgSeconds = answeredCount > 0 && r.total_minutes > 0 ? Math.round(r.total_minutes * 60 / answeredCount) : null;
  const wrongRate = answeredCount ? Math.round(100 * r.wrong / answeredCount) : 0;
  const skippedRate = r.total ? Math.round(100 * r.skipped / r.total) : 0;
  const marking = test.marking || {};
  const negativeMarksLost = Object.entries(r.by_subject || {}).reduce((sum, [subject, v]) => {
    const penalty = Number(marking[subject]?.negative) || 0;
    return sum + Math.max(0, v.attempted - v.correct) * penalty;
  }, 0);
  const metric = (label, value, note, tone) => h('div', { class: 'card result-metric' },
    h('span', { class: 'result-metric-label' }, label),
    h('b', { class: 'result-metric-value' + (tone ? ' ' + tone : '') }, value),
    h('span', { class: 'result-metric-note' }, note));

  return h('div', { class: 'stack' }, h('div', { class: 'hero' }, h('p', {}, test.title), h('h1', {}, `${r.score} / ${r.max}`), h('p', {}, `Accuracy ${pct(r.accuracy)} · ${r.correct} correct · ${r.wrong} wrong · ${r.skipped} skipped`), h('p', {}, `Attempted ${answeredCount}/${r.total} · Completion ${r.total ? Math.round(100 * answeredCount / r.total) : 0}% · Time ${r.total_minutes} min`), h('p', {}, `${outcomeLabel} · Score ${scorePct}% of maximum marks`)),
    realism ? h('div', { class: 'card stack real-exam-audit' },
      h('div', { class: 'row between' }, h('h2', {}, 'Real Exam Blueprint Audit'), h('span', { class: 'badge' }, String(realism.patternStatus || 'unverified').replaceAll('_',' '))),
      h('p', { class: 'muted small' }, 'This checks the configured paper structure. It does not certify generated questions as official previous-year questions.'),
      h('div', { class: 'grid g3' },
        metric('Paper structure', realism.patternIntegrity ? 'Consistent' : 'Review needed', 'Question count, section counts and marks'),
        metric('Easy', String(difficultyDistribution.easy || 0), 'Actual questions'),
        metric('Medium / Hard', String(difficultyDistribution.medium || 0) + ' / ' + String(difficultyDistribution.hard || 0), 'Actual questions')),
      difficultyProfile ? h('p', { class: 'small muted' }, difficultyProfile.label + '. Target mix: ' + Object.entries(difficultyProfile.targets || {}).map(([key,value]) => key + ' ' + value).join(' · ') + '. This is an internal estimate, not an official exam quota.') : null,
      blueprintSections.length ? h('div', { class: 'list' }, blueprintSections.map(section => h('div', { class: 'row between' },
        h('span', {}, section.name),
        h('span', { class: 'small muted' }, section.questionCount + ' questions · +' + section.marks + ' / −' + section.negative)))) : null,
      realism.sourceName && realism.sourceUrl ? h('p', { class: 'small' }, 'Pattern reference: ', h('a', { href: realism.sourceUrl, target: '_blank', rel: 'noopener noreferrer' }, realism.sourceName)) : null,
      (realism.limitations || []).length ? h('div', {}, h('b', {}, 'Known limitations'), h('ul', {}, realism.limitations.map(item => h('li', {}, item)))) : null
    ) : null,
    h('div', { class: 'result-metrics' },
      metric('Speed', avgSeconds === null ? '—' : `${Math.floor(avgSeconds / 60)}m ${avgSeconds % 60}s`, 'Average per attempted question'),
      metric('Wrong-answer rate', `${wrongRate}%`, `${r.wrong} incorrect out of ${answeredCount} attempted`, wrongRate >= 30 ? 'bad' : ''),
      metric('Negative marks lost', Number(negativeMarksLost.toFixed(2)).toString(), 'Estimated from this exam’s marking scheme', negativeMarksLost > 0 ? 'bad' : 'good')),
    h('div', { class: 'card result-pace' }, h('div', { class: 'row between' }, h('b', {}, 'Attempt profile'), h('span', { class: 'small muted' }, `${skippedRate}% skipped`)),
      h('div', { class: 'result-profile-bar' }, h('span', { class: 'result-profile-correct', style: `width:${r.total ? 100 * r.correct / r.total : 0}%` }), h('span', { class: 'result-profile-wrong', style: `width:${r.total ? 100 * r.wrong / r.total : 0}%` }), h('span', { class: 'result-profile-skipped', style: `width:${skippedRate}%` })),
      h('div', { class: 'result-profile-legend' }, h('span', {}, `● Correct ${r.correct}`), h('span', {}, `● Wrong ${r.wrong}`), h('span', {}, `● Skipped ${r.skipped}`))),
    h('div', { class: 'card' }, h('h2', {}, 'AI Analysis'), h('div', { class: 'sol' }, h('h4', {}, 'Your next best move'), h('p', {}, nextAction)), list('What went well', c.went_well), list('What went wrong', c.went_wrong), list('Time management', c.time_problems), list('Accuracy', c.accuracy_problems),
      c.strong_topics.length ? h('p', {}, h('b', {}, 'Strong topics: '), c.strong_topics.join(', ')) : null, c.weak_topics.length ? h('p', {}, h('b', {}, 'Weak topics: '), c.weak_topics.join(', ')) : null,
      c.recommended_revision ? h('p', {}, h('b', {}, 'Recommended revision: '), `${c.recommended_revision.topic} (${c.recommended_revision.subject})`) : null, h('p', {}, h('b', {}, 'Recommended next test: '), c.recommended_test.topic ? `${c.recommended_test.topic} topic test` : `${c.recommended_test.subject} test`),
      h('div', { class: 'row' }, follow, h('button', { class: 'btn', onclick: () => startTest(c.recommended_test) }, 'Take recommended test'))),
    h('div', { class: 'card' }, h('h3', {}, 'By subject'), h('table', {}, h('thead', {}, h('tr', {}, ['Subject', 'Attempted', 'Correct', 'Accuracy', 'Score'].map(x => h('th', {}, x)))), h('tbody', {}, Object.entries(r.by_subject).map(([s, v]) => h('tr', {}, h('td', {}, s), h('td', {}, `${v.attempted}/${v.total}`), h('td', {}, v.correct), h('td', {}, v.attempted ? `${Math.round(100 * v.correct / v.attempted)}%` : '—'), h('td', {}, `${Math.round(v.score * 100) / 100}/${v.max}`)))))),
    r.by_topic && r.by_topic.length ? h('div', { class: 'card' }, h('h3', {}, 'Topic performance'), h('p', {}, 'Use this breakdown to decide what to revise next. Topics with fewer than two attempts are early signals, not firm conclusions.'), h('table', {}, h('thead', {}, h('tr', {}, ['Topic', 'Subject', 'Attempted', 'Accuracy', 'Focus'].map(x => h('th', {}, x)))), h('tbody', {}, [...r.by_topic].sort((x, y) => (x.accuracy ?? 101) - (y.accuracy ?? 101)).map(t => h('tr', {}, h('td', {}, t.topic), h('td', {}, t.subject), h('td', {}, `${t.attempted}/${t.total}`), h('td', {}, t.attempted ? `${Math.round(t.accuracy)}%` : '—'), h('td', {}, t.attempted < 2 ? 'Keep practising' : t.accuracy < 50 ? 'Revise first' : t.accuracy < 75 ? 'Practise more' : 'Maintain')))))) : null,
    h('h2', {}, 'Review'), test.questions.map((qn, i) => { const ch = test.answers[qn.id], ok = ch === qn.answer;
      return h('div', { class: 'card stack' }, h('div', { class: 'row between' }, h('span', { class: 'row' }, h('b', {}, 'Q' + (i + 1)), srcBadge(qn), h('span', { class: 'badge' }, qn.topic)), h('span', { class: 'badge ' + (ch === undefined ? '' : ok ? 'ok' : 'bad') }, ch === undefined ? 'Skipped' : ok ? 'Correct' : 'Wrong')), h('div', { class: 'q-text' }, qn.text),
        h('div', {}, qn.options.map((o, k) => h('div', { class: 'opt ' + (k === qn.answer ? 'right' : k === ch ? 'wrong' : '') }, h('span', { class: 'k' }, 'ABCDEF'[k]), h('span', {}, o)))),
        ok ? h('div', { class: 'sol' }, h('h4', {}, 'Why?'), h('p', {}, qn.explanation)) : h('div', { class: 'sol badc' }, h('h4', {}, 'Mistake analysis'), ch !== undefined ? h('p', {}, h('b', {}, 'Your Answer: '), qn.options[ch]) : null, h('p', {}, h('b', {}, 'Correct Answer: '), qn.options[qn.answer]), h('p', {}, h('b', {}, ch === undefined ? 'Why this is correct: ' : 'Where You Went Wrong: '), qn.explanation), qn.concept ? h('p', {}, h('b', {}, 'Correct Concept: '), qn.concept) : null, qn.tip ? h('p', {}, h('b', {}, 'How to Avoid This Mistake: '), qn.tip) : null),
        h('div', { class: 'row' }, bookmarkBtn('question', qn.id, qn.text))); }));
}

boot();

// Installable app support. Cache only the public static shell; never cache API or student data.
if ('serviceWorker' in navigator && location.protocol === 'https:') {
  window.addEventListener('load', () => navigator.serviceWorker.register('/sw.js').catch(() => {}), { once: true });
}
