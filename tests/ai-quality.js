const assert = require('node:assert/strict');
const { validateQuestion, extractJson } = require('../ai');

const base = {
  text: 'A sample exam question asks which value is correct?',
  options: ['12', '14', '16', '18'],
  answer: 2,
  explanation: 'The correct value is 16 because the calculation gives sixteen.',
  subject: 'Quantitative Aptitude',
  topic: 'Arithmetic',
  difficulty: 'medium'
};
const allowed = { subject: 'Quantitative Aptitude', topic: 'Arithmetic', difficulty: 'medium' };
assert.ok(validateQuestion(base, allowed), 'valid four-option MCQ accepted');
assert.equal(validateQuestion({ ...base, options: ['16', '16', '18', '20'] }, allowed), null, 'duplicate options rejected');
assert.equal(validateQuestion({ ...base, options: ['A-B', 'a b', 'C', 'D'] }, allowed), null, 'punctuation/case-only duplicate options rejected');
assert.equal(validateQuestion({ ...base, options: ['12', '', '16', '18'] }, allowed), null, 'empty option rejected');
assert.equal(validateQuestion({ ...base, answer: 4 }, allowed), null, 'answer index outside options rejected');
assert.equal(validateQuestion({ ...base, explanation: 'yes' }, allowed), null, 'short explanation rejected');
assert.equal(validateQuestion({ ...base, difficulty: 'easy' }, allowed), null, 'difficulty mismatch rejected');
assert.equal(validateQuestion({ ...base, options: ['क', 'ख', 'ग', 'घ'] }, allowed) !== null, true, 'Unicode options accepted');
assert.deepEqual(extractJson('prefix [ {"index":0,"valid":true} ] suffix'), [{ index: 0, valid: true }], 'JSON array extraction tolerates surrounding text');
console.log('PASS AI question quality regression tests');
