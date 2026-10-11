'use strict';

// Host allowlist for source URLs used when an administrator manually imports a
// question as VERIFIED_PYQ. A trusted host is necessary but NOT sufficient:
// the reviewer must still confirm the exact question, year, paper/phase, and
// answer against the linked official document.
const OFFICIAL_SOURCE_HOSTS = Object.freeze({
  UPSC_CSE: ['upsc.gov.in', 'www.upsc.gov.in'],
  UPSC_CSAT: ['upsc.gov.in', 'www.upsc.gov.in'],
  SSC_CGL: ['ssc.gov.in', 'www.ssc.gov.in', 'ssc.nic.in', 'www.ssc.nic.in'],
  RBI_B: ['rbi.org.in', 'www.rbi.org.in', 'm.rbi.org.in', 'opportunities.rbi.org.in']
});

function validateOfficialPyqSource(examId, sourceRef) {
  const hosts = OFFICIAL_SOURCE_HOSTS[examId];
  if (!hosts) {
    return { valid: false, reason: 'No official-source allowlist is configured for this exam. Keep the question as ADMIN_PRACTICE or add an audited official domain first.' };
  }
  let url;
  try { url = new URL(String(sourceRef || '')); }
  catch { return { valid: false, reason: 'VERIFIED_PYQ requires a valid official-source HTTPS URL.' }; }

  const hostname = url.hostname.toLowerCase();
  if (url.protocol !== 'https:' || url.username || url.password || !hosts.includes(hostname)) {
    return {
      valid: false,
      reason: 'VERIFIED_PYQ source must use an official exam-authority host for ' + examId + ': ' + hosts.join(', ') + '. Coaching sites, blogs, social media, and generic file mirrors are not accepted as proof.'
    };
  }
  return {
    valid: true,
    host: hostname,
    requiresManualContentReview: true,
    note: 'Official host accepted; a human reviewer must still verify the exact question, paper/phase, year, and answer in the linked document.'
  };
}

/**
 * A trusted domain is only one part of provenance. This gate also requires
 * an official answer-key/answer source and an explicit human review record.
 * It deliberately does not claim to fetch, parse, or content-verify the links.
 */
function validatePyqVerification({ examId, questionSourceUrl, answerSourceUrl, reviewConfirmed, verificationNotes }) {
  if (reviewConfirmed !== true) {
    return { valid: false, reason: 'Explicit review confirmation is required. Compare exact wording, every option, exam/year/paper/shift, and the official answer before importing.' };
  }
  const questionSource = validateOfficialPyqSource(examId, questionSourceUrl);
  if (!questionSource.valid) return { valid: false, reason: 'Official question-paper source rejected: ' + questionSource.reason };
  const answerSource = validateOfficialPyqSource(examId, answerSourceUrl);
  if (!answerSource.valid) return { valid: false, reason: 'Official answer source rejected: ' + answerSource.reason };
  const notes = String(verificationNotes || '').trim();
  if (notes.length < 20) {
    return { valid: false, reason: 'Add at least 20 characters of reviewer notes describing how the exact question/options and answer were checked.' };
  }
  if (notes.length > 1500) {
    return { valid: false, reason: 'Reviewer notes must be 1500 characters or fewer.' };
  }
  return {
    valid: true,
    questionHost: questionSource.host,
    answerHost: answerSource.host,
    requiresManualContentReview: true,
    note: 'Source domains and review acknowledgement validated; linked document contents are not automatically inspected.'
  };
}

module.exports = { OFFICIAL_SOURCE_HOSTS, validateOfficialPyqSource, validatePyqVerification };
