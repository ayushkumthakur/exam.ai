'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const read = file => fs.readFileSync(path.join(__dirname, '..', file), 'utf8');
const html = read('public/index.html');
const mobile = read('public/mobile-reference.css');
const desktop = read('public/full-site-premium.css');
const base = read('public/style.css');

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
console.log('PASS responsive UI regression audit: viewport, mobile breakpoints, Mock Test Arena wrapping, safe-area spacing, desktop styling.');
