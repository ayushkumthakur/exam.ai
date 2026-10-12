'use strict';
const assert = require('node:assert/strict');
const { DatabaseSync } = require('node:sqlite');
const { VERIFIED_PYQ_WHERE, isVerifiedPyq } = require('../pyq-record-policy');

const good = {
  exam_id: 'UPSC_CSE', source_type: 'VERIFIED_PYQ', pyq_year: 2025,
  pyq_paper: 'CSE Prelims GS Paper I', source_ref: 'https://www.upsc.gov.in/sites/default/files/paper.pdf',
  answer_source_ref: 'https://www.upsc.gov.in/sites/default/files/answer-key.pdf',
  verification_notes: 'Compared exact wording, all options, and the official answer key.',
  verified_by: 'reviewer@example.com', verified_at: Date.now()
};
assert.equal(isVerifiedPyq(good), true, 'complete reviewed record on official hosts should pass');
for (const [field, value] of [
  ['pyq_year', null], ['pyq_year', 1999], ['pyq_paper', ' '],
  ['source_ref', 'https://upsc.gov.in.evil.example/paper.pdf'],
  ['source_ref', 'http://www.upsc.gov.in/paper.pdf'],
  ['answer_source_ref', 'https://example.com/key.pdf'],
  ['verification_notes', 'Looks right.'], ['verified_by', ' '], ['verified_at', 0]
]) {
  assert.equal(isVerifiedPyq({ ...good, [field]: value }), false,
    'incomplete or untrusted record must fail: ' + field + '=' + value);
}
assert.equal(isVerifiedPyq({ ...good, exam_id: 'SSC_CGL',
  source_ref: 'https://ssc.gov.in/paper.pdf',
  answer_source_ref: 'https://ssc.gov.in/answer-key.pdf' }), true);
assert.equal(isVerifiedPyq({ ...good, exam_id: 'RBI_B',
  source_ref: 'https://opportunities.rbi.org.in/Scripts/bs_viewcontent.aspx?Id=5055',
  answer_source_ref: 'https://opportunities.rbi.org.in/Scripts/bs_viewcontent.aspx?Id=5055' }), true);
assert.equal(isVerifiedPyq({ ...good, exam_id: 'UNKNOWN' }), false);

// Verify that the SQL filter used by public verified-paper queries also excludes
// legacy rows with missing year/paper, hostile URLs, or incomplete review metadata.
const db = new DatabaseSync(':memory:');
try {
  db.exec(`CREATE TABLE questions (
    exam_id TEXT, source_type TEXT, pyq_year INTEGER, pyq_paper TEXT, source_ref TEXT,
    answer_source_ref TEXT, verification_notes TEXT, verified_by TEXT, verified_at INTEGER
  )`);
  const ins = db.prepare('INSERT INTO questions VALUES (?,?,?,?,?,?,?,?,?)');
  ins.run(...['UPSC_CSE', 'VERIFIED_PYQ', 2025, 'GS-I',
    'https://www.upsc.gov.in/paper.pdf', 'https://www.upsc.gov.in/key.pdf',
    good.verification_notes, good.verified_by, good.verified_at]);
  ins.run(...['UPSC_CSE', 'VERIFIED_PYQ', null, null,
    'https://www.upsc.gov.in/paper.pdf', 'https://www.upsc.gov.in/key.pdf',
    good.verification_notes, good.verified_by, good.verified_at]);
  ins.run(...['UPSC_CSE', 'VERIFIED_PYQ', 2025, 'GS-I',
    'https://upsc.gov.in.evil.example/paper.pdf', 'https://www.upsc.gov.in/key.pdf',
    good.verification_notes, good.verified_by, good.verified_at]);
  const count = db.prepare('SELECT COUNT(*) AS n FROM questions WHERE ' + VERIFIED_PYQ_WHERE + " AND exam_id='UPSC_CSE'").get().n;
  assert.equal(count, 1, 'SQL verified-paper filter must admit only the complete official-source record');
} finally { db.close(); }
console.log('PASS strict verified-PYQ record and SQL filter tests');
