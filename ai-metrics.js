// In-memory, secret-safe AI health telemetry. Never store or emit API key values.
const startedAt = Date.now();
const totals = { requests: 0, successes: 0, failures: 0, promptTokens: 0, outputTokens: 0, totalTokens: 0, rotations: 0 };
const providers = {};
const recent = [];
function providerBucket(provider) {
  const key = String(provider || 'unknown');
  return providers[key] ||= { requests: 0, successes: 0, failures: 0, promptTokens: 0, outputTokens: 0, totalTokens: 0, errors: {} };
}
function record(event) {
  const e = { at: new Date().toISOString(), provider: String(event.provider || 'unknown'), model: String(event.model || 'unknown'), ...event };
  delete e.apiKey;
  delete e.key;
  const p = providerBucket(e.provider);
  if (e.type === 'request') { totals.requests++; p.requests++; }
  if (e.type === 'success') { totals.successes++; p.successes++; }
  if (e.type === 'error') {
    totals.failures++; p.failures++;
    const code = String(e.error || 'UNKNOWN').slice(0, 40);
    p.errors[code] = (p.errors[code] || 0) + 1;
  }
  if (e.type === 'rotation') totals.rotations++;
  for (const k of ['promptTokens', 'outputTokens', 'totalTokens']) {
    const n = Math.max(0, Number(e[k]) || 0);
    totals[k] += n; p[k] += n;
  }
  recent.unshift(e);
  if (recent.length > 100) recent.length = 100;
}
function snapshot() {
  const keys = [process.env.GEMINI_API_KEY, process.env.GEMINI_API_KEY_2, process.env.GEMINI_API_KEY_3];
  const configured = keys.map((v, i) => ({ slot: i + 1, configured: typeof v === 'string' && !!v.trim() }));
  return {
    startedAt: new Date(startedAt).toISOString(),
    uptimeSeconds: Math.floor((Date.now() - startedAt) / 1000),
    totals: { ...totals },
    providers: JSON.parse(JSON.stringify(providers)),
    geminiKeys: configured,
    recent: recent.map(e => ({ ...e }))
  };
}
module.exports = { record, snapshot };
