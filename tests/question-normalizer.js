'use strict';
const assert = require('node:assert/strict');
const { normalizeQuestionStem } = require('../question-normalizer');

assert.equal(normalizeQuestionStem('  RBI—Policy / Update!  '), 'rbi policy update');
assert.equal(normalizeQuestionStem('Question 01:  Rate   of Interest?'), 'question 01 rate of interest');
assert.equal(normalizeQuestionStem('दिल्ली—भारत 2026'), 'दिल्ली भारत 2026');
assert.equal(normalizeQuestionStem('Ｆｕｌｌ Ｗｉｄｔｈ'), 'full width');
assert.equal(normalizeQuestionStem(null), '');
assert.equal(normalizeQuestionStem('!!!'), '');
assert.equal(
  normalizeQuestionStem('RBI — Repo rate changed'),
  normalizeQuestionStem('RBI: repo rate changed!'),
  'equivalent stems should normalize to the same key'
);

console.log('PASS Unicode-safe question stem normalization and duplicate matching');
