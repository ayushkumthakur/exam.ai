'use strict';
const assert = require('node:assert/strict');
const { validateOfficialPyqSource, validatePyqVerification } = require('../pyq-source-policy');

for (const [exam, url] of [
  ['UPSC_CSE','https://upsc.gov.in/examinations/previous-question-papers'],
  ['UPSC_CSAT','https://www.upsc.gov.in/examinations/previous-question-papers'],
  ['SSC_CGL','https://ssc.gov.in/api/attachment/uploads/masterData/Syllabus/CGL-syllabus-169635-.pdf'],
  ['RBI_B','https://opportunities.rbi.org.in/scripts/bs_viewcontent.aspx?Id=4758']
]) {
  const result = validateOfficialPyqSource(exam,url);
  assert.equal(result.valid,true,exam+' official host should pass allowlist');
  assert.equal(result.requiresManualContentReview,true,'trusted host alone must not claim the item is content-verified');
}
for (const [exam,url] of [
  ['UPSC_CSE','https://testbook.com/upsc-civil-services-exam/previous-year-papers'],
  ['SSC_CGL','https://www.google.com/search?q=ssc+cgl+paper'],
  ['RBI_B','https://example.com/rbi-paper.pdf'],
  ['RBI_B','http://opportunities.rbi.org.in/file.pdf'],
  ['UNKNOWN_EXAM','https://upsc.gov.in/examinations/previous-question-papers']
]) {
  assert.equal(validateOfficialPyqSource(exam,url).valid,false,'unapproved source must be rejected: '+exam+' '+url);
}
const verification = {
  examId: 'UPSC_CSE',
  questionSourceUrl: 'https://www.upsc.gov.in/sites/default/files/QP-CSP-25-GENERAL-STUDIES-PAPER-I-26052025.pdf',
  answerSourceUrl: 'https://www.upsc.gov.in/examinations/answer-key/archives',
  reviewConfirmed: true,
  verificationNotes: 'Matched the exact question wording and option order, then checked the correct option against the official answer source.'
};
assert.equal(validatePyqVerification(verification).valid, true,
  'verified import accepts official sources plus explicit item-level review metadata');
assert.equal(validatePyqVerification({ ...verification, reviewConfirmed: false }).valid, false,
  'a trusted domain must not bypass explicit human review acknowledgement');
assert.equal(validatePyqVerification({ ...verification, answerSourceUrl: '' }).valid, false,
  'a question paper link alone cannot establish an official answer');
assert.equal(validatePyqVerification({ ...verification, answerSourceUrl: 'https://example.com/answer.pdf' }).valid, false,
  'an unofficial answer key cannot establish verified provenance');
assert.equal(validatePyqVerification({ ...verification, verificationNotes: 'Looks right.' }).valid, false,
  'review notes must document the item-level verification');

console.log('PASS official-source allowlist, separate answer source and explicit PYQ review gate');
