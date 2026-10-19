'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const read = file => fs.readFileSync(path.join(__dirname, '..', file), 'utf8');
const html = read('public/index.html');
const mobile = read('public/mobile-reference.css');
const desktop = read('public/full-site-premium.css');
const base = read('public/style.css');
const mockTest = read('public/mock-test-responsive.css');

assert.match(html, /name="viewport"[^>]*width=device-width[^>]*viewport-fit=cover/i);
assert.match(html, /mobile-reference\.css\?v=\d+/);
assert.match(html, /full-site-premium\.css\?v=\d+/);

assert.match(mobile, /@media\s*\(max-width:\s*820px\)/);
assert.match(mobile, /@media\s*\(max-width:\s*520px\)/);
assert.match(mobile, /\.mock-brand-hero/);
assert.match(mobile, /\.mock-hero-copy h1/);
assert.match(mobile, /flex-wrap:\s*wrap/);
assert.match(mobile, /min-height:\s*44px/);
assert.match(mobile, /env\(safe-area-inset-bottom\)/);

assert.match(desktop, /@media\s*\(min-width:\s*821px\)/);
assert.match(desktop, /\.dashboard-hero/);
assert.match(base, /\.shell\s*\{/);
assert.match(html, /mock-test-responsive\.css\?v=\d+/);
assert.match(mockTest, /\.test-sticky-header/);
assert.match(mockTest, /\.test-palette-summary/);
assert.match(mockTest, /\.pal\s*\{[\s\S]*grid-template-columns/);
assert.match(mockTest, /@media\s*\(max-width:\s*820px\)/);
assert.match(mockTest, /@media\s*\(max-width:\s*520px\)/);
assert.match(mockTest, /@media\s*\(min-width:\s*821px\)/);
assert.match(mockTest, /min-height:\s*44px/);
const profileUi = read('public/app2.js');
assert.match(profileUi, /Account security/);
assert.match(profileUi, /\/api\/auth\/set-password/);
assert.match(profileUi, /This device remains signed in/);
assert.match(profileUi, /other device sessions are signed out/);
console.log('PASS account-security profile UI and authenticated password-change path audit.');

const app = read('public/app.js');
const styles = read('public/style.css');
assert.match(app, /Vocabulary Lab/);
assert.match(app, /vocabulary: pgVocabulary/);
assert.match(app, /const VOCAB_WORDS = \[/);
assert.match(app, /Misogynist/);
assert.match(app, /Misanthrope/);
assert.match(app, /hindi:/);
assert.match(app, /synonyms:/);
assert.match(app, /antonyms:/);
assert.match(app, /Memory trick/);
assert.match(app, /Start quiz/);
assert.match(styles, /\.vocab-layout/);
assert.match(styles, /\.vocab-options/);
assert.match(styles, /@media\(max-width:760px\)/);
console.log('PASS responsive + Vocabulary Lab regression audit: viewport, mobile breakpoints, Mock Test Arena wrapping, safe-area spacing, mock timer/header wrapping, responsive question palette, desktop styling.');

assert.match(app, /upsc-mock-hero/);
assert.match(app, /upsc-paper-card/);
assert.match(app, /upsc-paper-gs/);
assert.match(app, /upsc-paper-csat/);
assert.match(app, /Start Paper I Practice/);
assert.match(app, /Start CSAT Practice/);
assert.doesNotMatch(app, /Explore Paper I/);
assert.doesNotMatch(app, /Explore CSAT/);

assert.match(styles, /\.upsc-mock-grid\s*\{[\s\S]*grid-template-columns:\s*repeat\(2,minmax\(0,1fr\)\)/);
assert.match(styles, /upsc-mock-grid[\s\S]*grid-template-columns:minmax\(0,1fr\)/);
assert.match(styles, /\.upsc-paper-card:focus-visible/);
assert.match(app, /class: 'card stack mock-builder'/);
assert.match(styles, /\.mock-builder\s*\{/);
assert.match(styles, /\.mock-builder \.blueprint-mode-picker/);
assert.match(styles, /@media\(max-width:420px\)/);

console.log('PASS UPSC mock picker premium cards + responsive mobile layout audit.');
