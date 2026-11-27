'use strict';
const assert = require('node:assert/strict');
const { EXAMS, TOPICS } = require('../data/catalog');
const { buildPriorityQuestionBank } = require('../data/priority_question_bank');
const exam = EXAMS.find(x => x.id === 'SSC_CHSL');
assert.ok(exam, 'SSC CHSL must be available in the exam catalog');
assert.equal(exam.pattern.minutes, 60);
assert.equal(exam.pattern.sections.reduce((n,s)=>n+s.questions,0), 100);
assert.deepEqual(exam.pattern.sections.map(s=>[s.subject,s.questions,s.marks,s.negative]),[
  ['English',25,2,0.5],['Reasoning',25,2,0.5],['Quantitative Aptitude',25,2,0.5],['General Awareness',25,2,0.5]
]);
assert.equal(exam.pattern.audit.status,'verified_baseline');
const bank = buildPriorityQuestionBank(EXAMS,TOPICS).filter(q=>q.exam_id==='SSC_CHSL');
for (const [subject,min] of [['English',120],['Reasoning',120],['Quantitative Aptitude',120],['General Awareness',120]]) {
  const rows=bank.filter(q=>q.subject===subject);
  assert.ok(rows.length>=min, subject+' should have at least '+min+' practice questions');
}
for (const q of bank) {
  assert.equal(q.source_type,'ADMIN_PRACTICE','authored questions must not be presented as verified PYQs');
  assert.equal(q.pyq_year ?? null,null);
  assert.ok(q.text && Array.isArray(q.options) && q.options.length===4);
  assert.ok(q.answer>=0 && q.answer<q.options.length);
  assert.ok((TOPICS[q.subject]||[]).includes(q.topic),'topic must be in CHSL syllabus');
}
console.log('SSC CHSL Tier-I pattern and question-bank audit passed ('+bank.length+' authored practice MCQs).');
