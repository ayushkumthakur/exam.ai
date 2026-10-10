const assert = require('node:assert/strict');

// Exercise provider failover without real API keys or network access.
process.env.AI_PROVIDER = 'gemini';
process.env.GEMINI_API_KEY = 'test-gemini-key';
process.env.ANTHROPIC_API_KEY = 'test-anthropic-key';
process.env.GEMINI_MODEL = 'gemini-test-model';
process.env.ANTHROPIC_MODEL = 'claude-test-model';

const calls = [];
global.fetch = async (url, options = {}) => {
  calls.push({ url: String(url), headers: options.headers || {} });
  if (String(url).includes('generativelanguage.googleapis.com')) {
    return { ok: false, status: 503 };
  }
  if (String(url).includes('api.anthropic.com')) {
    return {
      ok: true,
      status: 200,
      json: async () => ({ content: [{ type: 'text', text: 'backup response' }] })
    };
  }
  throw new Error('Unexpected mocked URL');
};

(async () => {
  const { callClaude } = require('../ai');
  const result = await callClaude({ system: 'test', messages: [{ role: 'user', content: 'hello' }] });
  assert.equal(result.ok, true, 'backup provider should succeed');
  assert.equal(result.provider, 'anthropic', 'backup provider should be returned');
  assert.equal(result.fallback_used, true, 'successful backup should be marked');
  assert.equal(calls.length, 2, 'both providers should be called');
  assert.ok(calls[1].url.includes('api.anthropic.com'), 'second request should use Anthropic');
  assert.equal(calls[1].headers['x-api-key'], 'test-anthropic-key', 'backup key stays in server-side request');
  // Reverse direction: Anthropic is primary, and Gemini should recover from a transient error.
  process.env.AI_PROVIDER = 'anthropic';
  calls.length = 0;
  global.fetch = async (url, options = {}) => {
    calls.push({ url: String(url), headers: options.headers || {} });
    if (String(url).includes('api.anthropic.com')) return { ok: false, status: 529 };
    if (String(url).includes('generativelanguage.googleapis.com')) {
      return { ok: true, status: 200, json: async () => ({
        candidates: [{ content: { parts: [{ text: 'gemini backup response' }] } }],
        usageMetadata: { promptTokenCount: 3, candidatesTokenCount: 4, totalTokenCount: 7 }
      }) };
    }
    throw new Error('Unexpected mocked URL');
  };
  const reverse = await callClaude({ system: 'test', messages: [{ role: 'user', content: 'hello' }] });
  assert.equal(reverse.ok, true, 'Gemini backup should recover from Anthropic transient error');
  assert.equal(reverse.provider, 'gemini', 'reverse fallback provider should be Gemini');
  assert.equal(reverse.fallback_used, true, 'reverse fallback should be marked');
  assert.equal(calls.length, 2, 'reverse fallback should call both providers');

  // Invalid request errors should not silently switch providers.
  process.env.AI_PROVIDER = 'gemini';
  calls.length = 0;
  global.fetch = async (url, options = {}) => {
    calls.push({ url: String(url), headers: options.headers || {} });
    return { ok: false, status: 400 };
  };
  const invalid = await callClaude({ system: 'test', messages: [{ role: 'user', content: 'hello' }] });
  assert.equal(invalid.ok, false, 'invalid request should fail');
  assert.equal(invalid.error, 'AI_HTTP_400', 'invalid request error should remain visible');
  assert.equal(calls.length, 1, 'invalid request should not trigger provider fallback');
  console.log('PASS AI primary-to-backup provider fallback');
})().catch(err => { console.error(err); process.exit(1); });
