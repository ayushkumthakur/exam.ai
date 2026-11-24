'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { buildTutorMessages } = require('../ai');

const history = Array.from({ length: 10 }, (_, i) => ({
  role: i % 2 ? 'assistant' : 'user',
  content: String(i).repeat(2000)
}));
const messages = buildTutorMessages(history, 'current question');
assert.equal(messages.length, 7, 'keep the six most recent history messages plus the current question');
assert.equal(messages[0].content, '4'.repeat(1400), 'retain the six most recent bounded messages, in order');
assert.equal(messages[5].content, '9'.repeat(1400));
assert.equal(messages[6].content, 'current question');

const app = fs.readFileSync(path.join(__dirname, '..', 'public', 'app.js'), 'utf8');
assert.match(app, /editVersion: 0/);
assert.match(app, /let saveInFlight = null/);
assert.match(app, /if \(saveInFlight\) return saveInFlight/);
assert.match(app, /st\.editVersion === version/);
assert.match(app, /if \(saved && st\.dirty && st\.editVersion !== version/);
assert.match(app, /st\.editVersion\+\+/);

const app2 = fs.readFileSync(path.join(__dirname, '..', 'public', 'app2.js'), 'utf8');
assert.match(app2, /let lastId = null, asking = false/);
assert.match(app2, /if \(asking\) return/);
assert.match(app2, /finally \{ asking = false; sendBtn\.disabled = false; \}/);

const server = fs.readFileSync(path.join(__dirname, '..', 'server.js'), 'utf8');
assert.match(server, /ai_conversations WHERE user_id=\? AND exam_id=\? ORDER BY id DESC LIMIT 6/);
assert.match(server, /messages, maxTokens: 1600/);
console.log('PASS mock autosave revision safety, AI tutor single-flight, and bounded context checks.');
