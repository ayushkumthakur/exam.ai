// AI layer: Gemini Developer API first, with Anthropic fallback.
// API keys are server-side only.
const PROVIDER = () => (process.env.AI_PROVIDER || 'gemini').toLowerCase();
const GEMINI_KEY = () => process.env.GEMINI_API_KEY;
const GEMINI_MODEL = () => process.env.GEMINI_MODEL || 'gemini-2.5-flash';
const ANTHROPIC_KEY = () => process.env.ANTHROPIC_API_KEY;
const ANTHROPIC_MODEL = () => process.env.ANTHROPIC_MODEL || 'claude-sonnet-5-5';

function activeProvider() {
  const p = PROVIDER();
  if (p === 'anthropic') return ANTHROPIC_KEY() ? 'anthropic' : (GEMINI_KEY() ? 'gemini' : null);
  return GEMINI_KEY() ? 'gemini' : (ANTHROPIC_KEY() ? 'anthropic' : null);
}
const aiEnabled = () => !!activeProvider();
const aiProvider = () => activeProvider() || PROVIDER();
const aiModel = () => activeProvider() === 'anthropic' ? ANTHROPIC_MODEL() : GEMINI_MODEL();

function groundingSources(j) {
  const out = [];
  for (const g of (j?.candidates || []).flatMap(c => c?.groundingMetadata?.groundingChunks || [])) {
    const w = g.web || g.webCitation || g.web_source || null;
    const uri = w?.uri || w?.url;
    if (uri && !out.includes(uri)) out.push(uri);
  }
  return out;
}

async function callGemini({ system, messages, maxTokens = 1500, timeoutMs = 45000, grounded = false }) {
  const opts = { grounded };
  if (!GEMINI_KEY()) return { ok: false, error: 'AI_NOT_CONFIGURED' };
  const ctl = new AbortController();
  const t = setTimeout(() => ctl.abort(), timeoutMs);
  try {
    const contents = (messages || []).map(m => {
      const role = m.role === 'assistant' || m.role === 'model' ? 'model' : 'user';
      const raw = Array.isArray(m.content) ? m.content : [{ type: 'text', text: String(m.content ?? '') }];
      const parts = [];
      for (const b of raw) {
        if (!b) continue;
        if (b.type === 'text') parts.push({ text: String(b.text || '') });
        else if ((b.type === 'image' || b.type === 'document') && b.source?.type === 'base64') {
          parts.push({ inline_data: { mime_type: b.source.media_type, data: b.source.data } });
        }
      }
      return { role, parts: parts.length ? parts : [{ text: '' }] };
    });
    const url = 'https://generativelanguage.googleapis.com/v1beta/models/' +
      encodeURIComponent(GEMINI_MODEL()) + ':generateContent';
    const response = await fetch(url, {
      method: 'POST', signal: ctl.signal,
      headers: { 'content-type': 'application/json', 'x-goog-api-key': GEMINI_KEY() },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: String(system || '') }] },
        contents,
        generationConfig: { maxOutputTokens: Math.min(12000, Math.max(256, +maxTokens || 1500)), temperature: 0.15, responseMimeType: 'text/plain' },
        ...(opts?.grounded ? { tools: [{ google_search: {} }] } : {})
      })
    });
    if (!response.ok) return { ok: false, error: 'AI_HTTP_' + response.status };
    const j = await response.json();
    const text = (j.candidates || []).flatMap(x => x.content?.parts || []).map(x => x.text || '').join('\n').trim();
    if (!text) return { ok: false, error: 'AI_EMPTY' };
    return { ok: true, text, provider: 'gemini', model: GEMINI_MODEL(), sources: groundingSources(j) };
  } catch (e) {
    return { ok: false, error: e.name === 'AbortError' ? 'AI_TIMEOUT' : 'AI_NETWORK' };
  } finally { clearTimeout(t); }
}

async function generateCurrentAffairs({ today, days = 7, examList, maxItems = 12 }) {
  const system = `You are a strict current-affairs researcher for an Indian competitive-exam preparation platform.
Use Google Search grounding. Search the live web for important events from the last ${days} days up to ${today}.
Prefer authoritative primary sources: PIB/Government of India ministries, RBI, SEBI, IRDAI, NABARD, ISRO, MEA, Ministry of Defence, Election Commission, Supreme Court, official international organisations, and official sports bodies.
Return ONLY a JSON array with at most ${maxItems} items. Each item must contain:
{"title":string,"summary":string,"category":"National|International|Defence|Economy|Science & Technology|Environment|Sports|Awards|Appointments|Government Schemes|Important Days|Reports & Indexes|Books & Authors|Important Persons|Defence Exercises","event_date":"YYYY-MM-DD","exams":["exam_id", "..."],"source_url":"https://..."}
Only include items whose source_url is an actually retrieved web source. Choose exams from this exact list and assign only the exams for which the fact is genuinely relevant: ${examList.join(', ')}.
Do not invent facts, dates, awards, numbers or URLs. Do not include rumours or unsourced social posts. If there are fewer than ${maxItems} well-supported items, return fewer.`;
  const r = await callGemini({ grounded: true, system, maxTokens: 5000, timeoutMs: 60000, messages: [{
    role: 'user',
    content: `Today is ${today}. Find exam-relevant current affairs published or announced in the last ${days} days. Verify each item from the retrieved source before including it.`
  }]});
  if (!r.ok) return r;
  const arr = extractJson(r.text);
  if (!Array.isArray(arr)) return { ok: false, error: 'AI_INVALID' };
  const sourceSet = new Set(r.sources || []);
  const allowedCats = ['National','International','Defence','Economy','Science & Technology','Environment','Sports','Awards','Appointments','Government Schemes','Important Days','Reports & Indexes','Books & Authors','Important Persons','Defence Exercises'];
  const allowed = new Set(examList);
  const good = arr.map(x => {
    if (!x || typeof x !== 'object') return null;
    const title = String(x.title || '').trim(), summary = String(x.summary || '').trim(), date = String(x.event_date || '').trim();
    const category = String(x.category || '').trim(), source_url = String(x.source_url || '').trim();
    const exams = Array.isArray(x.exams) ? x.exams.map(String).filter(v => allowed.has(v)) : [];
    if (title.length < 8 || summary.length < 30 || !/^\\d{4}-\\d{2}-\\d{2}$/.test(date) || !allowedCats.includes(category) || !source_url || !sourceSet.has(source_url) || !exams.length) return null;
    try { const u = new URL(source_url); if (!['http:','https:'].includes(u.protocol)) return null; } catch { return null; }
    return { title, summary, category, event_date: date, exams: [...new Set(exams)], source_url };
  }).filter(Boolean);
  return { ok: true, items: good };
}

async function callAnthropic({ system, messages, maxTokens = 1500, timeoutMs = 45000 }) {
  if (!ANTHROPIC_KEY()) return { ok: false, error: 'AI_NOT_CONFIGURED' };
  const ctl = new AbortController();
  const t = setTimeout(() => ctl.abort(), timeoutMs);
  try {
    const r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST', signal: ctl.signal,
      headers: { 'content-type': 'application/json', 'x-api-key': ANTHROPIC_KEY(), 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({ model: ANTHROPIC_MODEL(), max_tokens: maxTokens, system, messages })
    });
    if (!r.ok) return { ok: false, error: 'AI_HTTP_' + r.status };
    const j = await r.json();
    const text = (j.content || []).filter(b => b.type === 'text').map(b => b.text).join('\n').trim();
    if (!text) return { ok: false, error: 'AI_EMPTY' };
    return { ok: true, text, provider: 'anthropic', model: ANTHROPIC_MODEL() };
  } catch (e) {
    return { ok: false, error: e.name === 'AbortError' ? 'AI_TIMEOUT' : 'AI_NETWORK' };
  } finally { clearTimeout(t); }
}

async function callClaude(opts) {
  const primary = activeProvider();
  if (!primary) return { ok: false, error: 'AI_NOT_CONFIGURED' };
  const first = primary === 'gemini' ? await callGemini(opts) : await callAnthropic(opts);
  if (first.ok) return first;

  // Resilient provider fallback: only retry another configured provider for transient
  // failures or quota limits. Invalid credentials/model settings should stay visible.
  const retryable = first.error === 'AI_TIMEOUT' || first.error === 'AI_NETWORK' ||
    first.error === 'AI_HTTP_429' || /^AI_HTTP_5\\d\\d$/.test(first.error || '');
  if (!retryable) return first;
  const secondary = primary === 'gemini' ? (ANTHROPIC_KEY() ? 'anthropic' : null) : (GEMINI_KEY() ? 'gemini' : null);
  if (!secondary) return first;
  const fallback = secondary === 'gemini' ? await callGemini(opts) : await callAnthropic(opts);
  return fallback.ok ? { ...fallback, fallback_used: true } : first;
}

const FRIENDLY = {
  AI_NOT_CONFIGURED: 'AI is not configured on this server yet. Add GEMINI_API_KEY in Railway (recommended).',
  AI_TIMEOUT: 'The AI took too long to respond. Please try again.',
  AI_NETWORK: 'Could not reach the AI service. Check the server connection and try again.',
  AI_EMPTY: 'The AI returned an empty answer. Please try again.',
  AI_INVALID: 'The AI returned an answer in an unexpected format. Please try again.',
  AI_HTTP_400: 'The AI request was rejected. Check the model name and request settings in Railway.',
  AI_HTTP_401: 'The AI API key was rejected. Replace GEMINI_API_KEY in Railway with a valid key.',
  AI_HTTP_403: 'The AI API key lacks permission or the API is disabled. Check the key and enable the Gemini API in Google AI Studio/Cloud.',
  AI_HTTP_404: 'The configured AI model was not found. Remove GEMINI_MODEL in Railway or set it to gemini-2.5-flash.',
  AI_HTTP_429: 'The AI provider rate limit or free quota was reached. Wait and try again, or check your Gemini quota.',
};
const friendlyError = e => FRIENDLY[e] || 'Something went wrong while generating the answer.';

const TUTOR_SYSTEM = (ctx) => `You are the AI tutor inside "Competitive Exam AI", an Indian competitive-exam preparation app.
You are a teacher, doubt solver, question solver and mentor — not a generic chatbot. Stay on exam-preparation topics; politely redirect otherwise.

Student context (use it to personalise, never repeat it back verbatim):
- Exam: ${ctx.examName}
- Level: ${ctx.level || 'unknown'}  (Beginner: simple language + basics. Intermediate: concept + application. Advanced: exam-level reasoning + only VALID shortcuts.)
- Weak topics: ${ctx.weak.join(', ') || 'none recorded'}
- Days to exam: ${ctx.daysLeft ?? 'unknown'}

Answer format for any question (use these exact bold headings):
**Correct Answer** — the final answer (for MCQs: option letter + text).
**Why?** — why it is correct. For MCQs also say briefly why the other options are wrong when useful.
**Concept** — the underlying idea.
**Exam Tip** — one useful, honest tip when appropriate.
For numerical problems use: **Given**, **Find**, **Formula / Concept**, **Step-by-Step Solution**, **Calculation**, **Final Answer**, and **Quick Method** / **Alternative Method** only if the shortcut is genuinely valid. Never invent a shortcut.

Accuracy rules (more important than speed): re-check interpretation, formula, arithmetic, units, signs and option matching before answering. For MCQs, independently solve the question before selecting the option; verify the chosen option's text matches the answer. For calculations, show intermediate steps and re-compute the final value. Never claim certainty when the prompt/image is unreadable; ask for a clearer image instead of guessing. If the question is ambiguous, begin with "This question appears ambiguous." and explain why instead of guessing. If a question asks for a real previous-year question, do not invent one or imply a generated example is an actual PYQ; say when the source paper is not available and offer a clearly labelled PYQ-pattern practice question instead. Never invent citations, source URLs, exam notifications, dates, statistics, or official answer keys. For recent events or facts you cannot verify, say "I can't reliably verify the latest information from the available data." Tailor content to ${ctx.examName}; do not mix in other exams' content.`;

function extractJson(text) {
  const m = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  const raw = m ? m[1] : text;
  const a = raw.indexOf('['), b = raw.lastIndexOf(']');
  const o = raw.indexOf('{'), p = raw.lastIndexOf('}');
  const tryParse = s => { try { return JSON.parse(s); } catch { return null; } };
  if (a !== -1 && (o === -1 || a < o)) return tryParse(raw.slice(a, b + 1));
  if (o !== -1) return tryParse(raw.slice(o, p + 1));
  return null;
}

// Spec §40: drop any broken question.
function validateQuestion(x, allowed) {
  if (!x || typeof x !== 'object') return null;
  const text = String(x.text || x.question || '').trim();
  const options = Array.isArray(x.options) ? x.options.map(o => String(o).trim()).filter(Boolean) : [];
  const answer = Number.isInteger(x.answer) ? x.answer : parseInt(x.answer, 10);
  const explanation = String(x.explanation || '').trim();
  const subject = String(x.subject || allowed.subject || '').trim();
  const topic = String(x.topic || allowed.topic || '').trim();
  const difficulty = String(x.difficulty || allowed.difficulty || '').toLowerCase().trim();
  if (text.length < 10) return null;
  if (options.length < 2 || options.length > 6 || new Set(options).size !== options.length) return null;
  if (!Number.isInteger(answer) || answer < 0 || answer >= options.length) return null;
  if (explanation.length < 15) return null;
  if (!subject || !topic) return null;
  if (!['easy', 'medium', 'hard'].includes(difficulty)) return null;
  // A generated question must not silently be relabelled as a different difficulty.
  if (allowed.difficulty && allowed.difficulty !== 'any' && difficulty !== allowed.difficulty) return null;
  return { text, options, answer, explanation, subject: allowed.subject || subject, topic: allowed.topic || topic, difficulty,
    concept: String(x.concept || '').trim() || null, tip: String(x.tip || '').trim() || null };
}

async function generateQuestions({ examName, subject, topic, difficulty, count, weakNote, level }) {
  const exam = String(examName || '').toLowerCase();
  const calibration = /upsc.*civil|civil services.*prelims/.test(exam)
    ? 'UPSC CSE Prelims calibration: favour statement-based and multi-statement elimination, conceptual depth, close but fair distractors, links between static concepts and application; hard means genuinely nuanced, not obscure trivia.'
    : /ssc cgl/.test(exam)
      ? 'SSC CGL calibration: match Tier-I speed and accuracy; use short-to-medium arithmetic/reasoning steps, standard vocabulary/grammar and plausible traps; hard means a multi-step or less-obvious but syllabus-valid question, not lengthy UPSC-style analysis.'
      : /nda/.test(exam)
        ? 'NDA calibration: match NDA-level school mathematics and general ability; test concepts and application with competitive-exam distractors, not university-level content.'
        : 'Use the named exam’s actual syllabus, level, common question style and expected solving time; do not import the difficulty or style of another exam.';
  const levelGuide = difficulty === 'easy'
    ? 'Easy: foundational, direct, one main idea; still exam-relevant.'
    : difficulty === 'hard'
      ? 'Hard: demanding but fair, requiring deeper concept use, multiple reasoning steps or careful elimination; avoid ambiguity, obscure facts and out-of-syllabus tricks.'
      : difficulty === 'medium'
        ? 'Moderate: representative exam-level application, typically one or two reasoning steps, with plausible distractors.'
        : 'Mixed exam-realistic set: choose a natural spread of easy, moderate and hard questions appropriate to this exam, and label each question honestly.';
  const system = `You are an experienced paper setter for ${examName} (India). Produce original exam-standard MCQs, not generic school quiz questions. Output ONLY a JSON array, no prose.
Each item: {"text":string,"options":[4 distinct strings],"answer":index 0-3,"explanation":string (step-by-step, verified),"concept":string,"tip":string,"subject":"${subject}","topic":"${topic}","difficulty":"easy|medium|hard"}.
Exam-style calibration: ${calibration}
Requested difficulty: ${levelGuide}
Quality rules: exactly one defensible correct option; four distinct plausible options; distractors should reflect common mistakes; match the selected subject/topic and exam syllabus; keep wording and solving time realistic for the exam; verify arithmetic, answer key and explanation independently. Do not make every question the same template. No ambiguous, unanswerable, duplicate, invented-current-affairs, or out-of-syllabus questions. Do NOT copy or claim these are real previous-year questions. Label difficulty honestly; never call a routine question hard or a tricky question easy. Level of student: ${level || 'intermediate'}.${weakNote ? ' Focus: ' + weakNote : ''}`;
  const r = await callClaude({ system, maxTokens: 5000, messages: [{ role: 'user', content: `Write ${count} ${difficulty === 'any' ? 'mixed exam-realistic difficulty' : difficulty} MCQs on ${subject} → ${topic} for ${examName}. Return valid JSON only. Make the question quality and difficulty resemble this exam, not a generic quiz.` }] });
  if (!r.ok) return r;
  const arr = extractJson(r.text);
  if (!Array.isArray(arr)) return { ok: false, error: 'AI_INVALID' };
  const good = arr.map(x => validateQuestion(x, { subject, topic, difficulty })).filter(Boolean);
  if (!good.length) return { ok: false, error: 'AI_INVALID' };
  return { ok: true, questions: good, dropped: arr.length - good.length };
}

module.exports = { callClaude, callGemini, callAnthropic, aiEnabled, aiProvider, aiModel, friendlyError, TUTOR_SYSTEM, generateQuestions, generateCurrentAffairs, extractJson, validateQuestion };
