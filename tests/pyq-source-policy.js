'use strict';
const assert = require('node:assert/strict');
const { validateOfficialPyqSource, validatePyqVerification } = require('../pyq-source-policy');

const officialQuestion = 'https://www.upsc.gov.in/sites/default/files/QP-CSP-25-GENERAL-STUDIES-PAPER-I-26052025.pdf';
const officialAnswer = 'https://www.upsc.gov.in/examinations/answer-key/archives';
const validReview = {
  examId: 'UPSC_CSE',
  questionSourceUrl: officialQuestion,
  answerSourceUrl: officialAnswer,
  reviewConfirmed: true,
  verificationNotes: 'Compared question wording and all options with the official paper; checked the correct option against the cited official answer source.'
};

// Approved authority hosts are necessary but are never treated as proof of question content.
for (const [exam, url] of [
  ['UPSC_CSE', 'https://upsc.gov.in/examinations/previous-question-papers'],
  ['UPSC_CSAT', 'https://www.upsc.gov.in/examinations/previous-question-papers'],
  ['SSC_CGL', 'https://ssc.gov.in/api/attachment/uploads/masterData/Syllabus/CGL-syllabus-169635-.pdf'],
  ['RBI_B', 'https://opportunities.rbi.org.in/scripts/bs_viewcontent.aspx?Id=4758']
]) {
  const result = validateOfficialPyqSource(exam, url);
  assert.equal(result.valid, true, exam + ' official host should pass allowlist');
  assert.equal(result.requiresManualContentReview, true);
}
for (const [exam, url] of [
  ['UPSC_CSE', 'https://testbook.com/upsc-civil-services-exam/previous-year-papers'],
  ['SSC_CGL', 'https://www.google.com/search?q=ssc+cgl+paper'],
  ['RBI_B', 'https://example.com/rbi-paper.pdf'],
  ['RBI_B', 'http://opportunities.rbi.org.in/file.pdf'],
  ['RBI_B', 'https://opportunities.rbi.org.in.evil.example/paper.pdf'],
  ['RBI_B', 'https://user:pass@opportunities.rbi.org.in/paper.pdf'],
  ['UNKNOWN_EXAM', 'https://upsc.gov.in/examinations/previous-question-papers']
]) {
  assert.equal(validateOfficialPyqSource(exam, url).valid, false,
    'unapproved source must be rejected: ' + exam + ' ' + url);
}

assert.equal(validatePyqVerification(validReview).valid, true,
  'official sources plus explicit item-level human review should pass');

const invalidReviews = [
  [{ ...validReview, reviewConfirmed: false }, 'explicit reviewer confirmation'],
  [{ ...validReview, reviewConfirmed: 'true' }, 'confirmation must be boolean true'],
  [{ ...validReview, answerSourceUrl: '' }, 'official answer source is required'],
  [{ ...validReview, answerSourceUrl: 'https://example.com/answer.pdf' }, 'unofficial answer source is rejected'],
  [{ ...validReview, questionSourceUrl: 'https://example.com/paper.pdf' }, 'unofficial question source is rejected'],
  [{ ...validReview, questionSourceUrl: 'http://www.upsc.gov.in/paper.pdf' }, 'HTTPS is required'],
  [{ ...validReview, verificationNotes: 'Looks right.' }, 'weak review notes are rejected'],
  [{ ...validReview, verificationNotes: 'x'.repeat(1501) }, 'overlong review notes are rejected'],
  [{ ...validReview, verificationNotes: '   ' }, 'blank review notes are rejected']
];
for (const [payload, reason] of invalidReviews) {
  assert.equal(validatePyqVerification(payload).valid, false, reason);
}

// A valid authority URL cannot be substituted for an actual item-level review.
// The policy validates metadata and human acknowledgement, not remote PDF contents.
const result = validatePyqVerification(validReview);
assert.match(result.note, /not automatically inspected/,
  'validator must disclose that official documents are not fetched or content-checked');
console.log('PASS official-source allowlist, hostile URL rejection, answer-source requirement, explicit review gate and disclosure');
