'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { EXAMS, TOPICS } = require('../data/catalog');
const BASE = require('../data/seed_questions');
const EXPANDED = require('../data/expanded_question_bank');
const { buildExamQuestionBank } = require('../data/question_bank');
const { buildPriorityQuestionBank } = require('../data/priority_question_bank');
const { buildCatalogQuestionBank } = require('../data/catalog_question_bank');

const audit = JSON.parse(fs.readFileSync(path.join(__dirname, '../data/pyq_source_audit.json'), 'utf8'));
assert.equal(audit.verified_question_count_in_static_seed_banks, 0,
  'source audit must not claim individual PYQs are verified without item-level evidence');
assert.ok(audit.sources.some(s => s.exam_id === 'UPSC_CSE'));
assert.ok(audit.sources.some(s => s.exam_id === 'SSC_CGL'));
assert.ok(audit.sources.some(s => s.exam_id === 'RBI_B'));

const banks = [
  ['base/expanded mapped bank', buildExamQuestionBank(EXAMS, TOPICS, BASE, EXPANDED)],
  ['priority bank', buildPriorityQuestionBank(EXAMS, TOPICS)],
  ['catalog bank', buildCatalogQuestionBank(EXAMS, TOPICS, BASE, EXPANDED)]
];
for (const [name, questions] of banks) {
  assert.ok(questions.length > 0, name + ' should not be empty');
  for (const q of questions) {
    assert.equal(q.source_type, 'ADMIN_PRACTICE', name + ' must not invent verified PYQ provenance');
    assert.equal(q.pyq_year ?? null, null, name + ' must not invent a PYQ year');
    assert.equal(q.source_ref ?? null, null, name + ' must not invent an item-specific official source');
  }
}
// Official-paper anchor audit: these short, distinctive phrases are transcribed from
// UPSC CSE Prelims 2023 GS-I (Series A). This is a literal phrase screen only, not a
// semantic similarity check and not permission to promote a question to VERIFIED_PYQ.
const officialPaperAnchors = [
  ['Q1', 'Jhelum River passes through Wular Lake'],
  ['Q1', 'Krishna River directly feeds Kolleru Lake'],
  ['Q1', 'Meandering of Gandak River formed Kanwar Lake'],
  ['Q2', 'Kamarajar Port first major port in India registered as a company'],
  ['Q2', 'Mundra Port largest privately owned port in India'],
  ['Q2', 'Visakhapatnam Port largest container port in India'],
  ['Q3', 'Jackfruit Artocarpus heterophyllus'],
  ['Q3', 'Mahua Madhuca indica'],
  ['Q3', 'Teak Tectona grandis'],
  ['Q5', 'repeated falls in sea level giving rise to present-day extensive marshland'],
  ['Q6', 'Ilmenite and rutile abundantly available in certain coastal tracts of India'],
  ['Q7', "three-fourths of world's cobalt"],
  ['Q8', 'part of the Congo Basin'],
  ['Q9', 'Amarkantak Hills confluence of Vindhya and Sahyadri Ranges'],
  ['Q9', 'Biligirirangan Hills easternmost part of Satpura Range'],
  ['Q9', 'Seshachalam Hills southernmost part of Western Ghats'],
  ['Q10', 'East-West Corridor under Golden Quadrilateral connects Dibrugarh and Surat'],
  ['Q10', 'Trilateral Highway connects Moreh in Manipur and Chiang Mai in Thailand via Myanmar'],
  ['Q10', 'Bangladesh-China-India-Myanmar Economic Corridor connects Varanasi with Kunming'],
  ['Q11', 'Uranium enriched to at least 60% required for production of electricity'],
  ['Q12', 'Marsupials can thrive only in montane grasslands with no predators'],
  ['Q13', 'Invasive Species Specialist Group develops Global Invasive Species Database'],
  ['Q14', 'Lion-tailed Macaque Malabar Civet Sambar Deer nocturnal'],
  ['Q15', 'Honeybees waggle dance indicate direction and distance to food'],
  ['Q16', 'mushrooms bioluminescent properties'],
  ['Q17', 'Indian squirrels build nests by making burrows in the ground'],
  ['Q89', 'Stability and Growth Pact of the European Union treaty'],
  ['Q90', 'Global Compact for Safe Orderly and Regular Migration'],
  ['Q91', 'Home Guards Act and Rules of the Central Government'],
  ['Q92', 'Unauthorized wearing police or military uniforms Official Secrets Act 1923']
];
const normalizeAuditText = value => String(value || '')
  .toLowerCase()
  .normalize('NFKD')
  .replace(/[\u0300-\u036f]/g, '')
  .replace(/[^a-z0-9\s]/g, ' ')
  .replace(/\s+/g, ' ')
  .trim();
const allBankText = normalizeAuditText(banks.flatMap(([, questions]) =>
  questions.map(question => JSON.stringify(question))).join(' '));
const exactAnchorMatches = officialPaperAnchors.filter(([, phrase]) =>
  allBankText.includes(normalizeAuditText(phrase)));
assert.equal(exactAnchorMatches.length, 0,
  'official 2023 GS-I phrase matches require manual item-level provenance review before any source label changes');

// Fuzzy lexical triage is intentionally a candidate finder, not a semantic proof.
// Remove common words, compare distinctive-token overlap, and print candidates for
// human inspection. Never use a score to assign VERIFIED_PYQ automatically.
const stopWords = new Set(('a an the and or of to in on at for from by with is are was were be been being ' +
  'it its this that these those which what when where who how as into through only must can may will ' +
  'under over after before present day required use used part parts question questions ' +
  'river rivers lake lakes port ports passes passed india indian following statements statement ' +
  'given above correct incorrect which following connect connects connected country countries ' +
  'region regions species specieses available required production electricity paper examination ' +
  'question questions list listed following three four one two first second third').split(/\s+/));
function tokens(value) {
  return new Set(normalizeAuditText(value).split(/\s+/).filter(token =>
    token.length >= 3 && !stopWords.has(token)));
}
function overlapScore(left, right) {
  const a = tokens(left), b = tokens(right);
  const common = [...a].filter(token => b.has(token));
  if (common.length < 3 || !a.size || !b.size) return 0;
  const jaccard = common.length / (a.size + b.size - common.length);
  const containment = common.length / Math.min(a.size, b.size);
  return { score: Math.max(jaccard, containment), shared: common.length, terms: common };
}
const fuzzyCandidates = [];
for (const [bankName, questions] of banks) {
  for (const question of questions) {
    const questionText = String(question.text || '');
    if (!questionText) continue;
    for (const [questionNo, phrase] of officialPaperAnchors) {
      const result = overlapScore(phrase, questionText);
      if (result && result.score >= 0.34) fuzzyCandidates.push({
        bank: bankName, questionNo, score: Number(result.score.toFixed(3)),
        sharedTerms: result.terms, text: questionText
      });
    }
  }
}
fuzzyCandidates.sort((a, b) => b.score - a.score || b.sharedTerms.length - a.sharedTerms.length);
const uniqueCandidates = [];
const seenCandidates = new Set();
for (const candidate of fuzzyCandidates) {
  const key = candidate.bank + '|' + candidate.text;
  if (seenCandidates.has(key)) continue;
  seenCandidates.add(key);
  uniqueCandidates.push(candidate);
}
console.log('UPSC 2023 GS-I fuzzy lexical triage candidates (manual review only): ' +
  JSON.stringify(uniqueCandidates.slice(0, 20)));
console.log('PASS UPSC CSE 2023 GS-I audit: ' + officialPaperAnchors.length +
  ' distinctive fragments screened; exact matches=' + exactAnchorMatches.length +
  '; fuzzy candidates=' + uniqueCandidates.length +
  '. Fuzzy score is not semantic verification and cannot establish PYQ provenance.');

console.log('PASS source audit: practice banks cannot silently become verified PYQs');
