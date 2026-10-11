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
  .replace(/[\\u0300-\\u036f]/g, '')
  .replace(/[^a-z0-9\\s]/g, ' ')
  .replace(/\\s+/g, ' ')
  .trim();
const allBankText = normalizeAuditText(banks.flatMap(([, questions]) =>
  questions.map(question => JSON.stringify(question))).join(' '));
const exactAnchorMatches = officialPaperAnchors.filter(([, phrase]) =>
  allBankText.includes(normalizeAuditText(phrase)));
assert.equal(exactAnchorMatches.length, 0,
  'official 2023 GS-I phrase matches require manual item-level provenance review before any source label changes');
console.log('PASS UPSC CSE 2023 GS-I literal audit: ' + officialPaperAnchors.length +
  ' distinctive question fragments screened; ' + exactAnchorMatches.length +
  ' exact phrase matches in static banks (not a semantic or full-paper verification)');

console.log('PASS source audit: practice banks cannot silently become verified PYQs');
