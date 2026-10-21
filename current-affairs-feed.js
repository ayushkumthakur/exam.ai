'use strict';

// Small, dependency-free XML helpers for official public RSS and Atom feeds.
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
function feedEntries(xml) {
  return [...String(xml || '').matchAll(/<(item|entry)\b[^>]*>([\s\S]*?)<\/\1\s*>/gi)].map(m => m[2]);
}
function tagAttributes(tag) {
  const attrs = {};
  for (const match of String(tag || '').matchAll(/([a-z_:][a-z0-9_:.-]*)\s*=\s*(["'])(.*?)\2/gi)) {
    attrs[match[1].toLowerCase()] = xmlText(match[3]);
  }
  return attrs;
}
function feedLink(block) {
  const direct = xmlField(block, 'link');
  if (/^https?:\/\//i.test(direct)) return direct;
  const links = [...String(block || '').matchAll(/<(?:[a-z0-9_-]+:)?link\b[^>]*\/?\s*>/gi)].map(m => ({ tag: m[0], attrs: tagAttributes(m[0]) }));
  const picked = links.find(x => /^https?:\/\//i.test(x.attrs.href || '') && (!x.attrs.rel || x.attrs.rel === 'alternate'))
    || links.find(x => /^https?:\/\//i.test(x.attrs.href || ''));
  if (picked) return picked.attrs.href;
  const guid = xmlField(block, 'guid');
  return /^https?:\/\//i.test(guid) ? guid : '';
}
function feedDate(block) {
  return xmlField(block, 'pubDate') || xmlField(block, 'published') ||
    xmlField(block, 'updated') || xmlField(block, 'dc:date') || xmlField(block, 'date');
}
function feedSummary(block) {
  const value = xmlField(block, 'description') || xmlField(block, 'summary') ||
    xmlField(block, 'content:encoded') || xmlField(block, 'content');
  return xmlText(value);
}
function isEnglishText(value) {
  // Keep Devanagari-language items out of the English current-affairs feed.
  return !/[\u0900-\u097F\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF]/u.test(String(value || ''));
}
module.exports = { xmlText, xmlField, feedEntries, feedLink, feedDate, feedSummary, isEnglishText };
