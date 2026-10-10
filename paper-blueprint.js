// Real-paper blueprint utilities. Pure functions are intentionally testable without a database.
function allocateSectionTargets(sections, total) {
  const weightTotal = sections.reduce((sum, section) => sum + Math.max(0, Number(section.questions) || 0), 0);
  if (!sections.length || !weightTotal || !Number.isFinite(total) || total < 1) return sections.map(() => 0);
  const raw = sections.map(section => total * Math.max(0, Number(section.questions) || 0) / weightTotal);
  const targets = raw.map(Math.floor);
  let remaining = Math.round(total) - targets.reduce((sum, value) => sum + value, 0);
  const order = raw.map((value, index) => ({ index, remainder: value - Math.floor(value) }))
    .sort((a, b) => b.remainder - a.remainder || a.index - b.index);
  for (let i = 0; i < remaining; i++) targets[order[i % order.length].index]++;
  return targets;
}

function createPaperBlueprint({ exam, kind, mode = 'practice', questions, minutes, startedAt }) {
  const sections = exam.pattern.sections || [];
  const isFullMock = kind === 'full_mock';
  const officialSectionMinutes = isFullMock && mode === 'real' && Number(exam.pattern.audit?.sectionTimingMinutes) > 0
    ? Number(exam.pattern.audit.sectionTimingMinutes) : null;
  let offset = 0;
  const blueprintSections = sections.map((section, index) => {
    const ids = questions.filter(question => question.subject === section.subject).map(question => question.id);
    if (!ids.length) return null;
    const durationSeconds = officialSectionMinutes ? officialSectionMinutes * 60 : null;
    const startsAtOffsetSeconds = durationSeconds === null ? null : offset;
    if (durationSeconds !== null) offset += durationSeconds;
    return {
      id: String(index + 1), index, name: section.subject, subject: section.subject,
      questionIds: ids, questionCount: ids.length,
      marks: Number(section.marks) || 0, negative: Number(section.negative) || 0,
      durationSeconds, startsAtOffsetSeconds,
      endsAtOffsetSeconds: durationSeconds === null ? null : offset
    };
  }).filter(Boolean);
  if (!blueprintSections.length) {
    const grouped = new Map();
    for (const question of questions) {
      if (!grouped.has(question.subject)) grouped.set(question.subject, []);
      grouped.get(question.subject).push(Number(question.id));
    }
    for (const [subject, ids] of grouped) blueprintSections.push({
      id: String(blueprintSections.length + 1), index: blueprintSections.length, name: subject, subject,
      questionIds: ids, questionCount: ids.length, marks: 1, negative: 0,
      durationSeconds: null, startsAtOffsetSeconds: null, endsAtOffsetSeconds: null
    });
  }
  const totalQuestions = questions.length;
  const timed = blueprintSections.some(section => section.durationSeconds !== null);
  return {
    version: 1, examId: exam.id, examName: exam.name, kind, mode,
    questionCount: totalQuestions, durationMinutes: minutes,
    startAt: startedAt, totalMarks: blueprintSections.reduce((sum, section) => sum + section.questionCount * section.marks, 0),
    timedSections: timed,
    timingRule: timed ? 'fixed_sequential_sections' : 'overall_timer',
    sections: blueprintSections
  };
}

function activeSectionIndex(blueprint, elapsedSeconds) {
  const timed = (blueprint?.sections || []).filter(section => Number.isFinite(section.durationSeconds) && section.durationSeconds > 0);
  if (!timed.length) return -1;
  const active = timed.find(section => elapsedSeconds < section.endsAtOffsetSeconds);
  return active ? active.index : timed[timed.length - 1].index;
}

function mergeBlueprintAnswers(blueprint, storedAnswers, incomingAnswers, elapsedSeconds) {
  const stored = storedAnswers || {};
  const incoming = incomingAnswers || {};
  const timed = (blueprint?.sections || []).filter(section => Number.isFinite(section.durationSeconds) && section.durationSeconds > 0);
  if (!timed.length) return { ...stored, ...incoming };
  const pastIds = new Set(timed.filter(section => elapsedSeconds >= section.endsAtOffsetSeconds)
    .flatMap(section => section.questionIds.map(String)));
  const active = timed.find(section => elapsedSeconds < section.endsAtOffsetSeconds);
  const activeIds = new Set((active?.questionIds || []).map(String));
  const result = Object.fromEntries(Object.entries(stored).filter(([id]) => pastIds.has(String(id))));
  for (const [id, value] of Object.entries(stored)) if (activeIds.has(String(id))) result[id] = value;
  for (const [id, value] of Object.entries(incoming)) if (activeIds.has(String(id))) result[id] = value;
  return result;
}

module.exports = { allocateSectionTargets, createPaperBlueprint, activeSectionIndex, mergeBlueprintAnswers };
