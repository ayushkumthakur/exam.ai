'use strict';
const assert = require('node:assert/strict');
const { xmlText, xmlField, isEnglishText } = require('../current-affairs-feed');

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
console.log('PASS official current-affairs RSS XML parser and English-language filter');
