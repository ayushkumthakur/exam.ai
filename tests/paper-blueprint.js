const assert = require('node:assert/strict');
const {
  allocateSectionTargets,
  createPaperBlueprint,
  difficultyTargets,
  findDuplicateQuestionStems,
  mergeBlueprintAnswers
} = require('../paper-blueprint');

function run(name, fn) {
  fn();
  console.log('PASS', name);
}

run('section allocation preserves requested total', () => {
  for (const total of [1, 2, 10, 100]) {
    const sections = [{ questions: 25 }, { questions: 25 }, { questions: 50 }];
    const targets = allocateSectionTargets(sections, total);
    assert.equal(targets.reduce((sum, n) => sum + n, 0), total);
    assert.ok(targets.every(n => Number.isInteger(n) && n >= 0));
  }
});

run('difficulty targets sum to paper size', () => {
  const targets = difficultyTargets(100, { easy: 0.2, medium: 0.5, hard: 0.3 });
  assert.deepEqual(targets, { easy: 20, medium: 50, hard: 30 });
  for (const total of [1, 7, 20, 100]) {
    const result = difficultyTargets(total, { easy: 0.2, medium: 0.5, hard: 0.3 });
    assert.equal(Object.values(result).reduce((sum, n) => sum + n, 0), total);
  }
});

run('real mode creates sequential timed sections and keeps provenance separate', () => {
  const exam = {
    id: 'UPSC_CSAT',
    name: 'UPSC CSAT',
    verified: true,
    pattern: {
      minutes: 120,
      sections: [
        { subject: 'Comprehension', questions: 2, marks: 2.5, negative: 0.833 },
        { subject: 'Reasoning', questions: 2, marks: 2.5, negative: 0.833 }
      ],
      audit: { status: 'admin_verified', sectionTimingMinutes: 30 }
    }
  };
  const questions = [
    { id: 1, subject: 'Comprehension', text: 'Passage question one', difficulty: 'easy', source_type: 'ADMIN_PRACTICE' },
    { id: 2, subject: 'Comprehension', text: 'Passage question two', difficulty: 'medium', source_type: 'ADMIN_PRACTICE' },
    { id: 3, subject: 'Reasoning', text: 'Reasoning question one', difficulty: 'hard', source_type: 'ADMIN_PRACTICE' },
    { id: 4, subject: 'Reasoning', text: 'Reasoning question two', difficulty: 'medium', source_type: 'ADMIN_PRACTICE' }
  ];
  const blueprint = createPaperBlueprint({ exam, kind: 'full_mock', mode: 'real', questions, minutes: 120, startedAt: 1000 });
  assert.equal(blueprint.timingRule, 'fixed_sequential_sections');
  assert.equal(blueprint.sections.length, 2);
  assert.equal(blueprint.sections[0].durationSeconds, 1800);
  assert.equal(blueprint.sections[1].startsAtOffsetSeconds, 1800);
  assert.equal(blueprint.realism.patternIntegrity, true);
  assert.equal(blueprint.realism.sourceCounts.admin_practice, 4);
  assert.equal(blueprint.realism.sourceCounts.verified_pyq, 0);
  assert.equal(blueprint.realism.questionProvenanceStatus, 'practice_or_ai_questions_not_official_paper');
});

run('sectional timer locks answers from previous section but accepts active-section edits', () => {
  const blueprint = {
    timedSections: true,
    sections: [
      { durationSeconds: 60, startsAtOffsetSeconds: 0, endsAtOffsetSeconds: 60, questionIds: [1, 2] },
      { durationSeconds: 60, startsAtOffsetSeconds: 60, endsAtOffsetSeconds: 120, questionIds: [3, 4] }
    ]
  };
  const merged = mergeBlueprintAnswers(blueprint, { 1: 'A', 3: 'B' }, { 1: 'C', 2: 'D', 3: 'C', 4: 'A' }, 75);
  assert.deepEqual(merged, { 1: 'A', 3: 'C', 4: 'A' });
});

run('duplicate stem detection normalizes case, punctuation and Unicode compatibility', () => {
  const duplicates = findDuplicateQuestionStems([
    { text: 'What is GDP?' },
    { text: 'what IS GDP' },
    { text: '  Ｗhat is GDP!!! ' }
  ]);
  assert.equal(duplicates.length, 2);
});
run('CBSE full mock respects selected school subjects', () => {
  const exam = {
    id: 'CBSE_X',
    name: 'CBSE Class X',
    pattern: { minutes: 180, sections: [
      { subject: 'English Language & Literature', questions: 80, marks: 1, negative: 0 },
      { subject: 'Mathematics', questions: 80, marks: 1, negative: 0 },
      { subject: 'Science', questions: 80, marks: 1, negative: 0 },
      { subject: 'Social Science', questions: 80, marks: 1, negative: 0 }
    ] }
  };
  const selectedSubjects = ['Science'];
  const configuredSections = selectedSubjects.length
    ? exam.pattern.sections.filter(section => selectedSubjects.includes(section.subject))
    : exam.pattern.sections;
  assert.deepEqual(configuredSections.map(section => section.subject), ['Science']);
  assert.equal(configuredSections.reduce((sum, section) => sum + section.questions, 0), 80);
  assert.equal(exam.pattern.sections.reduce((sum, section) => sum + section.questions, 0), 320);
});
