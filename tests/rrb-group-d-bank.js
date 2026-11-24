'use strict';
const assert = require('node:assert/strict');
const { EXAMS, TOPICS } = require('../data/catalog');
const { buildPriorityQuestionBank } = require('../data/priority_question_bank');

const exam = EXAMS.find(x => x.id === 'RRB_GROUP_D');
assert.ok(exam, 'RRB Group D must exist in the catalog');
assert.equal(exam.pattern.minutes, 90);
assert.equal(exam.pattern.sections.reduce((n, s) => n + s.questions, 0), 100);
assert.deepEqual(
  exam.pattern.sections.map(s => [s.subject, s.questions]),
  [['General Science',25],['Mathematics',25],['Reasoning',30],['General Awareness',20]]
);
assert.ok(exam.pattern.sections.every(s => s.negative === 1/3));

const bank = buildPriorityQuestionBank(EXAMS, TOPICS).filter(q => q.exam_id === 'RRB_GROUP_D');
const expected = [
  ['General Science','Physics',150],
  ['General Science','Chemistry',150],
  ['General Science','Life Sciences',150],
  ['Mathematics','Percentage',18],
  ['Reasoning','Series',72],
  ['General Awareness','Static GK',150],
  ['General Awareness','Current Affairs',100]
];
for (const [subject, topic, minimum] of expected) {
  const rows = bank.filter(q => q.subject === subject && q.topic === topic);
  assert.ok(rows.length >= minimum, subject + '/' + topic + ' should have at least ' + minimum + ' questions');
}
assert.equal(bank.filter(q => q.subject === 'Mathematics').length, 180, 'Maths bank should contain 180 questions across the mapped syllabus topics');
assert.equal(bank.filter(q => q.subject === 'Reasoning').length, 180, 'Reasoning bank should contain 180 questions across the mapped syllabus topics');
for (const q of bank) {
  assert.equal(q.source_type, 'ADMIN_PRACTICE', 'generated RRB questions must not be presented as verified PYQs');
  assert.equal(q.pyq_year ?? null, null);
  assert.ok(q.text && Array.isArray(q.options) && q.options.length === 4);
  assert.ok(q.answer >= 0 && q.answer < q.options.length);
  assert.ok((TOPICS[q.subject] || []).includes(q.topic), 'topic must be in the RRB syllabus');
}
console.log('RRB Group D 2026 pattern and question bank audit passed (' + bank.length + ' practice questions).');
