const assert = require('node:assert/strict');

// Cloudflare Workers AI provider tests use mocked fetch; no live credentials/network.
process.env.AI_PROVIDER = 'cloudflare';
process.env.CLOUDFLARE_ACCOUNT_ID = 'test-account-id';
process.env.CLOUDFLARE_API_TOKEN = 'test-cloudflare-token';
process.env.CLOUDFLARE_MODEL = '@cf/meta/llama-3.1-8b-instruct';
delete process.env.GEMINI_API_KEY;
delete process.env.GEMINI_API_KEY_2;
delete process.env.GEMINI_API_KEY_3;
delete process.env.GROQ_API_KEY;
delete process.env.GROQ_API_KEY_2;
delete process.env.ANTHROPIC_API_KEY;

const calls = [];
global.fetch = async (url, options = {}) => {
  calls.push({ url: String(url), options });
  return { ok: true, status: 200, json: async () => ({ success: true, result: { response: 'Cloudflare test response' } }) };
};

(async () => {
  const ai = require('../ai');
  assert.equal(ai.aiEnabled(), true);
  assert.equal(ai.aiProvider(), 'cloudflare');
  const result = await ai.callClaude({ system: 'You are a tutor', messages: [{ role: 'user', content: 'Explain fractions' }] });
  assert.equal(result.ok, true);
  assert.equal(result.provider, 'cloudflare');
  assert.equal(result.text, 'Cloudflare test response');
  assert.equal(calls.length, 1);
  assert.ok(calls[0].url.includes('/accounts/test-account-id/ai/run/@cf/meta/llama-3.1-8b-instruct'));
  assert.equal(calls[0].options.headers.authorization, 'Bearer test-cloudflare-token');
  const payload = JSON.parse(calls[0].options.body);
  assert.ok(payload.prompt.includes('You are a tutor'));
  assert.ok(payload.prompt.includes('Explain fractions'));

  calls.length = 0;
  const grounded = await ai.callClaude({ grounded: true, system: 'Search current sources', messages: [{ role: 'user', content: 'Latest news' }] });
  assert.equal(grounded.ok, false);
  assert.equal(grounded.error, 'AI_UNSUPPORTED_CONTENT');
  assert.equal(calls.length, 0);

  const image = await ai.callClaude({ system: 'Read image', messages: [{ role: 'user', content: [{ type: 'image', source: { type: 'base64', data: 'abc', media_type: 'image/png' } }] }] });
  assert.equal(image.ok, false);
  assert.equal(image.error, 'AI_UNSUPPORTED_CONTENT');
  assert.equal(calls.length, 0);
  console.log('PASS Cloudflare Workers AI provider configuration, request and content guardrails');
})().catch(error => { console.error(error); process.exit(1); });
