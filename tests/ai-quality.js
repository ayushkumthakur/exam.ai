const assert = require('node:assert/strict');
const { validateQuestion, extractJson, isValidISODate, nonUpscExamCalibration, nonUpscDifficultyCalibration } = require('../ai');

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
assert.equal(isValidISODate('2024-02-29'), true, 'valid leap day accepted');
assert.equal(isValidISODate('2025-02-29'), false, 'invalid leap day rejected');
assert.equal(isValidISODate('2026-13-10'), false, 'invalid month rejected');
assert.equal(isValidISODate('2026-10-10'), true, 'current affairs ISO date accepted');
assert.equal(isValidISODate('10-10-2026'), false, 'non-ISO date rejected');
assert.equal(isValidISODate('2026-1-10'), false, 'non-padded date rejected');

assert.match(nonUpscExamCalibration('JEE Main'), /JEE Main calibration/i, 'JEE Main gets its own question style');
assert.match(nonUpscExamCalibration('NEET UG'), /NCERT-centred/i, 'NEET gets NCERT-focused calibration');
assert.match(nonUpscExamCalibration('SBI PO (Prelims)'), /Banking-exam calibration/i, 'banking exams get banking-style questions');
assert.match(nonUpscExamCalibration('RRB NTPC (CBT 1)'), /Railway recruitment calibration/i, 'railway exams get CBT-style questions');
assert.match(nonUpscExamCalibration('CTET (Paper 1)'), /classroom scenarios/i, 'teaching exams get pedagogy scenarios');
assert.match(nonUpscExamCalibration('CLAT (UG)'), /passage-based/i, 'CLAT gets passage-based questions');
assert.match(nonUpscExamCalibration('CBSE Class X'), /Class 10 NCERT/i, 'CBSE classes get class-level board questions');
assert.equal(nonUpscExamCalibration('UPSC CSE Prelims — Paper I (General Studies)'), null, 'UPSC calibration is deliberately untouched');
assert.equal(nonUpscDifficultyCalibration('UPSC CSE Prelims — Paper I (General Studies)', 'hard', 'History'), '', 'UPSC difficulty prompt is deliberately untouched');
assert.match(nonUpscDifficultyCalibration('JEE Advanced', 'hard', 'Physics'), /multiple Physics\/Chemistry\/Mathematics concepts/i, 'JEE Advanced hard level is exam-specific');
assert.match(nonUpscDifficultyCalibration('SBI PO (Prelims)', 'hard', 'Reasoning'), /layered data interpretation/i, 'banking hard level is exam-specific');
assert.match(nonUpscDifficultyCalibration('CBSE Class XII — Science', 'hard', 'Physics'), /board-appropriate competency-based/i, 'CBSE hard level remains board-syllabus appropriate');

console.log('PASS AI question quality regression tests');
