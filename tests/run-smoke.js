// Run the smoke suite against an isolated local server/database.
// Usage: node tests/run-smoke.js
const { spawn, spawnSync } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const port = Number(process.env.SMOKE_PORT || 3111);
const base = `http://127.0.0.1:${port}`;
const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'competitive-exam-ai-test-'));
const server = spawn(process.execPath, ['server.js'], {
  cwd: root,
  env: {
    ...process.env,
    NODE_ENV: 'test',
    PORT: String(port),
    DATA_DIR: dataDir,
    APP_SECRET: 'isolated-smoke-test-secret',
    ADMIN_EMAILS: 'admin@x.com',
    BOOTSTRAP_ADMIN_EMAIL: '',
    BOOTSTRAP_ADMIN_PASSWORD: ''
  },
  stdio: 'ignore'
});

let exited = false;
server.on('exit', () => { exited = true; });

async function waitForServer(timeoutMs = 15000) {
  const deadline = Date.now() + timeoutMs;
  let lastError;
  while (Date.now() < deadline) {
    if (exited) throw new Error('Test server exited before becoming ready.');
    try {
      const response = await fetch(base + '/api/config');
      if (response.ok) return;
      lastError = new Error(`Readiness endpoint returned HTTP ${response.status}`);
    } catch (error) {
      lastError = error;
    }
    await new Promise(resolve => setTimeout(resolve, 250));
  }
  throw new Error(`Test server did not become ready: ${lastError?.message || 'timeout'}`);
}

(async () => {
  let exitCode = 1;
  try {
    await waitForServer();
    const result = spawnSync(process.execPath, ['tests/smoke.js'], {
      cwd: root,
      env: { ...process.env, BASE: base },
      stdio: 'inherit'
    });
    if (result.error) throw result.error;
    exitCode = result.status ?? 1;
  } catch (error) {
    console.error('SMOKE TEST SETUP FAILED:', error.message);
  } finally {
    server.kill('SIGTERM');
    await new Promise(resolve => {
      if (server.exitCode !== null || server.signalCode !== null) return resolve();
      const timer = setTimeout(resolve, 1500);
      server.once('exit', () => { clearTimeout(timer); resolve(); });
    });
    fs.rmSync(dataDir, { recursive: true, force: true });
  }
  process.exitCode = exitCode;
})();
