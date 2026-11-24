'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const app = fs.readFileSync(path.join(__dirname, '..', 'public', 'app.js'), 'utf8');

// GET requests have a bounded wait; mutating requests are deliberately not aborted
// because the server may have committed a write before a client-side timeout.
assert.match(app, /method === 'GET' && typeof AbortController !== 'undefined'/);
assert.match(app, /setTimeout\(\(\) => controller\.abort\(\), 20000\)/);
assert.match(app, /This request took too long/);
assert.match(app, /retry: true, timeout: true/);

// Only the newest async page load may update a still-mounted container.
assert.match(app, /const loadVersions = new WeakMap\(\)/);
assert.match(app, /loadVersions\.get\(box\) !== version \|\| !box\.isConnected/);
console.log('PASS bounded GET loading and stale-render protection.');
