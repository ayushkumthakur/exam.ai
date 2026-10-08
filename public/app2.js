'use strict';
// Second half of the UI: tutor, current affairs, plan, progress, profile, library, search, admin.

const fileB64 = (f) => new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res({ media_type: f.type, data: String(r.result).split(',')[1] }); r.onerror = () => rej(new Error('Could not read that file.')); r.readAsDataURL(f); });
const ACCEPT = 'image/png,image/jpeg,image/webp,application/pdf';

// ---------- AI tutor ----------
async function pgTutor(parts, params) {
  const hist = S.config.ai_enabled ? (await get('/api/ai/history')).messages : [];
  const ex = (await get('/api/exams/' + S.user.exam_id)).exam; let tab = 'chat';
  const root = h('div', { class: 'stack' }), view = h('div', { class: 'stack' });
  const tabs = () => h('div', { class: 'chips' }, [['chat', 'Ask AI'], ['paper', 'Solve Paper'], ['gen', 'Generate Questions'], ['notes', 'Study Material']].map(([k, l]) => h('button', { class: 'chip' + (tab === k ? ' on' : ''), onclick: () => { tab = k; draw(); } }, l)));
  function draw() { root.replaceChildren(h('h1', {}, 'AI Tutor'), !S.config.ai_enabled ? h('div', { class: 'note' }, 'The AI is not configured on this server yet. The rest of the app works normally. An admin needs to set ANTHROPIC_API_KEY.') : null, tabs(), view); view.replaceChildren(); ({ chat: tChat, paper: tPaper, gen: tGen, notes: tNotes })[tab](); }

  function tChat() {
    const log = h('div', { class: 'chat', 'aria-live': 'polite' }), ta = h('textarea', { rows: 2, placeholder: `Ask a ${ex.name} doubt, paste a question, or attach a photo…`, 'aria-label': 'Your question' });
    const file = h('input', { type: 'file', accept: ACCEPT, hidden: true }), chosen = h('span', { class: 'small muted' }); let picked = null;
    file.onchange = () => { picked = file.files[0] || null; chosen.textContent = picked ? '📎 ' + picked.name : ''; };
    const sendBtn = h('button', { class: 'btn primary' }, 'Ask AI');
    let lastId = null;
    function addMsg(role, text, id) {
      const m = h('div', { class: 'msg ' + role }, role === 'assistant' ? md(text) : text); log.append(m);
      if (role === 'assistant') { if (id) m.append(actions(id, text)); } return m;
    }
    function actions(id, text) {
      const send = (mode, msg) => ask(msg || '', mode);
      const B = (l, f) => h('button', { class: 'btn sm', onclick: f }, l);
      return h('div', { class: 'row', style: 'margin-top:.7rem' }, B('Explain Simply', () => send('simple')), B('Explain in Detail', () => send('detail')), B('Show Another Method', () => send('another')), B('Explain Again', () => send('again')),
        B('Give Similar Question', () => ask('Give me one similar practice question on the same concept. Do not reveal the answer until I ask.')), B('Generate 5 Questions', () => { tab = 'gen'; draw(); }), B('Generate Quiz', () => { tab = 'gen'; draw(); }),
        B('Add to Revision', () => post('/api/bookmarks', { kind: 'revision', ref_id: 'ai' + id, title: 'AI explanation', body: text }).then(() => toast('Added to revision items')).catch(e => toast(e.message))),
        B('🔖 Bookmark', () => post('/api/bookmarks', { kind: 'ai', ref_id: 'ai' + id, title: 'AI explanation', body: text }).then(r => toast(r.saved ? 'Bookmarked' : 'Removed')).catch(e => toast(e.message))),
        B('Ask Follow-up', () => ta.focus()), h('span', { class: 'grow' }),
        B('👍 Helpful', () => fb(id, 'helpful')), B('👎 Not Helpful', () => fb(id, 'not_helpful')), B('Report Answer', () => { const n = prompt('What is wrong with this answer? (optional)') ; if (n !== null) fb(id, 'report', n); }));
    }
    const fb = (id, kind, note) => post('/api/ai/feedback', { conversation_id: id, kind, note }).then(() => toast(kind === 'report' ? 'Reported. An admin will review it.' : 'Thanks for the feedback')).catch(e => toast(e.message));
    async function ask(msg, mode) {
      const text = (msg ?? ta.value).trim(); if (!text && !picked && !mode) return;
      let files; try { files = picked ? [await fileB64(picked)] : undefined; } catch (e) { toast(e.message); return; }
      if (!mode) addMsg('user', text || '[uploaded file]'); else if (msg) addMsg('user', msg); else addMsg('user', { simple: 'Explain simply', detail: 'Explain in detail', another: 'Show another method', again: 'Explain again' }[mode]);
      ta.value = ''; picked = null; file.value = ''; chosen.textContent = '';
      const wait = h('div', { class: 'msg assistant' }, h('span', { class: 'spin' }), ' Thinking carefully…'); log.append(wait); sendBtn.disabled = true; wait.scrollIntoView({ block: 'nearest' });
      try { const r = await post('/api/ai/ask', { message: text, mode, files }); wait.remove(); lastId = r.id; addMsg('assistant', r.reply, r.id).scrollIntoView({ block: 'nearest' }); }
      catch (e) { wait.replaceChildren(h('div', {}, e.message), h('button', { class: 'btn sm', style: 'margin-top:.5rem', onclick: () => { wait.remove(); ta.value = text; if (files) toast('Re-attach your file to retry.'); } }, 'Try Again')); }
      sendBtn.disabled = false;
    }
    sendBtn.onclick = () => ask(); ta.addEventListener('keydown', (e) => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) ask(); });
    hist.forEach(m => addMsg(m.role, m.content, m.role === 'assistant' ? m.id : null));
    if (!hist.length) log.append(h('div', { class: 'empty' }, `Ask any ${ex.name} doubt. Answers always include the correct answer, why it is correct, the concept, and an exam tip.`));
    view.append(log, h('div', { class: 'card stack' }, ta, h('div', { class: 'row' }, h('button', { class: 'btn', onclick: () => file.click() }, '📷 Image / PDF'), file, chosen, h('span', { class: 'grow' }), h('button', { class: 'btn ghost sm', onclick: async () => { if (confirm('Clear this chat?')) { await post('/api/ai/clear'); tab = 'chat'; draw(); } } }, 'Clear'), sendBtn),
      h('p', { class: 'small muted' }, 'Tip: Ctrl+Enter to send. AI can make mistakes. For important facts, verify with your textbook or official source.')));
    if (params.get('ask')) { ta.value = params.get('ask'); history.replaceState(null, '', '#/tutor'); ask(); }
  }

  function subjTopic(onChange) {
    const st = { subject: ex.syllabus[0].subject, topic: ex.syllabus[0].topics[0] }; const holder = h('div', { class: 'grid g2' });
    const d = () => holder.replaceChildren(h('div', {}, h('label', {}, 'Subject'), h('select', { onchange: (e) => { st.subject = e.target.value; st.topic = ex.syllabus.find(s => s.subject === st.subject).topics[0]; d(); } }, ex.syllabus.map(s => h('option', { value: s.subject, selected: s.subject === st.subject }, s.subject)))),
      h('div', {}, h('label', {}, 'Topic'), h('select', { onchange: (e) => st.topic = e.target.value }, ex.syllabus.find(s => s.subject === st.subject).topics.map(t => h('option', { value: t, selected: t === st.topic }, t))))); d(); return [holder, st];
  }
  function tGen() {
    const [pick, st] = subjTopic(); const out = h('div', { class: 'stack' }); const dif = h('select', {}, ['easy', 'medium', 'hard'].map(x => h('option', { value: x, selected: x === 'medium' }, x))), cnt = h('select', {}, [5, 3, 10].map(x => h('option', { value: x }, x + ' questions')));
    const go_ = h('button', { class: 'btn primary', onclick: async () => {
      go_.disabled = true; out.replaceChildren(h('div', { class: 'empty' }, h('span', { class: 'spin' }), ' Generating and validating questions…'));
      try { const r = await post('/api/ai/generate', { subject: st.subject, topic: st.topic, difficulty: dif.value, count: +cnt.value });
        out.replaceChildren(h('div', { class: 'info' }, `${r.questions.length} valid question(s) ready` + (r.dropped_invalid ? ` (${r.dropped_invalid} broken one(s) discarded)` : '') + '. Labelled “AI Generated Practice”.'),
          h('div', { class: 'row' }, h('button', { class: 'btn primary', onclick: () => out.replaceChildren(runSession(r.questions, { title: 'AI Generated Practice', onFinish: () => tGen2() })) }, 'Practice these'), h('button', { class: 'btn', onclick: () => startTest({ kind: 'custom', question_ids: r.questions.map(x => x.id), title: `AI Quiz · ${st.topic}` }) }, 'Take as timed quiz'))); }
      catch (e) { out.replaceChildren(errBox(e, () => go_.click())); } go_.disabled = false; } }, 'Generate');
    const tGen2 = () => { view.replaceChildren(); tGen(); };
    view.append(h('div', { class: 'card stack' }, h('p', { class: 'muted' }, 'Questions are generated for your exam and checked for a valid answer and explanation before you see them. Leave it to us: weak topics are used to focus them when you practise a topic you often get wrong.'), pick, h('div', { class: 'grid g2' }, h('div', {}, h('label', {}, 'Difficulty'), dif), h('div', {}, h('label', {}, 'How many'), cnt)), go_), out);
  }
  function tNotes() {
    const [pick, st] = subjTopic(); const out = h('div'); const kind = h('select', {}, [['short', 'Short notes'], ['revision', 'Revision notes'], ['formula', 'Formula sheet'], ['summary', 'Topic summary'], ['facts', 'Important facts'], ['onepage', 'One-page revision sheet'], ['flashcards', 'Flashcards']].map(([v, l]) => h('option', { value: v }, l)));
    const b = h('button', { class: 'btn primary', onclick: async () => { b.disabled = true; out.replaceChildren(h('div', { class: 'empty' }, h('span', { class: 'spin' }), ' Writing…')); try { const r = await post('/api/ai/notes', { kind: kind.value, ...st }); out.replaceChildren(h('div', { class: 'card' }, h('span', { class: 'badge ai' }, 'AI Generated · verify key facts'), md(r.text), h('div', { class: 'row' }, bookmarkBtn('note', 'n' + Date.now(), `${st.topic} (${kind.value})`, r.text)))); } catch (e) { out.replaceChildren(errBox(e, () => b.click())); } b.disabled = false; } }, 'Create');
    view.append(h('div', { class: 'card stack' }, pick, h('div', {}, h('label', {}, 'Type'), kind), b), out);
  }
  function tPaper() {
    const file = h('input', { type: 'file', accept: ACCEPT, multiple: true }), ta = h('textarea', { rows: 4, placeholder: 'Or paste the paper text here (one section at a time for long papers)…' }), out = h('div', { class: 'stack' });
    const read = h('button', { class: 'btn primary', onclick: async () => {
      read.disabled = true; out.replaceChildren(h('div', { class: 'empty' }, h('span', { class: 'spin' }), ' Reading the paper…'));
      try { const files = await Promise.all([...file.files].slice(0, 5).map(fileB64)); const r = await post('/api/ai/paper-parse', { text: ta.value, files }); paper(r, out); } catch (e) { out.replaceChildren(errBox(e, () => read.click())); } read.disabled = false; } }, 'Read Paper');
    view.append(h('div', { class: 'card stack' }, h('h3', {}, 'SOLVE PAPER'), h('p', { class: 'muted' }, 'Upload a question paper (images or PDF). It is read section by section, then you can solve everything or one question at a time. Long papers: upload a section at a time.'), file, ta, read), out);
  }
  function paper(r, out) {
    const results = []; const answers = h('tbody'); const solveBtns = [];
    const key = (txt) => { const m = /\*\*(?:Correct Answer|Final Answer)\*\*[:\s—–-]*([^\n]+)/i.exec(txt); return m ? m[1].trim() : 'See solution'; };
    const cards = [];
    r.sections.forEach(sec => { cards.push(h('h2', {}, sec.name)); sec.questions.forEach((qn, i) => {
      const slot = h('div'); const b = h('button', { class: 'btn sm' + (qn.difficulty === 'hard' ? ' accent' : ''), onclick: () => solve(b, qn, slot) }, 'Solve This Question'); solveBtns.push(b);
      cards.push(h('div', { class: 'card stack' }, h('div', { class: 'row' }, h('b', {}, qn.no || (i + 1)), qn.subject ? h('span', { class: 'badge' }, qn.subject) : null, qn.topic ? h('span', { class: 'badge' }, qn.topic) : null, qn.difficulty === 'hard' ? h('span', { class: 'badge bad' }, 'Difficult') : null), h('div', { class: 'q-text' }, qn.text), qn.options.length ? h('ol', { type: 'A' }, qn.options.map(o => h('li', {}, o))) : null, b, slot)); }); });
    async function solve(b, qn, slot) {
      b.disabled = true; b.replaceChildren(h('span', { class: 'spin' })); slot.replaceChildren();
      try { const x = await post('/api/ai/solve-question', { text: qn.text, options: qn.options }); slot.replaceChildren(h('div', { class: 'sol' }, md(x.reply))); b.textContent = 'Explain This Answer'; b.onclick = () => ask2(qn); answers.append(h('tr', {}, h('td', {}, qn.no), h('td', {}, key(x.reply)))); results.push(1); }
      catch (e) { slot.replaceChildren(errBox(e, () => solve(b, qn, slot))); b.textContent = 'Solve This Question'; } b.disabled = false;
    }
    const ask2 = (qn) => go('#/tutor' + q({ ask: 'Explain this answer in detail, step by step: ' + qn.text }));
    const all = h('button', { class: 'btn primary', onclick: async () => { all.disabled = true; for (const b of solveBtns) { if (b.textContent === 'Solve This Question') { b.click(); await new Promise(r => { const t = setInterval(() => { if (!b.disabled) { clearInterval(t); r(); } }, 300); }); } } all.disabled = false; } }, 'Solve All');
    out.replaceChildren(h('div', { class: 'card stack' }, h('h3', {}, 'Paper overview'), h('p', {}, `${r.sections.length} section(s), ${r.sections.reduce((a, s) => a + s.questions.length, 0)} question(s) detected.`),
      r.important_topics.length ? h('p', {}, h('b', {}, 'Important topics: '), r.important_topics.map(t => `${t.topic} (${t.questions})`).join(', ')) : null, r.hard.length ? h('p', {}, h('b', {}, 'Difficult questions: '), r.hard.join(', ')) : null, all),
      ...cards, h('div', { class: 'card' }, h('h3', {}, 'Answer key (solved so far)'), h('table', {}, h('thead', {}, h('tr', {}, h('th', {}, 'Q'), h('th', {}, 'Answer'))), answers)));
  }
  draw(); return root;
}

// ---------- current affairs ----------
async function pgCA() {
  let cat = ''; const list = h('div', { class: 'stack' });
  async function draw() {
    list.replaceChildren(h('div', { class: 'empty' }, h('span', { class: 'spin' }), ' Loading…'));
    try { const r = await get('/api/ca' + q({ category: cat }));
      list.replaceChildren(h('div', { class: 'chips' }, h('button', { class: 'chip' + (!cat ? ' on' : ''), onclick: () => { cat = ''; draw(); } }, 'All'), r.categories.map(c => h('button', { class: 'chip' + (cat === c ? ' on' : ''), onclick: () => { cat = c; draw(); } }, c))),
        r.items.length ? r.items.map(it => { const slot = h('div'); return h('div', { class: 'card stack' }, h('div', { class: 'row' }, h('span', { class: 'badge' }, it.category), it.event_date ? h('span', { class: 'muted small' }, it.event_date) : null), h('h3', {}, it.title), h('p', {}, it.summary), it.source ? h('p', { class: 'small muted' }, 'Source: ' + it.source) : null,
          h('div', { class: 'row' }, bookmarkBtn('ca', it.id, it.title, it.summary), S.config.ai_enabled ? h('button', { class: 'btn', onclick: async (e) => { e.target.disabled = true; slot.replaceChildren(h('span', { class: 'spin' })); try { const x = await post('/api/ai/ca-explain', { id: it.id }); slot.replaceChildren(h('div', { class: 'sol' }, md(x.reply))); } catch (er) { slot.replaceChildren(errBox(er)); } e.target.disabled = false; } }, 'Explain & connect to my exam') : null), slot); })
          : h('div', { class: 'card empty' }, 'No current-affairs items have been added for your exam yet. Admins add verified items in the Admin panel. Nothing is auto-generated, so you never see invented news.'));
    } catch (e) { list.replaceChildren(errBox(e, draw)); } }
  draw();
  const quiz = h('button', { class: 'btn primary', onclick: async () => { quiz.disabled = true; try { const r = await post('/api/ai/ca-quiz'); list.replaceChildren(runSession(r.questions, { title: 'Current Affairs Quiz', onFinish: draw })); } catch (e) { toast(e.message); } quiz.disabled = false; } }, 'Current Affairs Quiz');
  return h('div', { class: 'stack' }, h('div', { class: 'row between' }, h('h1', {}, 'Current Affairs'), S.config.ai_enabled ? quiz : null), list);
}

// ---------- study plan ----------
async function pgPlan() {
  const r = await get('/api/plan'); const p = r.plan; const done = p.tasks.filter(t => t.done).length;
  const act = (t) => t.type === 'revision' ? go('#/revision' + q({ subject: t.subject, topic: t.topic })) : t.type === 'mistakes' ? go('#/revision?mistakes=1') : t.type === 'practice' ? go('#/practice' + q({ subject: t.subject, topic: t.topic, start: 1 })) : t.type === 'current_affairs' ? go('#/ca') : go('#/tests');
  return h('div', { class: 'stack' }, h('h1', {}, 'Study Plan'), h('p', { class: 'muted' }, `Today’s plan fits your ${p.budget_minutes}-minute daily budget (${p.planned_minutes} min planned). ${r.days_left !== null && r.days_left >= 0 ? r.days_left + ' days to your exam.' : ''}`),
    h('div', { class: 'card stack' }, h('div', { class: 'row between' }, h('b', {}, `${done} of ${p.tasks.length} done`), h('span', { class: 'muted small' }, p.day)), h('div', { class: 'bar ok' }, h('i', { style: `width:${Math.round(100 * done / p.tasks.length)}%` })),
      h('div', { class: 'list' }, p.tasks.map(t => h('div', { class: 'row between' }, h('label', { class: 'row', style: 'margin:0;font-weight:500' }, h('input', { type: 'checkbox', style: 'width:22px;min-height:22px', checked: t.done, onchange: async (e) => { await post('/api/plan/done', { key: t.key, done: e.target.checked }); go('#/plan'); } }), h('span', {}, t.title, h('span', { class: 'muted small' }, ` · ${t.minutes} min`))), h('button', { class: 'btn sm', onclick: () => act(t) }, 'Start'))))),
    h('div', { class: 'info' }, 'The plan adapts to your weak topics, open mistakes, preparation stage and exam date, and avoids overloading you.'));
}

// ---------- progress ----------
async function pgProgress() {
  const p = await get('/api/progress'); const max = Math.max(1, ...p.last7.map(d => d.n));
  return h('div', { class: 'stack' }, h('h1', {}, 'Progress'),
    h('div', { class: 'card' }, h('h3', {}, 'AI Performance Analyst'), h('ul', {}, p.analyst.map(l => h('li', {}, l)))),
    h('div', { class: 'grid g3' }, [['This week', p.week.questions + ' questions'], ['Weekly accuracy', pct(p.week.accuracy)], ['Streak', p.streak + ' days']].map(([l, v]) => h('div', { class: 'card stat' }, h('span', { class: 'muted small' }, l), h('b', {}, v)))),
    h('div', { class: 'card' }, h('h3', {}, 'Last 7 days'), h('div', { class: 'cols', role: 'img', 'aria-label': 'Questions per day, last 7 days' }, p.last7.map(d => h('div', { title: `${d.day}: ${d.n}`, style: `height:${Math.round(100 * d.n / max)}%` }))), h('div', { class: 'cols small muted', style: 'height:auto;margin-top:4px' }, p.last7.map(d => h('span', { style: 'text-align:center' }, d.day.slice(8))))),
    h('div', { class: 'grid g2' }, h('div', { class: 'card' }, h('h3', {}, 'Strongest topics'), p.strongest.length ? p.strongest.map(t => h('div', { class: 'row between' }, t.topic, h('span', { class: 'badge ok' }, t.accuracy + '%'))) : h('p', { class: 'muted' }, 'Needs 3+ answers per topic.')),
      h('div', { class: 'card' }, h('h3', {}, 'Weakest topics'), p.weakest.length ? p.weakest.map(t => h('div', { class: 'row between' }, t.topic, h('span', { class: 'badge ' + (t.accuracy < 50 ? 'bad' : 'warn') }, t.accuracy + '%'))) : h('p', { class: 'muted' }, 'Needs 3+ answers per topic.'))),
    h('div', { class: 'card' }, h('h3', {}, 'Accuracy by subject'), p.by_subject.length ? h('div', { class: 'stack' }, p.by_subject.map(s => h('div', {}, h('div', { class: 'row between small' }, s.subject, h('span', {}, `${pct(s.accuracy)} · ${s.attempted} answered`)), h('div', { class: 'bar ' + (s.accuracy >= 70 ? 'ok' : s.accuracy >= 50 ? 'warn' : 'bad') }, h('i', { style: `width:${s.accuracy}%` }))))) : h('p', { class: 'muted' }, 'No data yet.')),
    h('div', { class: 'card' }, h('h3', {}, 'Test history'), p.tests.length ? h('table', {}, h('tbody', {}, p.tests.map(t => h('tr', {}, h('td', {}, t.title), h('td', {}, `${t.score}/${t.max}`), h('td', {}, pct(t.accuracy)), h('td', {}, h('a', { href: '#/result/' + t.id }, 'View')))))) : h('p', { class: 'muted' }, 'No tests yet.')));
}

// ---------- profile ----------
async function pgProfile() {
  const u = S.user, prog = await get('/api/home'); const f = { exam_id: u.exam_id, level: u.level, target_date: u.target_date, daily_minutes: u.daily_minutes, stage: u.stage }; const msg = h('div');
  const sel = (label, key, opts) => h('div', {}, h('label', {}, label), h('select', { onchange: (e) => f[key] = key === 'daily_minutes' ? +e.target.value : e.target.value }, opts.map(([v, l]) => h('option', { value: v, selected: String(v) === String(f[key]) }, l))));
  const byCat = {}; S.exams.forEach(e => (byCat[e.category] ||= []).push(e));
  const examSel = h('div', {}, h('label', {}, 'Exam'), h('select', { onchange: (e) => f.exam_id = e.target.value }, Object.entries(byCat).map(([c, l]) => h('optgroup', { label: c }, l.map(e => h('option', { value: e.id, selected: e.id === f.exam_id }, e.name))))));
  const date = h('input', { type: 'date', value: f.target_date, min: new Date(Date.now() + 864e5).toISOString().slice(0, 10), onchange: (e) => f.target_date = e.target.value });
  const save = h('button', { class: 'btn primary', onclick: async () => { save.disabled = true; try { const examChanged = f.exam_id !== S.user.exam_id; const r = await put('/api/me', f); S.user = r.user; msg.replaceChildren(h('div', { class: 'info' }, examChanged ? 'Exam changed. Your dashboard, practice, tests, current affairs, tutor, revision and plan now follow the new exam. Your old history is kept.' : 'Saved.')); toast('Saved'); route(); } catch (e) { msg.replaceChildren(errBox(e)); } save.disabled = false; } }, 'Save changes');
  const wipe = h('input', { type: 'checkbox', style: 'width:20px;min-height:20px' });
  return h('div', { class: 'stack' }, h('h1', {}, 'Profile'),
    h('div', { class: 'card' }, h('div', { class: 'grid g2' }, [['Name', u.name], ['Email', u.email], ['Exam', S.exams.find(e => e.id === u.exam_id)?.name], ['Preparation level', u.level], ['Target date', u.target_date + (prog.days_left !== null ? ` (${prog.days_left} days)` : '')], ['Daily study time', u.daily_minutes / 60 + ' h'], ['Stage', u.stage], ['Overall', `${prog.questions_solved} questions · ${pct(prog.accuracy)} accuracy`]].map(([l, v]) => h('div', {}, h('div', { class: 'small muted' }, l), h('b', {}, v))))),
    h('div', { class: 'card stack' }, h('h3', {}, 'Update preferences'), h('div', { class: 'grid g2' }, examSel, sel('Preparation level', 'level', ['Beginner', 'Intermediate', 'Advanced'].map(x => [x, x])), h('div', {}, h('label', {}, 'Target date'), date), sel('Daily study time', 'daily_minutes', [[60, '1 hour'], [120, '2 hours'], [180, '3 hours'], [240, '4 hours'], [300, '5+ hours']]), sel('Stage', 'stage', ['Just Started', 'Preparing', 'Revision'].map(x => [x, x]))), msg, save),
    h('div', { class: 'card stack' }, h('h3', {}, 'Reset preferences'), h('p', { class: 'muted small' }, 'Sends you back through setup. Your history stays unless you tick the box.'), h('label', { class: 'row', style: 'font-weight:500' }, wipe, 'Also permanently delete my history (answers, mistakes, tests, bookmarks, AI chats)'),
      h('button', { class: 'btn', style: 'align-self:flex-start', onclick: async () => { if (!confirm(wipe.checked ? 'This permanently deletes your history. Continue?' : 'Reset your preferences?')) return; try { await post('/api/me/reset', { confirm: true, wipe_history: wipe.checked }); S.user = (await get('/api/me')).user; route(); } catch (e) { toast(e.message); } } }, 'Reset preferences')),
    h('button', { class: 'btn', style: 'align-self:flex-start', onclick: async () => { await post('/api/auth/logout'); S.user = null; location.hash = '#/'; route(); } }, 'Log out'));
}

// ---------- library ----------
async function pgLibrary() {
  const l = await get('/api/library'); let note = null;
  const sec = (title, items, empty) => h('div', { class: 'card' }, h('h3', {}, title), items.length ? h('div', { class: 'list' }, items.map(i => h('div', { class: 'row between' }, h('div', { style: 'min-width:0;flex:1' }, h('b', {}, i.title || i.kind), i.body ? h('div', { class: 'small muted', style: 'white-space:pre-wrap;max-height:4.5em;overflow:hidden' }, i.body) : null), h('button', { class: 'btn sm', onclick: async () => { await api('DELETE', '/api/bookmarks/' + i.id); go('#/library'); } }, 'Remove')))) : h('p', { class: 'muted' }, empty));
  const title = h('input', { placeholder: 'Note title' }), body = h('textarea', { rows: 3, placeholder: 'Write a note…' });
  return h('div', { class: 'stack' }, h('h1', {}, 'My Library'),
    h('div', { class: 'card' }, h('h3', {}, 'Mistakes'), h('p', {}, `${l.mistakes_open} unresolved mistake(s).`), h('a', { class: 'btn sm', href: '#/revision?mistakes=1' }, 'Revise My Mistakes')),
    sec('Bookmarks', l.bookmarks, 'Bookmark questions and AI explanations to find them here.'),
    h('div', { class: 'card stack' }, h('h3', {}, 'Notes'), title, body, h('button', { class: 'btn primary', style: 'align-self:flex-start', onclick: async () => { if (!title.value.trim() && !body.value.trim()) return; await post('/api/bookmarks', { kind: 'note', title: title.value || 'Note', body: body.value }); go('#/library'); } }, 'Save note'), l.notes.length ? h('div', { class: 'list' }, l.notes.map(i => h('div', { class: 'row between' }, h('div', {}, h('b', {}, i.title), h('div', { class: 'small', style: 'white-space:pre-wrap' }, i.body)), h('button', { class: 'btn sm', onclick: async () => { await api('DELETE', '/api/bookmarks/' + i.id); go('#/library'); } }, 'Remove')))) : null),
    sec('Saved Current Affairs', l.saved_ca, 'Save current-affairs items to revise them later.'),
    h('div', { class: 'card' }, h('h3', {}, 'Revision Items'), l.revision_items.length ? h('div', { class: 'list' }, l.revision_items.map(x => h('div', { class: 'row between' }, h('span', {}, h('b', {}, x.topic), h('span', { class: 'muted small' }, ` · ${x.reason}`)), h('button', { class: 'btn sm', onclick: () => go('#/revision' + q({ subject: x.subject, topic: x.topic })) }, 'Revise')))) : h('p', { class: 'muted' }, 'Nothing due.')));
}

// ---------- search ----------
async function pgSearch(parts, params) {
  const term = params.get('q') || ''; const r = await get('/api/search' + q({ q: term }));
  const none = !Object.values(r).some(a => a.length);
  return h('div', { class: 'stack' }, h('h1', {}, `Results for “${term}”`), none ? h('div', { class: 'card empty' }, 'Nothing found. Try another word.') : null,
    r.topics.map(t => h('div', { class: 'card stack' }, h('div', {}, h('h3', {}, t.topic), h('span', { class: 'muted small' }, t.subject)),
      h('div', { class: 'row' }, h('button', { class: 'btn sm primary', onclick: () => go('#/revision' + q({ subject: t.subject, topic: t.topic })) }, 'Learn ' + t.topic), h('a', { class: 'btn sm', href: '#/pyqs' }, t.topic + ' PYQs'), h('button', { class: 'btn sm', onclick: () => go('#/practice' + q({ subject: t.subject, topic: t.topic, start: 1 })) }, 'Practice'), h('button', { class: 'btn sm', onclick: () => go('#/revision' + q({ subject: t.subject, topic: t.topic })) }, 'Revision'), h('button', { class: 'btn sm', onclick: () => startTest({ kind: 'topic', subject: t.subject, topic: t.topic, count: 10 }) }, 'Tests'), h('a', { class: 'btn sm', href: '#/tutor' + q({ ask: 'Teach me ' + t.topic }) }, 'AI Tutor')))),
    r.questions.length ? h('div', { class: 'card' }, h('h3', {}, 'Questions'), h('div', { class: 'list' }, r.questions.map(x => h('div', {}, srcBadge(x), ' ', x.text)))) : null,
    r.pyqs.length ? h('div', { class: 'card' }, h('h3', {}, 'PYQs'), h('div', { class: 'list' }, r.pyqs.map(x => h('div', {}, srcBadge(x), ' ', x.text)))) : null,
    r.current_affairs.length ? h('div', { class: 'card' }, h('h3', {}, 'Current Affairs'), h('div', { class: 'list' }, r.current_affairs.map(x => h('div', {}, h('span', { class: 'badge' }, x.category), ' ', x.title)))) : null,
    r.tests.length ? h('div', { class: 'card' }, h('h3', {}, 'Tests'), h('div', { class: 'list' }, r.tests.map(x => h('div', {}, h('a', { href: x.status === 'active' ? '#/test/' + x.id : '#/result/' + x.id }, x.title))))) : null,
    r.library.length ? h('div', { class: 'card' }, h('h3', {}, 'My Library'), h('div', { class: 'list' }, r.library.map(x => h('div', {}, x.title)))) : null);
}

// ---------- admin ----------
async function pgAdmin() {
  const st = await get('/api/admin/stats'); const out = h('div'); const reports = h('div');
  const area = (v, rows = 9) => h('textarea', { rows, style: 'font-family:ui-monospace,monospace;font-size:.85rem' }, v);
  const qa = area(JSON.stringify({ source_type: 'ADMIN_PRACTICE', exam_id: null, questions: [{ subject: 'Mathematics', topic: 'Trigonometry', difficulty: 'easy', text: 'Question text…', options: ['A', 'B', 'C', 'D'], answer: 0, explanation: 'Why…', concept: 'Concept…', tip: 'Tip…' }] }, null, 2), 14);
  const pyqNote = 'For verified PYQs set source_type "VERIFIED_PYQ", exam_id, pyq_year, pyq_paper, (pyq_shift) and source_ref (official source). A full paper uploaded together becomes a PYQ test automatically.';
  const ea = area(JSON.stringify({ id: 'MY_EXAM', name: 'My Exam', category: 'Other', minutes: 60, verified: false, sections: [{ subject: 'Reasoning', questions: 25, marks: 1, negative: 0.25 }, { subject: 'English', questions: 25, marks: 1, negative: 0.25 }] }, null, 2), 12);
  const run = (path, ta) => async (e) => { e.target.disabled = true; try { const r = await post(path, JSON.parse(ta.value)); out.replaceChildren(h('div', { class: r.errors && r.errors.length ? 'note' : 'info' }, JSON.stringify(r))); } catch (er) { out.replaceChildren(errBox(er)); } e.target.disabled = false; };
  const ct = h('input', { placeholder: 'Title' }), cs = h('textarea', { rows: 3, placeholder: 'Summary (facts you have verified)' }), cc = h('select', {}, ['National', 'International', 'Defence', 'Economy', 'Science & Technology', 'Environment', 'Sports', 'Awards', 'Appointments', 'Government Schemes', 'Important Days', 'Reports & Indexes', 'Books & Authors', 'Important Persons', 'Defence Exercises'].map(c => h('option', { value: c }, c))), cd = h('input', { type: 'date' }), csrc = h('input', { placeholder: 'Source (publication / URL)' });
  async function loadReports() { try { const r = await get('/api/admin/reports'); reports.replaceChildren(r.reports.length ? h('div', { class: 'list' }, r.reports.map(x => h('div', { class: 'stack' }, h('div', { class: 'row between' }, h('span', { class: 'small muted' }, `${x.email} · ${fmtDate(x.created_at)}`), h('span', { class: 'badge ' + (x.status === 'open' ? 'bad' : 'ok') }, x.status)), h('div', {}, h('b', {}, 'Q: '), x.question || ''), h('div', { class: 'small' }, h('b', {}, 'Note: '), x.note || '–'), x.answer ? h('details', {}, h('summary', {}, 'AI answer'), md(x.answer)) : null, x.status === 'open' ? h('button', { class: 'btn sm', style: 'align-self:flex-start', onclick: async () => { await post('/api/admin/reports/' + x.id + '/resolve'); loadReports(); } }, 'Mark resolved') : null))) : h('p', { class: 'muted' }, 'No reported answers.')); } catch (e) { reports.replaceChildren(errBox(e)); } }
  loadReports();
  return h('div', { class: 'stack' }, h('h1', {}, 'Admin'),
    h('div', { class: 'card' }, h('p', {}, `${st.users} users · ${st.exams} exams · ${st.open_reports} open report(s)`), h('p', { class: 'small muted' }, 'Questions: ' + st.questions.map(x => `${x.source_type} ${x.c}`).join(' · '))), out,
    h('div', { class: 'card stack' }, h('h3', {}, 'Add questions / PYQ papers'), h('p', { class: 'small muted' }, pyqNote), qa, h('button', { class: 'btn primary', style: 'align-self:flex-start', onclick: run('/api/admin/questions', qa) }, 'Add questions')),
    h('div', { class: 'card stack' }, h('h3', {}, 'Add or update an exam'), h('p', { class: 'small muted' }, 'Syllabus defaults to the standard topic list for each subject. Set verified:true only after checking the official notification.'), ea, h('button', { class: 'btn primary', style: 'align-self:flex-start', onclick: run('/api/admin/exams', ea) }, 'Save exam')),
    h('div', { class: 'card stack' }, h('h3', {}, 'Add a current-affairs item'), ct, cs, h('div', { class: 'grid g3' }, cc, cd, csrc), h('button', { class: 'btn primary', style: 'align-self:flex-start', onclick: async () => { try { await post('/api/admin/ca', { title: ct.value, summary: cs.value, category: cc.value, event_date: cd.value || null, source: csrc.value || null, exams: 'ALL' }); toast('Added'); ct.value = cs.value = ''; } catch (e) { toast(e.message); } } }, 'Publish')),
    h('div', { class: 'card' }, h('h3', {}, 'Reported AI answers'), reports));
}