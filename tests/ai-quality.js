const assert = require('node:assert/strict');
const { EXAMS } = require('../data/catalog');
const { validateQuestion, extractJson, isValidISODate, nonUpscExamCalibration, nonUpscDifficultyCalibration, areDuplicateQuestions, priorityExamCalibration, priorityDifficultyCalibration } = require('../ai');

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
assert.match(nonUpscExamCalibration('CBSE Class XI'), /Class XI calibration/i, 'CBSE Class XI does not fall through to Class X');
assert.match(nonUpscExamCalibration('CBSE Class XII — Science'), /Class XII calibration/i, 'CBSE Class XII does not fall through to Class X or XI');
assert.equal(nonUpscExamCalibration('UPSC CSE Prelims — Paper I (General Studies)'), null, 'UPSC calibration is deliberately untouched');
assert.equal(nonUpscDifficultyCalibration('UPSC CSE Prelims — Paper I (General Studies)', 'hard', 'History'), '', 'UPSC difficulty prompt is deliberately untouched');
assert.match(nonUpscDifficultyCalibration('JEE Advanced', 'hard', 'Physics'), /multiple Physics\/Chemistry\/Mathematics concepts/i, 'JEE Advanced hard level is exam-specific');
assert.match(nonUpscDifficultyCalibration('SBI PO (Prelims)', 'hard', 'Reasoning'), /layered data interpretation/i, 'banking hard level is exam-specific');
assert.match(nonUpscDifficultyCalibration('CBSE Class XII — Science', 'hard', 'Physics'), /board-appropriate competency-based/i, 'CBSE hard level remains board-syllabus appropriate');


assert.equal(areDuplicateQuestions(base, [{ ...base, text: 'A sample exam question asks which value is correct?' }]), true, 'exact duplicate question detected');
assert.equal(areDuplicateQuestions({ text: 'A train travels 120 kilometres in 2 hours. What is its average speed in kilometres per hour?' }, [{ text: 'A train travels 150 kilometres in 3 hours. What is its average speed in kilometres per hour?' }]), true, 'numeric variants of the same question template are detected');
assert.equal(areDuplicateQuestions({ text: 'A train travels 120 kilometres in 2 hours. What is its average speed in kilometres per hour?' }, [{ text: 'A shopkeeper sells 12 pens at a profit of 15 percent. Calculate the selling price of one pen.' }]), false, 'different questions from the same subject are retained');
assert.equal(areDuplicateQuestions('Which planet is known as the Red Planet?', ['Which planet is known as the Red Planet?']), true, 'short exact duplicates are detected');

assert.match(priorityExamCalibration('UPSC CSE Prelims — Paper I (General Studies)', 'Polity', 'Fundamental Rights'), /two\/three-statement questions/i, 'UPSC GS uses real prelims question construction');
assert.match(priorityExamCalibration('UPSC CSAT — Prelims Paper II (Qualifying)', 'Quantitative Aptitude', 'Percentages'), /80 questions, 200 marks, 120 minutes/i, 'UPSC CSAT uses its separate qualifying paper style');
assert.match(priorityExamCalibration('SSC CGL (Tier 1)', 'Quantitative Aptitude', 'Percentage'), /25 per section.*60 minutes/s, 'SSC CGL calibration includes the Tier-I section split and timer');
assert.match(priorityExamCalibration('SSC CGL (Tier 1)', 'English', 'Error Spotting'), /error spotting.*fill in the blanks/i, 'SSC CGL English uses SSC question formats');
assert.match(priorityExamCalibration('RBI Grade B (Phase 1)', 'General Awareness', 'Monetary Policy'), /RBI and monetary policy.*never invent current figures/i, 'RBI Grade B GA is economy and banking focused');
assert.match(priorityExamCalibration('RBI Grade B (Phase 1)', 'Reasoning', 'Seating Arrangement'), /banking-style seating arrangements and puzzles/i, 'RBI Grade B reasoning uses banking exam patterns');
assert.match(priorityDifficultyCalibration('UPSC CSE Prelims — Paper I (General Studies)', 'History', 'hard'), /statement combinations and close elimination/i, 'UPSC hard difficulty is nuanced not obscure');
assert.match(priorityDifficultyCalibration('SSC CGL (Tier 1)', 'Quantitative Aptitude', 'hard'), /SSC CGL difficulty.*time pressure/i, 'SSC CGL hard difficulty remains time-pressured');
assert.match(priorityDifficultyCalibration('RBI Grade B (Phase 1)', 'General Awareness', 'hard'), /economy\/banking depth/i, 'RBI Grade B hard GA adds specialist depth');
assert.equal(priorityExamCalibration('JEE Main', 'Physics', 'Mechanics'), null, 'priority calibration leaves other exam calibration to existing logic');

// Official-pattern audit regression checks: distinguish verified totals from approximate subject splits.
const examPattern = id => EXAMS.find(exam => exam.id === id).pattern;
const upscGs = examPattern('UPSC_CSE');
assert.equal(upscGs.sections.reduce((sum, section) => sum + section.questions, 0), 100, 'UPSC GS practice allocation totals 100 questions');
assert.equal(upscGs.minutes, 120, 'UPSC GS baseline is 120 minutes');
assert.equal(upscGs.audit.status, 'partially_verified', 'UPSC subject distribution is explicitly marked approximate');
assert.ok(upscGs.audit.approximateFields.includes('subjectWiseQuestionCounts'), 'UPSC subject-wise counts are not falsely claimed as official quotas');
const csat = examPattern('UPSC_CSAT');
assert.equal(csat.sections.reduce((sum, section) => sum + section.questions, 0), 80, 'CSAT practice allocation totals 80 questions');
assert.equal(csat.audit.status, 'partially_verified', 'CSAT subject split is marked approximate');
const cgl = examPattern('SSC_CGL');
assert.equal(cgl.sections.reduce((sum, section) => sum + section.questions, 0), 100, 'SSC CGL Tier-I totals 100 questions');
assert.equal(cgl.sections.reduce((sum, section) => sum + section.questions * section.marks, 0), 200, 'SSC CGL Tier-I totals 200 marks');
assert.equal(cgl.minutes, 60, 'SSC CGL Tier-I duration is 60 minutes');
assert.equal(cgl.sections[0].negative, 0.5, 'SSC CGL Tier-I negative marking is 0.50');
assert.ok(cgl.audit.runtimeLimitations.some(item => item.includes('section') && item.includes('timers')), 'SSC CGL sectional-timer limitation is disclosed');
const rbi = examPattern('RBI_B');
assert.equal(rbi.sections.reduce((sum, section) => sum + section.questions, 0), 200, 'RBI Grade B Phase-I totals 200 questions');
assert.equal(rbi.sections.reduce((sum, section) => sum + section.questions * section.marks, 0), 200, 'RBI Grade B Phase-I totals 200 marks');
assert.equal(rbi.minutes, 120, 'RBI Grade B Phase-I duration is 120 minutes');
assert.equal(rbi.sections[0].negative, 0.25, 'RBI Grade B Phase-I negative marking is 0.25');
assert.equal(rbi.audit.status, 'verified_baseline', 'RBI Phase-I official baseline is recorded');

console.log('PASS AI question quality and official-pattern audit regression tests');
