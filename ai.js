// AI layer: Gemini Developer API first (free-tier friendly), Anthropic fallback.
// API keys stay server-side in Railway and are never exposed to the browser.
const PROVIDER = () => (process.env.AI_PROVIDER || 'gemini').toLowerCase();
const GEMINI_KEY = () => process.env.GEMINI_API_KEY;
const GEMINI_MODEL = () => process.env.GEMINI_MODEL || 'gemini-2.5-flash';
const ANTHROPIC_KEY = () => process.env.ANTHROPIC_API_KEY;
const ANTHROPIC_MODEL = () => process.env.ANTHROPIC_MODEL || 'claude-sonnet-5-5';

function activeProvider() {
  const p = PROVIDER();
  if (p === 'anthropic') return ANTHROPIC_KEY() ? 'anthropic' : (GEMINI_KEY() ? 'gemini' : null);
  if (p === 'gemini') return GEMINI_KEY() ? 'gemini' : (ANTHROPIC_KEY() ? 'anthropic' : null);
  return GEMINI_KEY() ? 'gemini' : (ANTHROPIC_KEY() ? 'anthropic' : null);
}
const aiEnabled = () => !!activeProvider();
const aiProvider = () => activeProvider() || PROVIDER();
const aiModel = () => activeProvider() === 'anthropic' ? ANTHROPIC_MODEL() : GEMINI_MODEL();

const FRIENDLY = {
  AI_NOT_CONFIGURED: 'AI is not configured on this server yet. Add GEMINI_API_KEY in Railway (recommended) or an Anthropic key.',
  AI_TIMEOUT: 'The AI took too long to respond. Please try again.',
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

Accuracy rules (more important than speed): re-check interpretation, formula, arithmetic, units, signs and option matching before answering. If the question is ambiguous, begin with "This question appears ambiguous." and explain why instead of guessing. For recent events or facts you cannot verify, say "I can't reliably verify the latest information from the available data." Never fabricate current events, statistics or sources. Tailor content to ${ctx.examName}; do not mix in other exams' content.`;

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
  return { text, options, answer, explanation, subject: allowed.subject || subject, topic: allowed.topic || topic, difficulty,
    concept: String(x.concept || '').trim() || null, tip: String(x.tip || '').trim() || null };
}

async function generateQuestions({ examName, subject, topic, difficulty, count, weakNote, level }) {
  const system = `You write exam-quality multiple-choice questions for ${examName} (India). Output ONLY a JSON array, no prose.
Each item: {"text":string,"options":[4 distinct strings],"answer":index 0-3,"explanation":string (step-by-step, verified),"concept":string,"tip":string,"subject":"${subject}","topic":"${topic}","difficulty":"easy|medium|hard"}.
Rules: exactly one correct option; verify all arithmetic before writing the answer; no ambiguous or unanswerable questions; no facts that change with time unless certain; do NOT claim these are real previous-year questions. Level of student: ${level || 'intermediate'}.${weakNote ? ' Focus: ' + weakNote : ''}`;
  const r = await callClaude({ system, maxTokens: 3500, messages: [{ role: 'user', content: `Write ${count} ${difficulty} MCQs on ${subject} → ${topic}.` }] });
  if (!r.ok) return r;
  const arr = extractJson(r.text);
  if (!Array.isArray(arr)) return { ok: false, error: 'AI_INVALID' };
  const good = arr.map(x => validateQuestion(x, { subject, topic, difficulty })).filter(Boolean);
  if (!good.length) return { ok: false, error: 'AI_INVALID' };
  return { ok: true, questions: good, dropped: arr.length - good.length };
}

module.exports = { callClaude, callGemini, aiEnabled, aiProvider, aiModel, friendlyError, TUTOR_SYSTEM, generateQuestions, extractJson, validateQuestion };