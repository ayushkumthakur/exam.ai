'use strict';

// Canonicalize question stems so duplicate detection works across punctuation,
// whitespace, Unicode scripts and compatibility characters. Include combining
// marks: many Indic letters are represented by a base letter plus a mark.
function normalizeQuestionStem(value) {
  return String(value || '').normalize('NFKC').toLowerCase()
    .replace(/[^\p{L}\p{M}\p{N}]+/gu, ' ')
    .trim()
    .replace(/\s+/g, ' ');
}

module.exports = { normalizeQuestionStem };
