'use strict';

const { validatePyqVerification } = require('./pyq-source-policy');

// SQL-side gate used by every verified-paper query. Keep this aligned with
// validatePyqVerification: legacy/hand-edited rows must not become verified just
// because a source_type flag was set. LIKE patterns require the slash immediately
// after the exact approved host, so lookalike hosts such as upsc.gov.in.evil fail.
const VERIFIED_PYQ_WHERE = `source_type='VERIFIED_PYQ'
  AND pyq_year IS NOT NULL
  AND CAST(pyq_year AS INTEGER) BETWEEN 2000 AND CAST(strftime('%Y','now') AS INTEGER) + 1
  AND pyq_paper IS NOT NULL AND length(trim(pyq_paper)) > 0
  AND source_ref IS NOT NULL AND length(trim(source_ref)) > 0
  AND answer_source_ref IS NOT NULL AND length(trim(answer_source_ref)) > 0
  AND verification_notes IS NOT NULL AND length(trim(verification_notes)) BETWEEN 20 AND 1500
  AND verified_by IS NOT NULL AND length(trim(verified_by)) > 0
  AND verified_at IS NOT NULL AND CAST(verified_at AS INTEGER) > 0
  AND (
    (exam_id IN ('UPSC_CSE','UPSC_CSAT')
      AND (source_ref LIKE 'https://upsc.gov.in/%' OR source_ref LIKE 'https://www.upsc.gov.in/%')
      AND (answer_source_ref LIKE 'https://upsc.gov.in/%' OR answer_source_ref LIKE 'https://www.upsc.gov.in/%'))
    OR (exam_id='SSC_CGL'
      AND (source_ref LIKE 'https://ssc.gov.in/%' OR source_ref LIKE 'https://www.ssc.gov.in/%' OR source_ref LIKE 'https://ssc.nic.in/%' OR source_ref LIKE 'https://www.ssc.nic.in/%')
      AND (answer_source_ref LIKE 'https://ssc.gov.in/%' OR answer_source_ref LIKE 'https://www.ssc.gov.in/%' OR answer_source_ref LIKE 'https://ssc.nic.in/%' OR answer_source_ref LIKE 'https://www.ssc.nic.in/%'))
    OR (exam_id='RBI_B'
      AND (source_ref LIKE 'https://rbi.org.in/%' OR source_ref LIKE 'https://www.rbi.org.in/%' OR source_ref LIKE 'https://m.rbi.org.in/%' OR source_ref LIKE 'https://opportunities.rbi.org.in/%')
      AND (answer_source_ref LIKE 'https://rbi.org.in/%' OR answer_source_ref LIKE 'https://www.rbi.org.in/%' OR answer_source_ref LIKE 'https://m.rbi.org.in/%' OR answer_source_ref LIKE 'https://opportunities.rbi.org.in/%'))
  )`;

function isVerifiedPyq(record) {
  if (!record || record.source_type !== 'VERIFIED_PYQ') return false;
  const year = Number(record.pyq_year);
  if (!Number.isInteger(year) || year < 2000 || year > new Date().getFullYear() + 1) return false;
  if (!String(record.pyq_paper || '').trim()) return false;
  if (!String(record.verified_by || '').trim() || !(Number(record.verified_at) > 0)) return false;
  const result = validatePyqVerification({
    examId: record.exam_id,
    questionSourceUrl: record.source_ref,
    answerSourceUrl: record.answer_source_ref,
    reviewConfirmed: true,
    verificationNotes: record.verification_notes
  });
  return result.valid;
}

module.exports = { VERIFIED_PYQ_WHERE, isVerifiedPyq };
