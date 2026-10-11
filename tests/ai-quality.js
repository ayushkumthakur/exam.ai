const assert = require('node:assert/strict');
const { EXAMS, TOPICS } = require('../data/catalog');
const BASE_QUESTION_SEED = require('../data/seed_questions');
const EXPANDED_QUESTION_SEED = require('../data/expanded_question_bank');
const { buildExamQuestionBank } = require('../data/question_bank');
const { buildPriorityQuestionBank } = require('../data/priority_question_bank');
const { buildCatalogQuestionBank } = require('../data/catalog_question_bank');
const { validateQuestion, extractJson, isValidISODate, nonUpscExamCalibration, nonUpscDifficultyCalibration, areDuplicateQuestions, priorityExamCalibration, priorityDifficultyCalibration } = require('../ai');
const { allocateSectionTargets, createPaperBlueprint, activeSectionIndex, mergeBlueprintAnswers, difficultyProfileForExam, difficultyTargets } = require('../paper-blueprint');

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


const cglSections = [
  { subject: 'Reasoning', questions: 25, marks: 2, negative: 0.5 },
  { subject: 'General Awareness', questions: 25, marks: 2, negative: 0.5 },
  { subject: 'Quantitative Aptitude', questions: 25, marks: 2, negative: 0.5 },
  { subject: 'English', questions: 25, marks: 2, negative: 0.5 }
];
assert.deepEqual(allocateSectionTargets(cglSections, 100), [25, 25, 25, 25], 'full-paper allocation preserves exact official section counts');
assert.deepEqual(allocateSectionTargets([{ questions: 17 }, { questions: 17 }, { questions: 16 }], 20), [7, 7, 6], 'scaled practice allocation uses largest-remainder rounding');
const cglQuestions = cglSections.flatMap(section => Array.from({ length: section.questions }, (_, i) => ({ id: section.subject + '-' + i, subject: section.subject })));
const cglBlueprint = createPaperBlueprint({
  exam: { id: 'SSC_CGL', name: 'SSC CGL Tier-I', pattern: { minutes: 60, sections: cglSections, audit: { sectionTimingMinutes: 15 } } },
  kind: 'full_mock', mode: 'real', questions: cglQuestions, minutes: 60, startedAt: 100000
});
assert.equal(cglBlueprint.timedSections, true, 'real SSC CGL mock enables timed sections');
assert.deepEqual(cglBlueprint.sections.map(section => section.durationSeconds), [900, 900, 900, 900], 'SSC CGL uses four 15-minute sections');
assert.deepEqual(cglBlueprint.sections.map(section => section.startsAtOffsetSeconds), [0, 900, 1800, 2700], 'section timers run sequentially from test start');
assert.equal(activeSectionIndex(cglBlueprint, 901), 1, 'blueprint identifies current section from elapsed time');
assert.deepEqual(mergeBlueprintAnswers(cglBlueprint, {}, { 'Reasoning-0': 1, 'General Awareness-0': 2 }, 899), { 'Reasoning-0': 1 }, 'future-section answers are rejected before that section starts');
assert.deepEqual(mergeBlueprintAnswers(cglBlueprint, { 'Reasoning-0': 1 }, { 'Reasoning-0': 3, 'General Awareness-0': 2 }, 901), { 'Reasoning-0': 1, 'General Awareness-0': 2 }, 'past-section answers are locked while the current section accepts answers');
assert.deepEqual(mergeBlueprintAnswers(cglBlueprint, { 'Reasoning-0': 1, 'General Awareness-0': 2 }, { 'Reasoning-0': 3 }, 1801), { 'Reasoning-0': 1, 'General Awareness-0': 2 }, 'expired sections remain locked after the next section begins');
const upscBlueprint = createPaperBlueprint({
  exam: { id: 'UPSC_CSE', name: 'UPSC CSE GS', pattern: { minutes: 120, sections: cglSections } },
  kind: 'full_mock', mode: 'real', questions: cglQuestions, minutes: 120, startedAt: 100000
});
assert.equal(upscBlueprint.timedSections, false, 'exams without verified sectional timers retain one overall timer');

console.log('PASS AI question quality, pattern audit and real-paper blueprint regression tests');

const expandedBank = buildExamQuestionBank(EXAMS, TOPICS, BASE_QUESTION_SEED, EXPANDED_QUESTION_SEED);
assert.ok(expandedBank.length >= 300, 'expanded bank should contain hundreds of exam-specific practice rows');
assert.ok(expandedBank.every(q => q.source_type === 'ADMIN_PRACTICE'), 'expanded questions must never be labelled as verified PYQs');
assert.ok(expandedBank.every(q => TOPICS[q.subject]?.includes(q.topic)), 'every question topic must be allowed by its subject syllabus');
const bankCoverage = new Map();
for (const q of expandedBank) bankCoverage.set(q.exam_id + '|' + q.subject, (bankCoverage.get(q.exam_id + '|' + q.subject) || 0) + 1);
for (const exam of EXAMS) {
  for (const section of exam.pattern.sections) {
    assert.ok((bankCoverage.get(exam.id + '|' + section.subject) || 0) > 0,
      'every exam section needs at least one syllabus-aligned question: ' + exam.id + ' / ' + section.subject);
  }
}
assert.ok(EXAMS.every(exam => expandedBank.some(q => q.exam_id === exam.id)), 'all catalog exams need a non-empty exam-specific question bank');


const priorityBank = buildPriorityQuestionBank(EXAMS, TOPICS);
const priorityIds = ['UPSC_CSE','UPSC_CSAT','SSC_CGL','RBI_B'];
for (const id of priorityIds) {
  const examRows = priorityBank.filter(q => q.exam_id === id);
  assert.ok(examRows.length >= 500, id + ' should have at least 500 authored practice questions');
  const stems = new Set();
  for (const q of examRows) {
    const key = q.subject + '|' + q.text;
    assert.ok(!stems.has(key), id + ' should not contain duplicate question stems: ' + q.text.slice(0,80));
    stems.add(key);
  }
  const coverage = new Set(examRows.map(q => q.subject));
  const exam = EXAMS.find(e => e.id === id);
  for (const section of exam.pattern.sections) {
    assert.ok(coverage.has(section.subject), id + ' should cover section ' + section.subject);
  }
}
assert.ok(priorityBank.every(q => q.source_type === 'ADMIN_PRACTICE'), 'priority banks must not mislabel authored practice as verified PYQ');
assert.ok(priorityBank.every(q => TOPICS[q.subject]?.includes(q.topic)), 'priority questions must use valid syllabus topics');
assert.ok(priorityBank.every(q => Array.isArray(q.options) && q.options.length === 4 && new Set(q.options).size === 4), 'every priority MCQ must have four distinct options');
assert.ok(priorityBank.every(q => Number.isInteger(q.answer) && q.answer >= 0 && q.answer < q.options.length), 'every priority answer key must point to a valid option');
assert.ok(priorityBank.every(q => typeof q.explanation === 'string' && q.explanation.length >= 20), 'every priority question must have an explanation');

const reviewedPriority = priorityBank.filter(q => String(q.concept || '').startsWith('Exam-realism reviewed:'));
assert.ok(reviewedPriority.length >= 20, 'priority banks should include a reviewed exam-style layer');
assert.ok(reviewedPriority.every(q => q.source_type === 'ADMIN_PRACTICE'), 'reviewed original items must not be mislabelled as verified PYQs');
assert.equal(new Set(reviewedPriority.map(q => q.exam_id + '|' + q.subject + '|' + q.text)).size, reviewedPriority.length,
  'reviewed question stems must be unique within each exam section');
for (const q of reviewedPriority) {
  assert.ok(['UPSC_CSE','UPSC_CSAT','SSC_CGL','RBI_B'].includes(q.exam_id), 'reviewed layer is limited to priority exams');
  assert.equal(new Set(q.options.map(option => String(option).trim().toLowerCase())).size, 4,
    'reviewed question options must be unique: ' + q.text.slice(0,90));
  assert.ok(q.options.every(option => String(option).trim().length > 0), 'reviewed options must not be empty');
  assert.ok(q.concept.startsWith('Exam-realism reviewed:'), 'review status must be visible in question metadata');
}
const generatedStatementItems = priorityBank.filter(q => /^Consider the following statements:/i.test(q.text));
const statementTriples = generatedStatementItems.map(q => q.exam_id + '|' + q.subject + '|' + q.text.split('Which of the statements given above are correct?')[0].trim().toLowerCase());
assert.equal(new Set(statementTriples).size, statementTriples.length,
  'statement-question builder must not inflate bank size by permuting the same three facts');



const catalogBank = buildCatalogQuestionBank(EXAMS, TOPICS, BASE_QUESTION_SEED, EXPANDED_QUESTION_SEED);
const prioritySet = new Set(['UPSC_CSE','UPSC_CSAT','SSC_CGL','RBI_B']);
for (const exam of EXAMS.filter(e => !prioritySet.has(e.id))) {
  const examRows = catalogBank.filter(q => q.exam_id === exam.id);
  assert.ok(examRows.length >= 500, exam.id + ' should have at least 500 practice questions');
  const bySubject = new Map();
  for (const q of examRows) {
    assert.ok(TOPICS[q.subject]?.includes(q.topic), exam.id + ' question topic must be in syllabus: ' + q.subject + ' / ' + q.topic);
    assert.equal(q.source_type, 'ADMIN_PRACTICE', 'catalog-generated questions must not be labelled as verified PYQs');
    assert.ok(Array.isArray(q.options) && q.options.length === 4 && new Set(q.options).size === 4, 'every catalog MCQ must have four distinct options');
    assert.ok(Number.isInteger(q.answer) && q.answer >= 0 && q.answer < q.options.length, 'catalog answer index must be valid');
    assert.ok(typeof q.explanation === 'string' && q.explanation.length >= 20, 'catalog questions must include explanations');
    const key = q.subject + '|' + q.text;
    assert.ok(!bySubject.has(key), exam.id + ' should not contain duplicate stems within a subject: ' + q.text.slice(0,90));
    bySubject.set(key, true);
  }
  const subjects = new Set(examRows.map(q => q.subject));
  for (const section of exam.pattern.sections) {
    assert.ok(subjects.has(section.subject), exam.id + ' must cover section ' + section.subject);
  }
}


const realismExamIds = ['UPSC_CSE','SSC_CGL','RBI_B'];
for (const id of realismExamIds) {
  const exam = EXAMS.find(item => item.id === id);
  const questions = exam.pattern.sections.flatMap((section, si) =>
    Array.from({ length: section.questions }, (_, i) => ({
      id: si * 1000 + i + 1,
      subject: section.subject,
      difficulty: ['easy','medium','hard'][(i + si) % 3]
    }))
  );
  const blueprint = createPaperBlueprint({
    exam, kind: 'full_mock', mode: 'real', questions,
    minutes: exam.pattern.minutes, startedAt: 1000
  });
  assert.equal(blueprint.questionCount, exam.pattern.sections.reduce((sum, section) => sum + section.questions, 0));
  assert.equal(blueprint.durationMinutes, exam.pattern.minutes);
  assert.equal(blueprint.realism.patternIntegrity, true, id + ' preserves section counts and marking');
  assert.equal(
    blueprint.realism.difficultyDistribution.easy + blueprint.realism.difficultyDistribution.medium + blueprint.realism.difficultyDistribution.hard,
    blueprint.questionCount, id + ' reports difficulty labels without altering the paper'
  );
  assert.ok(blueprint.realism.patternStatus, id + ' discloses pattern verification status');
  assert.ok(Array.isArray(blueprint.realism.limitations), id + ' discloses known runtime limitations');
}
assert.deepEqual(allocateSectionTargets([{questions:25},{questions:25},{questions:50}],20),[5,5,10]);
for (const [id, expected] of [
  ['UPSC_CSE',{easy:20,medium:50,hard:30}],
  ['SSC_CGL',{easy:35,medium:45,hard:20}],
  ['RBI_B',{easy:20,medium:50,hard:30}]
]) {
  const profile = difficultyProfileForExam(id);
  const targets = difficultyTargets(100, profile);
  assert.deepEqual(targets, expected, id + ' uses its documented practice difficulty profile');
  assert.equal(Object.values(targets).reduce((sum,n)=>sum+n,0),100,id+' difficulty targets sum to paper size');
  assert.match(profile.label,/practice estimate/i,id+' profile is clearly labelled as an estimate');
}

console.log('PASS AI quality, paper blueprint, and all-exam question-bank coverage tests');
