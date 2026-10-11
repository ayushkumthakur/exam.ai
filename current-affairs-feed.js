'use strict';

// Small, dependency-free XML helpers for official public RSS feeds.
function xmlText(value) {
  return String(value || '').replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/<[^>]*>/g, ' ').replace(/&nbsp;|&#160;/gi, ' ')
    .replace(/&amp;/gi, '&').replace(/&quot;/gi, '"').replace(/&#39;|&apos;/gi, "'")
    .replace(/&lt;/gi, '<').replace(/&gt;/gi, '>')
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Math.min(0x10ffff, +n)))
    .replace(/\s+/g, ' ').trim();
}
function xmlField(block, tag) {
  const safeTag = String(tag || '').replace(/[^a-z0-9:_-]/gi, '');
  const m = String(block || '').match(new RegExp('<' + safeTag + '(?:\\s[^>]*)?>([\\s\\S]*?)<\\/' + safeTag + '>', 'i'));
  return m ? xmlText(m[1]) : '';
}
function isEnglishText(value) {
  // Keep Devanagari-language items out of the English current-affairs feed.
  return !/[\\u0900-\\u097F]/u.test(String(value || ''));
}
module.exports = { xmlText, xmlField, isEnglishText };
