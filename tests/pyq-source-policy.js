'use strict';
const assert = require('node:assert/strict');
const { validateOfficialPyqSource } = require('../pyq-source-policy');

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
console.log('PASS official PYQ source allowlist and manual-review guardrails');
