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
const adminEmail = 'admin@x.com';
const adminPassword = 'AdminTest@12345';
const baseEnv = {
  ...process.env,
  NODE_ENV: 'test',
  PORT: String(port),
  DATA_DIR: dataDir,
  APP_SECRET: 'isolated-smoke-test-secret',
  ADMIN_EMAILS: '',
  BOOTSTRAP_ADMIN_EMAIL: '',
  BOOTSTRAP_ADMIN_PASSWORD: ''
};

let server;
let exited = false;
function startServer(extraEnv = {}) {
  exited = false;
  server = spawn(process.execPath, ['server.js'], {
    cwd: root,
    env: { ...baseEnv, ...extraEnv },
    stdio: 'ignore'
  });
  server.on('exit', () => { exited = true; });
}

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

async function stopServer() {
  if (!server || server.exitCode !== null || server.signalCode !== null) return;
  server.kill('SIGTERM');
  await new Promise(resolve => {
    const timer = setTimeout(resolve, 1500);
    server.once('exit', () => { clearTimeout(timer); resolve(); });
  });
}

(async () => {
  let exitCode = 1;
  try {
    // Public signup must always create a student. Provision the admin fixture
    // directly in this disposable test database, never through startup environment
    // variables that could accidentally promote/reset a production account.
    startServer();
    await waitForServer();
    const signup = await fetch(base + '/api/auth/signup', {
      method: 'POST',
      headers: { 'content-type': 'application/json', origin: base },
      body: JSON.stringify({ email: adminEmail, password: adminPassword, confirm_password: adminPassword })
    });
    const signupData = await signup.json().catch(() => ({}));
    if (signup.status !== 200 || signupData.user?.role !== 'student') {
      throw new Error(`Admin fixture signup failed safely: HTTP ${signup.status}`);
    }
    await stopServer();

    const promote = spawnSync(process.execPath, ['-e',
      "const db=require('./db'); const r=db.prepare(\"UPDATE users SET role='admin' WHERE email=?\").run('admin@x.com'); if (!r.changes) process.exit(1);"
    ], { cwd: root, env: baseEnv, encoding: 'utf8' });
    if (promote.error || promote.status !== 0) {
      throw new Error('Could not provision the isolated admin test fixture.');
    }

    startServer();
    await waitForServer();

    const result = spawnSync(process.execPath, ['tests/smoke.js'], {
      cwd: root,
      env: { ...process.env, BASE: base, SMOKE_ADMIN_PASSWORD: adminPassword },
      stdio: 'inherit'
    });
    if (result.error) throw result.error;
    exitCode = result.status ?? 1;
  } catch (error) {
    console.error('SMOKE TEST SETUP FAILED:', error.message);
  } finally {
    await stopServer();
    fs.rmSync(dataDir, { recursive: true, force: true });
  }
  process.exitCode = exitCode;
})();
