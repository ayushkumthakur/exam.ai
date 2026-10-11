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

module.exports = { OFFICIAL_SOURCE_HOSTS, validateOfficialPyqSource };
