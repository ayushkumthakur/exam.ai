'use strict';
const assert = require('node:assert/strict');
const { xmlText, xmlField, feedEntries, feedLink, feedDate, feedSummary, isEnglishText } = require('../current-affairs-feed');

const rssItem = `<item>
  <title>RBI announces policy &amp; framework</title>
  <link>https://www.rbi.org.in/example</link>
  <description><![CDATA[<p>Policy details &amp; key rates.</p>]]></description>
  <pubDate>Sun, 11 Oct 2026 06:00:00 GMT</pubDate>
</item>`;
assert.equal(xmlField(rssItem, 'title'), 'RBI announces policy & framework');
assert.equal(xmlField(rssItem, 'link'), 'https://www.rbi.org.in/example');
assert.equal(xmlField(rssItem, 'description'), 'Policy details & key rates.');
assert.equal(xmlField('<entry><title type="text">PIB update</title></entry>', 'title'), 'PIB update');
assert.equal(xmlField(rssItem, 'missing'), '');
assert.equal(xmlText('A &lt; B &amp; C'), 'A < B & C');
assert.equal(isEnglishText('RBI announces monetary policy'), true);
assert.equal(isEnglishText('भारतीय रिज़र्व बैंक'), false);
assert.equal(isEnglishText('RBI announces policy — भारतीय रिज़र्व बैंक'), false);
assert.equal(isEnglishText('پاکستان کے دفاعی امور'), false);
assert.equal(isEnglishText('RBI policy — پاکستان کے دفاعی امور'), false);

const atom = `<feed xmlns="http://www.w3.org/2005/Atom"><entry>
  <title>PIB update</title>
  <link rel="alternate" type="text/html" href="https://pib.gov.in/example?id=7" />
  <summary type="html">&lt;p&gt;Official summary&lt;/p&gt;</summary>
  <updated>2026-10-21T12:00:00Z</updated>
</entry></feed>`;
const atomEntry = feedEntries(atom)[0];
assert.ok(atomEntry, 'Atom entry is extracted');
assert.equal(xmlField(atomEntry, 'title'), 'PIB update');
assert.equal(feedLink(atomEntry), 'https://pib.gov.in/example?id=7');
assert.equal(feedDate(atomEntry), '2026-10-21T12:00:00Z');
assert.equal(feedSummary(atomEntry), 'Official summary');
assert.equal(feedEntries('<rss><channel><item><title>A</title></item><item><title>B</title></item></channel></rss>').length, 2);

console.log('PASS official current-affairs RSS XML parser and English-language filter');
