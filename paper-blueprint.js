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

// These are internal practice-calibration targets, not official published exam quotas.
function difficultyProfileForExam(examId) {
  if (examId === 'UPSC_CSE' || examId === 'UPSC_CSAT') {
    return { easy: 0.20, medium: 0.50, hard: 0.30, label: 'UPSC-style conceptual balance (practice estimate)' };
  }
  if (examId === 'SSC_CGL') {
    return { easy: 0.35, medium: 0.45, hard: 0.20, label: 'SSC-style speed-and-accuracy balance (practice estimate)' };
  }
  if (examId === 'RBI_B') {
    return { easy: 0.20, medium: 0.50, hard: 0.30, label: 'RBI-style applied and analytical balance (practice estimate)' };
  }
  return { easy: 0.30, medium: 0.45, hard: 0.25, label: 'General competitive-exam balance (practice estimate)' };
}
function difficultyTargets(total, profile) {
  const keys = ['easy','medium','hard'];
  const raw = keys.map(key => Math.max(0, Number(profile[key]) || 0) * total);
  const targets = raw.map(Math.floor);
  let left = Math.max(0, Math.round(total) - targets.reduce((sum, n) => sum + n, 0));
  const order = raw.map((value,index)=>({index,remainder:value-Math.floor(value)}))
    .sort((a,b)=>b.remainder-a.remainder || a.index-b.index);
  for (let i=0;i<left;i++) targets[order[i % order.length].index]++;
  return Object.fromEntries(keys.map((key,index)=>[key,targets[index]]));
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
  const difficultyDistribution = questions.reduce((counts, question) => {
    const key = ['easy', 'medium', 'hard'].includes(String(question.difficulty || '').toLowerCase())
      ? String(question.difficulty).toLowerCase() : 'unclassified';
    counts[key] = (counts[key] || 0) + 1;
    return counts;
  }, { easy: 0, medium: 0, hard: 0, unclassified: 0 });
  // Provenance is independent from structural realism: a correctly-shaped mock can
  // still be made from practice/AI items. Count a PYQ only with complete item-level
  // source and reviewer metadata; legacy rows with a PYQ label but missing proof
  // are reported separately instead of being trusted.
  const sourceCounts = { verified_pyq: 0, admin_practice: 0, pyq_pattern: 0, ai_generated: 0, legacy_unverified: 0, other: 0 };
  const verifiedItems = [];
  for (const question of questions) {
    const source = String(question.source_type || '').toUpperCase();
    const completeEvidence = source === 'VERIFIED_PYQ' &&
      !!question.source_ref && !!question.answer_source_ref &&
      String(question.verification_notes || '').trim().length >= 20 &&
      !!String(question.verified_by || '').trim() && !!question.verified_at &&
      question.pyq_year !== null && question.pyq_year !== undefined &&
      Number.isInteger(Number(question.pyq_year)) && Number(question.pyq_year) >= 2000 &&
      !!String(question.pyq_paper || '').trim();
    if (completeEvidence) {
      sourceCounts.verified_pyq++;
      verifiedItems.push(question);
    } else if (source === 'VERIFIED_PYQ') sourceCounts.legacy_unverified++;
    else if (source === 'ADMIN_PRACTICE') sourceCounts.admin_practice++;
    else if (source === 'PYQ_PATTERN') sourceCounts.pyq_pattern++;
    else if (source === 'AI_GENERATED') sourceCounts.ai_generated++;
    else sourceCounts.other++;
  }
  const paperKeys = new Set(verifiedItems.map(question =>
    [question.pyq_year, question.pyq_paper, question.pyq_shift || ''].join('|')));
  const questionProvenanceStatus = verifiedItems.length === totalQuestions && totalQuestions > 0 && paperKeys.size === 1
    ? 'verified_pyq_set_same_paper'
    : verifiedItems.length > 0
      ? 'mixed_or_incomplete_provenance'
      : 'practice_or_ai_questions_not_official_paper';
  const patternAudit = exam.pattern.audit || {};
  const difficultyProfile = difficultyProfileForExam(exam.id);
  const patternIntegrity = blueprintSections.every(section => {
    const source = sections.find(item => item.subject === section.subject);
    return Boolean(source) && section.questionCount === source.questions &&
      section.marks === Number(source.marks) && section.negative === Number(source.negative);
  }) && blueprintSections.reduce((sum, section) => sum + section.questionCount, 0) === totalQuestions;
  const realism = {
    patternStatus: patternAudit.status || (exam.verified ? 'admin_verified' : 'unverified'),
    patternCheckedAt: patternAudit.checkedAt || null,
    sourceName: patternAudit.sourceName || null,
    sourceUrl: patternAudit.sourceUrl || null,
    verifiedFields: Array.isArray(patternAudit.verifiedFields) ? patternAudit.verifiedFields : [],
    approximateFields: Array.isArray(patternAudit.approximateFields) ? patternAudit.approximateFields : [],
    limitations: Array.isArray(patternAudit.runtimeLimitations) ? patternAudit.runtimeLimitations : [],
    patternIntegrity,
    sourceCounts,
    questionProvenanceStatus,
    difficultyDistribution,
    difficultyProfile: { ...difficultyProfile, targets: difficultyTargets(totalQuestions, difficultyProfile) },
    difficultyPolicy: 'Estimated internal practice mix, not an official quota. Actual distribution reflects the available question bank and is reported above.'
  };
  return {
    version: 2, examId: exam.id, examName: exam.name, kind, mode,
    questionCount: totalQuestions, durationMinutes: minutes,
    startAt: startedAt, totalMarks: blueprintSections.reduce((sum, section) => sum + section.questionCount * section.marks, 0),
    timedSections: timed,
    timingRule: timed ? 'fixed_sequential_sections' : 'overall_timer',
    realism,
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

module.exports = { allocateSectionTargets, createPaperBlueprint, activeSectionIndex, mergeBlueprintAnswers, difficultyProfileForExam, difficultyTargets };
