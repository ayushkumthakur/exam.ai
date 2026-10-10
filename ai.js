// AI layer: Gemini Developer API first, with Anthropic fallback.
// API keys are server-side only.
const aiMetrics = require('./ai-metrics');
const PROVIDER = () => (process.env.AI_PROVIDER || 'gemini').toLowerCase();
const GEMINI_KEY = () => GEMINI_KEYS()[0];
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

function isValidISODate(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(value + 'T00:00:00Z');
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
}
function groundingSources(j) {
  const out = [];
  for (const g of (j?.candidates || []).flatMap(c => c?.groundingMetadata?.groundingChunks || [])) {
    const w = g.web || g.webCitation || g.web_source || null;
    const uri = w?.uri || w?.url;
    if (uri && !out.includes(uri)) out.push(uri);
  }
  return out;
}

function GEMINI_KEYS() {
  // Keep the original variable first for backwards compatibility, then optional backups.
  return [...new Set([
    process.env.GEMINI_API_KEY,
    process.env.GEMINI_API_KEY_2,
    process.env.GEMINI_API_KEY_3
  ].map(key => typeof key === 'string' ? key.trim() : '').filter(Boolean))];
}

async function callGemini({ system, messages, maxTokens = 1500, timeoutMs = 45000, grounded = false }) {
  const keys = GEMINI_KEYS();
  if (!keys.length) return { ok: false, error: 'AI_NOT_CONFIGURED' };

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
  let last = { ok: false, error: 'AI_NOT_CONFIGURED' };

  for (let i = 0; i < keys.length; i++) {
    const ctl = new AbortController();
    const t = setTimeout(() => ctl.abort(), timeoutMs);
    try {
      aiMetrics.record({ type: 'request', provider: 'gemini', model: GEMINI_MODEL(), keySlot: i + 1 });
      const response = await fetch(url, {
        method: 'POST', signal: ctl.signal,
        headers: { 'content-type': 'application/json', 'x-goog-api-key': keys[i] },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: String(system || '') }] },
          contents,
          generationConfig: { maxOutputTokens: Math.min(12000, Math.max(256, +maxTokens || 1500)), temperature: 0.15, responseMimeType: 'text/plain' },
          ...(grounded ? { tools: [{ google_search: {} }] } : {})
        })
      });
      if (!response.ok) {
        last = { ok: false, error: 'AI_HTTP_' + response.status };
        aiMetrics.record({ type: 'error', provider: 'gemini', model: GEMINI_MODEL(), keySlot: i + 1, error: last.error });
        // Rotate on per-key auth/quota errors and transient provider/network failures.
        const retryable = [401, 403, 429].includes(response.status) || response.status >= 500;
        if (retryable && i < keys.length - 1) {
          aiMetrics.record({ type: 'rotation', provider: 'gemini', model: GEMINI_MODEL(), fromSlot: i + 1, toSlot: i + 2, reason: last.error });
          continue;
        }
        return last;
      }
      const j = await response.json();
      const text = (j.candidates || []).flatMap(x => x.content?.parts || []).map(x => x.text || '').join('\n').trim();
      if (!text) {
        last = { ok: false, error: 'AI_EMPTY' };
        aiMetrics.record({ type: 'error', provider: 'gemini', model: GEMINI_MODEL(), keySlot: i + 1, error: last.error });
        if (i < keys.length - 1) { aiMetrics.record({ type: 'rotation', provider: 'gemini', model: GEMINI_MODEL(), fromSlot: i + 1, toSlot: i + 2, reason: last.error }); continue; }
        return last;
      }
      const usage = j.usageMetadata || {};
      aiMetrics.record({ type: 'success', provider: 'gemini', model: GEMINI_MODEL(), keySlot: i + 1,
        promptTokens: usage.promptTokenCount, outputTokens: usage.candidatesTokenCount, totalTokens: usage.totalTokenCount });
      return { ok: true, text, provider: 'gemini', model: GEMINI_MODEL(), sources: groundingSources(j) };
    } catch (e) {
      last = { ok: false, error: e.name === 'AbortError' ? 'AI_TIMEOUT' : 'AI_NETWORK' };
      aiMetrics.record({ type: 'error', provider: 'gemini', model: GEMINI_MODEL(), keySlot: i + 1, error: last.error });
      if (i < keys.length - 1) { aiMetrics.record({ type: 'rotation', provider: 'gemini', model: GEMINI_MODEL(), fromSlot: i + 1, toSlot: i + 2, reason: last.error }); continue; }
      return last;
    } finally { clearTimeout(t); }
  }
  return last;
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
    if (title.length < 8 || summary.length < 30 || !isValidISODate(date) || !allowedCats.includes(category) || !source_url || !sourceSet.has(source_url) || !exams.length) return null;
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
    aiMetrics.record({ type: 'request', provider: 'anthropic', model: ANTHROPIC_MODEL() });
    const r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST', signal: ctl.signal,
      headers: { 'content-type': 'application/json', 'x-api-key': ANTHROPIC_KEY(), 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({ model: ANTHROPIC_MODEL(), max_tokens: maxTokens, system, messages })
    });
    if (!r.ok) { const error = 'AI_HTTP_' + r.status; aiMetrics.record({ type: 'error', provider: 'anthropic', model: ANTHROPIC_MODEL(), error }); return { ok: false, error }; }
    const j = await r.json();
    const text = (j.content || []).filter(b => b.type === 'text').map(b => b.text).join('\n').trim();
    if (!text) { aiMetrics.record({ type: 'error', provider: 'anthropic', model: ANTHROPIC_MODEL(), error: 'AI_EMPTY' }); return { ok: false, error: 'AI_EMPTY' }; }
    const usage = j.usage || {};
    aiMetrics.record({ type: 'success', provider: 'anthropic', model: ANTHROPIC_MODEL(), promptTokens: usage.input_tokens, outputTokens: usage.output_tokens, totalTokens: (Number(usage.input_tokens) || 0) + (Number(usage.output_tokens) || 0) });
    return { ok: true, text, provider: 'anthropic', model: ANTHROPIC_MODEL() };
  } catch (e) {
    const error = e.name === 'AbortError' ? 'AI_TIMEOUT' : 'AI_NETWORK';
    aiMetrics.record({ type: 'error', provider: 'anthropic', model: ANTHROPIC_MODEL(), error });
    return { ok: false, error };
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
    ['AI_HTTP_401', 'AI_HTTP_403', 'AI_HTTP_429'].includes(first.error) || /^AI_HTTP_5\d\d$/.test(first.error || '');
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
  AI_VERIFY_UNAVAILABLE: 'The answer-key verification service is temporarily unavailable. No unverified generated questions were saved; please try again.',
  AI_VERIFY_INVALID: 'The independent answer-key check returned an invalid response. No unverified generated questions were saved; please try again.',
  AI_VERIFY_REJECTED: 'The generated questions did not pass the independent answer-key check. Please generate a fresh set.',
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
  const options = Array.isArray(x.options) ? x.options.map(o => String(o).trim()) : [];
  const normalizeChoice = value => String(value || '').normalize('NFKC').toLocaleLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim();
  const answer = Number.isInteger(x.answer) ? x.answer : parseInt(x.answer, 10);
  const explanation = String(x.explanation || '').trim();
  const subject = String(x.subject || allowed.subject || '').trim();
  const topic = String(x.topic || allowed.topic || '').trim();
  const difficulty = String(x.difficulty || allowed.difficulty || '').toLowerCase().trim();
  if (text.length < 10) return null;
  // Exam MCQs in this platform use four options; reject malformed output instead of
  // quietly accepting two-option questions that make a mock easier than the real paper.
  if (options.length !== 4 || options.some(o => !o) || new Set(options.map(normalizeChoice)).size !== 4) return null;
  // Reject options that differ only by punctuation/case/spacing; those are not meaningful distractors.
  if (options.some(o => normalizeChoice(o).length < 1)) return null;
  if (!Number.isInteger(answer) || answer < 0 || answer >= options.length) return null;
  if (explanation.length < 15) return null;
  if (!subject || !topic) return null;
  if (!['easy', 'medium', 'hard'].includes(difficulty)) return null;
  // A generated question must not silently be relabelled as a different difficulty.
  if (allowed.difficulty && allowed.difficulty !== 'any' && difficulty !== allowed.difficulty) return null;
  return { text, options, answer, explanation, subject: allowed.subject || subject, topic: allowed.topic || topic, difficulty,
    concept: String(x.concept || '').trim() || null, tip: String(x.tip || '').trim() || null };
}

// Conservative lexical near-duplicate detection. Numbers are normalised only for
// similarity checks so trivial numeric variants of the same template are caught.
function questionTextKey(value) {
  return String(value || '').normalize('NFKC').toLocaleLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, ' ').trim();
}
const QUESTION_STOPWORDS = new Set(['a','an','the','is','are','was','were','be','been','being','of','to','in','on','at','by','for','from','with','and','or','as','if','which','what','who','when','where','how','does','do','did','has','have','had','this','that','these','those','following','correct','incorrect','not']);
function questionSimilarityTokens(value) {
  return questionTextKey(value).replace(/\b\d+(?:[.,]\d+)*\b/g, ' number ')
    .split(/\s+/).filter(token => token.length > 1 && !QUESTION_STOPWORDS.has(token));
}
function areDuplicateQuestions(candidate, others, threshold = 0.84) {
  const textOf = value => typeof value === 'string' ? value : (value && (value.text || value.question)) || '';
  const candidateText = textOf(candidate);
  const candidateKey = questionTextKey(candidateText);
  if (!candidateKey) return false;
  const candidateTokens = new Set(questionSimilarityTokens(candidateText));
  for (const other of (others || [])) {
    const otherText = textOf(other);
    const otherKey = questionTextKey(otherText);
    if (!otherKey) continue;
    if (candidateKey === otherKey) return true;
    const otherTokens = new Set(questionSimilarityTokens(otherText));
    if (candidateTokens.size < 6 || otherTokens.size < 6) continue;
    let intersection = 0;
    for (const token of candidateTokens) if (otherTokens.has(token)) intersection++;
    const union = candidateTokens.size + otherTokens.size - intersection;
    const jaccard = union ? intersection / union : 0;
    const lengthRatio = Math.min(candidateTokens.size, otherTokens.size) / Math.max(candidateTokens.size, otherTokens.size);
    if (jaccard >= threshold && lengthRatio >= 0.78) return true;
  }
  return false;
}

// Higher-fidelity calibration for the three priority exams. These prompts shape
// question construction; the exam catalog remains the source of mock size, timing,
// subject allocation and marking rules.
function priorityExamCalibration(examName, subject, topic) {
  const name = String(examName || '').toLowerCase();
  const s = String(subject || '').toLowerCase();
  const t = String(topic || '').toLowerCase();
  if (/upsc|civil services/.test(name)) {
    if (/csat|paper\s*ii|paper-ii/.test(name) || (/aptitude|reasoning|comprehension/.test(s) && !/paper\s*i\b|general studies/.test(name))) {
      return 'PRIORITY EXAM — UPSC CSE PRELIMS CSAT: match the actual qualifying Paper II style. Use comprehension passages with inference/main-idea/assumption questions; quantitative aptitude with percentages, ratios, averages, time-work, speed-distance, probability, number systems and data interpretation; and logical reasoning/analytical ability. Questions should need careful reading or a few clean steps, not coaching-trick puzzles or advanced mathematics. Keep all items within the CSAT syllabus and do not make it a generic reasoning quiz. The real paper has 80 questions, 200 marks, 120 minutes and a 33% qualifying threshold; mock configuration should follow the catalog pattern.';
    }
    return 'PRIORITY EXAM — UPSC CSE PRELIMS GENERAL STUDIES PAPER I: mirror the official UPSC objective-paper construction, not generic GK. Prefer nuanced conceptual questions, two/three-statement questions, correct-combination questions, match-the-following, chronology, geography/map logic, constitutional/economic/environmental application and static-current-affairs connections. Use close but fair distractors and elimination logic; vary formats instead of making every item a direct fact recall. For History, test chronology/context/source-aware facts; Geography, physical processes, mapping and cause-effect; Polity, constitutional provisions and institutional application; Economy, conceptual mechanisms and policy effects; Environment, ecology/conventions/species/habitat concepts. Never invent current-affairs facts, data, reports, rankings or dates. Avoid obscure trivia masquerading as difficulty. Official paper structure is 100 questions, 200 marks, 120 minutes with one-third negative marking; retain the configured exam pattern.';
  }
  if (/ssc\s*cgl/.test(name)) {
    let style = 'Use SSC CGL Tier-I objective style: short, unambiguous stems, four plausible options, fast solving and standard SSC distractors. Avoid UPSC-style statement-heavy essays and avoid banking-style long puzzles.';
    if (/quant|mathemat/.test(s)) style += ' Quantitative Aptitude: favour SSC-style arithmetic, percentage, ratio, average, profit-loss, interest, time-work, speed-distance, algebra, geometry, mensuration, trigonometry and concise DI. Calculations should be efficient and syllabus-standard; hard means a clever or multi-step SSC calculation, not lengthy CAT/JEE mathematics.';
    else if (/reason/.test(s)) style += ' Reasoning: use SSC patterns such as analogy, classification, number/alphabet series, coding-decoding, word/number relations, syllogism, Venn diagrams, directions, ranking, clock/calendar and non-verbal reasoning where relevant. Keep logic crisp and solvable quickly.';
    else if (/english|language/.test(s)) style += ' English: use SSC formats such as error spotting, sentence improvement, fill in the blanks, synonyms/antonyms, idioms, one-word substitution, spelling, active/passive, narration, cloze and short comprehension. Test standard grammar/vocabulary, not literary essays.';
    else if (/general awareness|general knowledge|\bgk\b/.test(s)) style += ' General Awareness: balance static history, polity, geography, science, economy and culture with relevant current affairs. Use precise fact/concept questions and plausible distractors; do not invent recent events or volatile figures.';
    style += ' Tier-I full mock target: 100 questions, 25 per section (Reasoning, General Awareness, Quantitative Aptitude, English), 60 minutes, 2 marks per correct answer and 0.50 negative marking per wrong answer. Preserve the app catalog distribution and timer.';
    if (/tier\s*ii|tier-ii/.test(name)) style = 'PRIORITY EXAM — SSC CGL TIER-II: follow the current official notification for the selected paper/module; distinguish Mathematical Abilities, Reasoning and General Intelligence, English Language and Comprehension, General Awareness, Computer Knowledge and any post-specific Statistics/Finance-Economics paper. Do not reuse Tier-I section counts or assume all candidates take specialist papers. Match the selected subject and paper, keep SSC-style concise objective questions, and flag that DEST is a skill test rather than an MCQ section.';
    return 'PRIORITY EXAM — SSC CGL: ' + style;
  }
  if (/rbi.*grade\s*b|grade\s*b.*rbi/.test(name)) {
    if (/phase\s*ii|phase-ii|paper\s*(i|ii|iii)|finance and management|economic and social issues|descriptive/.test(name + ' ' + s + ' ' + t)) {
      return 'PRIORITY EXAM — RBI GRADE B PHASE II: this phase is not a generic four-option MCQ paper. ESI and Finance & Management require subject-specific, analytical answers; English Writing Skills is descriptive and tests clear, structured writing. Use RBI/economy/finance context, policy reasoning, relevant evidence and balanced analysis. Do not fabricate statistics or claim an essay is an official question. IMPORTANT: the current question-generation endpoint validates four-option MCQs; do not silently present MCQs as a full authentic Phase-II simulation. For this endpoint, generate only clearly labelled objective practice for the selected topic until a descriptive-answer flow is available.';
    }
    let style = 'Use RBI Grade B General Cadre Phase-I objective-paper style. It is a fast, high-competition screening paper with 200 questions for 200 marks in 120 minutes and 0.25 negative marking per wrong answer. Follow the catalog subject distribution and do not mix the four sections.';
    if (/general awareness|banking awareness|economy|finance|current affairs|\bga\b/.test(s + ' ' + t)) style += ' General Awareness is the largest section: prioritise RBI and monetary policy, inflation, banking/financial regulation, financial inclusion, Indian economy, fiscal policy, government schemes, reports and indices, international institutions, and recent economy/banking/current-affairs developments. Ask context-based factual-conceptual questions with exact terminology; never invent current figures, report rankings, policy rates, dates or schemes.';
    else if (/english|language/.test(s)) style += ' English Language: exam-style reading comprehension, inference, cloze test, sentence rearrangement, error detection, phrase replacement and vocabulary in context. Include plausible grammar/usage distractors and avoid school literature questions.';
    else if (/quant|numerical/.test(s)) style += ' Quantitative Aptitude: timed banking-level arithmetic, approximation/simplification, number series where appropriate, quadratic equations where appropriate, and especially table/line/bar/pie/caselet data interpretation. Use realistic multi-step data but ensure all data needed to solve is present and arithmetic is checked.';
    else if (/reason/.test(s)) style += ' Reasoning: banking-style seating arrangements and puzzles, syllogism, inequality, direction, blood relation, coding-decoding, alphanumeric series, input-output and logical deduction. Multi-condition puzzles should be internally consistent and solvable; hard questions may require layered deduction but not ambiguous assumptions.';
    return 'PRIORITY EXAM — RBI GRADE B: ' + style;
  }
  return null;
}

function priorityDifficultyCalibration(examName, subject, difficulty) {
  const name = String(examName || '').toLowerCase();
  const s = String(subject || '').toLowerCase();
  if (!/upsc|civil services|ssc\s*cgl|rbi.*grade\s*b|grade\s*b.*rbi/.test(name)) return '';
  if (difficulty === 'easy') {
    if (/upsc|civil services/.test(name)) return 'Priority-exam Easy: still UPSC-relevant and syllabus-based, but test one core concept or a straightforward elimination; do not reduce it to trivial one-line trivia.';
    if (/ssc\s*cgl/.test(name)) return 'Priority-exam Easy: direct SSC-pattern question solvable quickly with one standard rule or calculation; keep SSC language and plausible options.';
    return 'Priority-exam Easy: a direct, syllabus-valid RBI Grade B Phase-I question; keep banking/economy relevance where appropriate and do not confuse it with basic clerical-exam trivia.';
  }
  if (difficulty === 'medium') {
    if (/upsc|civil services/.test(name)) return 'Priority-exam Moderate: representative UPSC difficulty, conceptual understanding plus statement elimination or a meaningful application; distractors should be close but defensible.';
    if (/ssc\s*cgl/.test(name)) return 'Priority-exam Moderate: representative SSC CGL speed-and-accuracy level, usually one or two steps or a standard grammar/reasoning trap.';
    return 'Priority-exam Moderate: representative RBI Grade B Phase-I level; apply banking/economy concepts or use a standard aptitude/DI/puzzle pattern within realistic time.';
  }
  if (difficulty === 'hard') {
    if (/upsc|civil services/.test(name)) return 'Priority-exam Hard: UPSC-like conceptual nuance, statement combinations and close elimination; use multiple linked concepts when natural, but never obscure facts, ambiguity or invented current affairs.';
    if (/ssc\s*cgl/.test(name)) return 'Priority-exam Hard: upper-end SSC CGL difficulty with a clever but standard multi-step calculation, a subtle grammar/vocabulary choice, or a compact reasoning pattern; still solvable under SSC time pressure, never UPSC-style.';
    if (/rbi.*grade\s*b|grade\s*b.*rbi/.test(name)) {
      if (/general awareness|banking awareness|economy|finance|current affairs|\bga\b/.test(s)) return 'Priority-exam Hard: RBI Grade B-level economy/banking depth, policy implications, carefully distinguished concepts and well-grounded current-affairs context. No invented figures or ambiguous multiple-correct options.';
      return 'Priority-exam Hard: RBI Grade B Phase-I upper-end difficulty; use layered DI, a consistent multi-condition reasoning puzzle, or nuanced English inference, while remaining solvable in timed conditions.';
    }
  }
  return 'Priority-exam Mixed: create a balanced, realistic spread for this exam and label each item honestly; do not let every question collapse to the same difficulty.';
}

// Exam-specific calibration for non-UPSC exams. UPSC prompt behavior is deliberately left unchanged.
function nonUpscExamCalibration(examName) {
  const name = String(examName || '').toLowerCase();
  if (!name || /upsc|civil services/.test(name)) return null;
  if (/cbse class ix|cbse class 9/.test(name)) return 'CBSE Class IX calibration: align to Class 9 NCERT/CBSE learning outcomes and the selected subject. Use age-appropriate concept checks, direct application, short calculations, diagrams/data-based interpretation where relevant, and school-exam phrasing. Do not import Class 10–12 or competitive-exam content.';
  if (/cbse class x(?:\s|$)|cbse class 10/.test(name)) return 'CBSE Class X calibration: align to the Class 10 NCERT/CBSE syllabus and selected subject. Use board-style competency-based MCQs, case/source/data-based interpretation, standard applications and textbook concepts. Keep language and calculation level appropriate to Class 10.';
  if (/cbse class xi(?:\s|$)|cbse class 11/.test(name)) return 'CBSE Class XI calibration: use the selected stream and subject at Class 11 NCERT level. Test conceptual foundations and appropriate multi-step application, with school-exam wording and no Class 12/university material.';
  if (/cbse class xii(?:\s|$)|cbse class 12/.test(name)) return 'CBSE Class XII calibration: use the selected stream and subject at Class 12 NCERT/CBSE board level. Include competency-based, assertion/reason, case/data-based and standard board-style applications where suitable. Match the exact subject and avoid out-of-syllabus competitive-exam tricks.';
  if (/jee advanced/.test(name)) return 'JEE Advanced calibration: engineering-entrance level Physics/Chemistry/Mathematics with deep conceptual integration, non-routine multi-step reasoning and close distractors. Use multi-concept problems; when a single-correct MCQ is requested, still provide exactly one defensible answer. Never imitate UPSC general-studies question style.';
  if (/jee main/.test(name)) return 'JEE Main calibration: Class 11–12 Physics/Chemistry/Mathematics at JEE Main level, with precise concepts, formula application and moderate calculation length. Include realistic numerical/conceptual traps, not lengthy olympiad problems.';
  if (/neet/.test(name)) return 'NEET UG calibration: NCERT-centred Biology, Chemistry and Physics. Biology should test precise NCERT facts and concepts; Chemistry should mix physical, organic and inorganic syllabus questions; Physics should use concise numerical/conceptual application. Keep distractors plausible and avoid JEE Advanced-style over-complexity.';
  if (/ssc cgl/.test(name)) return 'SSC CGL Tier-I calibration: speed-and-accuracy oriented Quantitative Aptitude, Reasoning, English and General Awareness. Use standard SSC patterns, concise stems, common traps and realistic solving time; do not use UPSC-style long analysis.';
  if (/ssc chsl/.test(name)) return 'SSC CHSL calibration: Tier-I level arithmetic, reasoning, English and general awareness with concise questions and basic-to-moderate calculations, appropriate to the 10+2 recruitment exam.';
  if (/ssc mts|ssc gd|ssc selection/.test(name)) return 'SSC entry-level recruitment calibration: direct, concise arithmetic, reasoning, language and general-awareness questions; keep the level and time demand suitable for the named SSC exam, not CGL or UPSC.';
  if (/ssc cpo|ssc stenographer/.test(name)) return 'SSC specialised recruitment calibration: use the named exam’s level and subject mix, with concise SSC-style language, speed-based reasoning/quantitative items and plausible distractors.';
  if (/sbi|ibps|rbi|nabard|bank|clerk|po \(/.test(name)) return 'Banking-exam calibration: time-pressured aptitude and reasoning, bank-exam English, data interpretation, puzzles/seating arrangements where the subject allows, and relevant banking/economy awareness. Hard questions may involve layered DI or multi-condition reasoning but must remain solvable in realistic exam time.';
  if (/rrb|railway|rpf/.test(name)) return 'Railway recruitment calibration: concise CBT-style arithmetic, general intelligence/reasoning and general awareness/science appropriate to the named post. Emphasise speed, standard patterns and school-level science where relevant; do not use banking puzzles or UPSC-style analysis unless the selected subject specifically requires it.';
  if (/nda/.test(name)) return 'NDA calibration: school-level Mathematics plus General Ability English/science/history/geography/polity/current affairs, at NDA competitive level. Use concept application and fair competitive distractors; no university-level questions.';
  if (/cds/.test(name)) return 'CDS calibration: graduate-entry defence exam style. English should test vocabulary, grammar and comprehension; General Knowledge should span relevant static/current topics; Elementary Mathematics should stay within CDS-level school mathematics. Keep each question aligned to the selected paper.';
  if (/afcat/.test(name)) return 'AFCAT calibration: concise timed questions in English, numerical ability, reasoning/military aptitude and general awareness. Use AFCAT-level vocabulary, pattern recognition and arithmetic; avoid lengthy UPSC or advanced-engineering problems.';
  if (/agniveer|capf|state police/.test(name)) return 'Defence/police recruitment calibration: concise objective questions in the selected subject, with school-level quantitative aptitude, reasoning, general awareness and language as appropriate to the named recruitment exam.';
  if (/ctet|state tet|kvs|nvs|dsssb/.test(name)) return 'Teaching-exam calibration: pedagogy questions should use classroom scenarios, child development, inclusive education, learning theories and teaching methods; language and subject questions should match teacher-eligibility/recruitment level. Avoid generic GK-only quizzes when the selected subject is pedagogy.';
  if (/cuet/.test(name)) return 'CUET UG calibration: align to the selected domain subject and NCERT/appropriate Class 12 level; English should use comprehension/vocabulary/language skills, and General Test questions should use concise general knowledge, reasoning and quantitative aptitude. Do not mix unrelated domain subjects.';
  if (/clat/.test(name)) return 'CLAT UG calibration: use passage-based comprehension and reasoning. Legal reasoning should apply principles to factual passages without requiring prior legal knowledge; current affairs/GK should be context-rich, logical reasoning should use arguments, and quantitative techniques should use short data sets.';
  if (/state pcs/.test(name)) return 'State PCS calibration: state-relevant history, geography, polity, economy, environment and current affairs, with factual-conceptual questions and statement-based elimination appropriate to the named state exam. Do not invent state-specific facts; if the state is unspecified, stay with broadly applicable Indian topics.';
  if (/other competitive/.test(name)) return 'General competitive-exam calibration: use the selected subject’s listed syllabus, objective exam wording, realistic time demand and common exam patterns. Avoid presenting generic trivia as a specialised exam question.';
  return 'Use the named exam’s actual syllabus, subject mix, common question style and expected solving time. Derive question framing from the selected exam name and subject, and do not import another exam’s level or style.';
}

function nonUpscDifficultyCalibration(examName, difficulty, subject) {
  const name = String(examName || '').toLowerCase();
  if (!name || /upsc|civil services/.test(name)) return '';
  const s = String(subject || '').toLowerCase();
  if (difficulty === 'easy') return 'Exam-specific easy level: test one core syllabus concept, a direct calculation or straightforward application. Keep distractors plausible but not deceptive.';
  if (difficulty === 'medium') return 'Exam-specific moderate level: use a representative question with one or two meaningful reasoning/application steps and exam-realistic distractors.';
  if (difficulty === 'hard') {
    if (/jee advanced/.test(name)) return 'Exam-specific hard level: integrate multiple Physics/Chemistry/Mathematics concepts and require non-routine multi-step reasoning while remaining syllabus-valid.';
    if (/jee main|neet/.test(name)) return 'Exam-specific hard level: use the upper end of the named entrance exam, combining concepts or adding a subtle but fair application; do not exceed its syllabus.';
    if (/bank|sbi|ibps|rbi|nabard/.test(name)) return 'Exam-specific hard level: require layered data interpretation, a multi-condition puzzle, or careful quantitative reasoning that is still realistic under banking-exam time pressure.';
    if (/railway|rrb|rpf|ssc|afcat|nda|cds|agniveer|police/.test(name)) return 'Exam-specific hard level: use a less-obvious standard pattern, multiple reasoning steps or a careful calculation, without becoming lengthy or out of scope for this recruitment exam.';
    if (/ctet|tet|kvs|nvs|dsssb/.test(name) && /pedagogy|child/.test(s)) return 'Exam-specific hard level: use a nuanced classroom scenario requiring application of child development/pedagogy principles, with one best-supported teaching response.';
    if (/clat/.test(name)) return 'Exam-specific hard level: use a denser passage or multi-step inference/application, while keeping the answer supported by the supplied passage or principle.';
    if (/cbse class/.test(name)) return 'Exam-specific hard level: use a board-appropriate competency-based or case/data-based question requiring linked concepts, but remain inside the selected class syllabus.';
    return 'Exam-specific hard level: require deeper concept application, multiple reasoning steps or careful elimination, without ambiguity, obscure trivia or out-of-syllabus tricks.';
  }
  return '';
}

async function generateQuestions({ examName, subject, topic, difficulty, count, weakNote, level }) {
  const exam = String(examName || '').toLowerCase();
  const priorityCalibration = priorityExamCalibration(examName, subject, topic);
  const calibration = priorityCalibration || (/upsc.*civil|civil services.*prelims/.test(exam)
    ? 'UPSC CSE Prelims calibration: favour statement-based and multi-statement elimination, conceptual depth, close but fair distractors, links between static concepts and application; hard means genuinely nuanced, not obscure trivia.'
    : /ssc cgl/.test(exam)
      ? 'SSC CGL calibration: match Tier-I speed and accuracy; use short-to-medium arithmetic/reasoning steps, standard vocabulary/grammar and plausible traps; hard means a multi-step or less-obvious but syllabus-valid question, not lengthy UPSC-style analysis.'
      : /nda/.test(exam)
        ? 'NDA calibration: match NDA-level school mathematics and general ability; test concepts and application with competitive-exam distractors, not university-level content.'
        : (nonUpscExamCalibration(examName) || 'Use the named exam’s actual syllabus, level, common question style and expected solving time; do not import the difficulty or style of another exam.'));
  const levelGuide = difficulty === 'easy'
    ? 'Easy: foundational, direct, one main idea; still exam-relevant.'
    : difficulty === 'hard'
      ? 'Hard: demanding but fair, requiring deeper concept use, multiple reasoning steps or careful elimination; avoid ambiguity, obscure facts and out-of-syllabus tricks.'
      : difficulty === 'medium'
        ? 'Moderate: representative exam-level application, typically one or two reasoning steps, with plausible distractors.'
        : 'Mixed exam-realistic set: choose a natural spread of easy, moderate and hard questions appropriate to this exam, and label each question honestly.';
  const difficultyCalibration = priorityDifficultyCalibration(examName, subject, difficulty) || nonUpscDifficultyCalibration(examName, difficulty, subject);
  const system = `You are an experienced paper setter for ${examName} (India). Produce original exam-standard MCQs, not generic school quiz questions. Output ONLY a JSON array, no prose.
Each item: {"text":string,"options":[4 distinct strings],"answer":index 0-3,"explanation":string (step-by-step, verified),"concept":string,"tip":string,"subject":"${subject}","topic":"${topic}","difficulty":"easy|medium|hard"}.
Exam-style calibration: ${calibration}
Requested difficulty: ${levelGuide}${difficultyCalibration ? '\n' + difficultyCalibration : ''}
Quality rules: exactly one defensible correct option; four distinct plausible options; distractors should reflect common mistakes; match the selected subject/topic and exam syllabus; keep wording and solving time realistic for the exam; verify arithmetic, answer key and explanation independently. Do not make every question the same template. No ambiguous, unanswerable, duplicate, invented-current-affairs, or out-of-syllabus questions. Do NOT copy or claim these are real previous-year questions. Label difficulty honestly; never call a routine question hard or a tricky question easy. Level of student: ${level || 'intermediate'}.${weakNote ? ' Focus: ' + weakNote : ''}`;
  const r = await callClaude({ system, maxTokens: 5000, messages: [{ role: 'user', content: `Write ${count} ${difficulty === 'any' ? 'mixed exam-realistic difficulty' : difficulty} MCQs on ${subject} → ${topic} for ${examName}. Return valid JSON only. Make the question quality and difficulty resemble this exam, not a generic quiz.` }] });
  if (!r.ok) return r;
  const arr = extractJson(r.text);
  if (!Array.isArray(arr)) return { ok: false, error: 'AI_INVALID' };
  const valid = arr.map(x => validateQuestion(x, { subject, topic, difficulty })).filter(Boolean);
  // Remove exact and conservative lexical near-duplicates within this batch.
  const good = [];
  for (const q of valid) {
    if (areDuplicateQuestions(q, good)) continue;
    good.push(q);
  }
  if (!good.length) return { ok: false, error: 'AI_INVALID' };

  // Keep API usage low by default: the generation prompt already requests self-checking.
  // Enable the extra independent verifier only when AI_VERIFY_QUESTIONS=true is set on the server.
  if (String(process.env.AI_VERIFY_QUESTIONS || '').toLowerCase() === 'true') {
    // Independent second pass: solve without showing the proposed answer key first,
    // then compare the verifier's result and explanation check with the generated item.
    const verifyInput = good.map((q, index) => ({
      index, question: q.text, options: q.options,
      proposed_answer: q.answer, proposed_explanation: q.explanation,
      exam: examName, subject: q.subject, topic: q.topic
    }));
    const verified = await callClaude({
      maxTokens: Math.min(5000, 500 + good.length * 350),
      system: `You are an independent competitive-exam answer-key auditor. Do not trust the proposed answer. Solve each MCQ yourself from the question and options first. Then compare your independently solved option with proposed_answer and check whether proposed_explanation is factually and logically correct. Flag ambiguous, underspecified, out-of-syllabus, or multiple-correct-option questions as invalid. Compare every question with every other question in this batch; if it repeats the same task with only superficial wording or number changes, mark it as a duplicate of the earlier item. Output ONLY a JSON array with one object per item: {\"index\":0,\"independent_answer\":0,\"valid\":true,\"duplicate_of\":null,\"reason\":\"brief reason\"}. independent_answer must be an option index 0-3. valid is true only if there is exactly one defensible answer, your answer matches proposed_answer, and the explanation is correct. duplicate_of must be null for a unique question or the earlier item index for a duplicate. If uncertain about correctness, valid=false.`,
      messages: [{ role: 'user', content: JSON.stringify(verifyInput) }]
    });
    if (!verified.ok) return { ok: false, error: 'AI_VERIFY_UNAVAILABLE' };
    const audit = extractJson(verified.text);
    if (!Array.isArray(audit)) return { ok: false, error: 'AI_VERIFY_INVALID' };
    const auditByIndex = new Map(audit.filter(x => x && Number.isInteger(x.index)).map(x => [x.index, x]));
    const checked = good.filter((q, index) => {
      const a = auditByIndex.get(index);
      return !!a && a.valid === true && a.duplicate_of === null &&
        Number.isInteger(a.independent_answer) && a.independent_answer === q.answer &&
        a.independent_answer >= 0 && a.independent_answer < 4;
    });
    if (!checked.length) return { ok: false, error: 'AI_VERIFY_REJECTED' };
    return { ok: true, questions: checked, dropped: arr.length - checked.length, verification: 'independent' };
  }
  return { ok: true, questions: good, dropped: arr.length - good.length, verification: 'single-pass' };
}

module.exports = { callClaude, callGemini, callAnthropic, aiEnabled, aiProvider, aiModel, friendlyError, TUTOR_SYSTEM, generateQuestions, generateCurrentAffairs, extractJson, validateQuestion, isValidISODate, nonUpscExamCalibration, nonUpscDifficultyCalibration, questionTextKey, areDuplicateQuestions, priorityExamCalibration, priorityDifficultyCalibration };