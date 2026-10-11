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
assert.equal(audit.current_verified_question_count, 0,
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
console.log('PASS source audit: practice banks cannot silently become verified PYQs');
