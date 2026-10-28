'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { DatabaseSync } = require('node:sqlite');
const backupApi = require('../db-backup');

(async () => {
  const oldEnv = {};
  const vars = [
    'BACKUP_S3_BUCKET', 'BACKUP_S3_ACCESS_KEY_ID', 'BACKUP_S3_SECRET_ACCESS_KEY',
    'BACKUP_S3_ENDPOINT', 'BACKUP_S3_REGION', 'BACKUP_S3_PREFIX', 'NODE_ENV'
  ];
  for (const key of vars) oldEnv[key] = process.env[key];
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'cea-s3-backup-test-'));
  const dataDir = path.join(root, 'data');
  fs.mkdirSync(dataDir, { recursive: true, mode: 0o700 });
  let source;
  try {
    process.env.NODE_ENV = 'test';
    for (const key of vars) delete process.env[key];

    let r = backupApi.resolveS3Config(process.env);
    assert.equal(r.config, null);
    assert.equal(r.error, null, 'S3 storage stays optional unless configuration is present');

    r = backupApi.resolveS3Config({
      NODE_ENV: 'test',
      BACKUP_S3_BUCKET: 'test-bucket',
      BACKUP_S3_ACCESS_KEY_ID: 'test-access',
      BACKUP_S3_SECRET_ACCESS_KEY: 'test-secret',
      BACKUP_S3_ENDPOINT: 'http://127.0.0.1:9000',
      BACKUP_S3_PREFIX: '../private///backups'
    });
    assert.equal(r.error, null);
    assert.equal(r.config.prefix, 'private/backups', 'object prefix is normalized');
    assert.equal(r.config.endpoint, 'http://127.0.0.1:9000/');

    r = backupApi.resolveS3Config({
      NODE_ENV: 'test',
      BACKUP_S3_BUCKET: 'test-bucket',
      BACKUP_S3_SECRET_ACCESS_KEY: 'must-not-leak'
    });
    assert.ok(r.error.includes('BACKUP_S3_ACCESS_KEY_ID'));
    assert.ok(!r.error.includes('must-not-leak'), 'configuration errors never include secret values');

    r = backupApi.resolveS3Config({
      NODE_ENV: 'production',
      BACKUP_S3_BUCKET: 'test-bucket',
      BACKUP_S3_ACCESS_KEY_ID: 'test-access',
      BACKUP_S3_SECRET_ACCESS_KEY: 'test-secret',
      BACKUP_S3_ENDPOINT: 'http://127.0.0.1:9000'
    });
    assert.ok(r.error.includes('HTTPS'), 'production refuses insecure cloud endpoints');

    source = new DatabaseSync(path.join(dataDir, 'app.db'));
    source.exec('CREATE TABLE users (id INTEGER PRIMARY KEY, email TEXT NOT NULL);');
    source.prepare('INSERT INTO users(email) VALUES (?)').run('backup-s3-test@example.test');
    source.close();
    source = null;

    Object.assign(process.env, {
      BACKUP_S3_BUCKET: 'test-bucket',
      BACKUP_S3_ACCESS_KEY_ID: 'test-access',
      BACKUP_S3_SECRET_ACCESS_KEY: 'test-secret',
      BACKUP_S3_ENDPOINT: 'http://127.0.0.1:9000',
      BACKUP_S3_PREFIX: 'competitive-exam-ai-tests'
    });
    let captured = null;
    const fakeFetch = async (url, init) => {
      captured = { url: String(url), init };
      return { ok: true, status: 200, body: null };
    };
    const successful = await backupApi.createBackup({ dataDir, fetchImpl: fakeFetch, timeoutMs: 1000 });
    assert.equal(successful.ok, true);
    assert.ok(successful.bytes > 0);
    assert.equal(successful.offsite.status, 'uploaded');
    assert.equal(successful.offsite.uploaded, true);
    assert.ok(captured, 'upload request was sent through the injectable fetch implementation');
    assert.equal(captured.init.method, 'PUT');
    assert.equal(captured.init.headers['content-type'], 'application/vnd.sqlite3');
    assert.match(captured.init.headers.authorization, /^AWS4-HMAC-SHA256 Credential=test-access\//);
    assert.match(captured.init.headers.authorization, /SignedHeaders=content-type;host;x-amz-content-sha256;x-amz-date/);
    assert.match(captured.init.headers['x-amz-content-sha256'], /^[a-f0-9]{64}$/);
    assert.match(captured.url, /test-bucket\/competitive-exam-ai-tests\/app-/);
    assert.ok(Buffer.isBuffer(captured.init.body));
    const localCopy = path.join(dataDir, 'backups', successful.file);
    assert.ok(fs.existsSync(localCopy), 'local snapshot remains alongside cloud upload');
    const health = backupApi.getOffsiteBackupHealth({ dataDir });
    assert.equal(health.configured, true);
    assert.equal(health.lastAttemptOk, true);
    assert.equal(health.lastSuccessFile, successful.file);

    const failed = await backupApi.createBackup({
      dataDir,
      fetchImpl: async () => { throw new Error('test transport detail must not leak'); },
      timeoutMs: 1000
    });
    assert.equal(failed.ok, true, 'remote error does not fail local snapshot creation');
    assert.equal(failed.offsite.status, 'failed');
    assert.equal(failed.offsite.uploaded, false);
    assert.ok(fs.existsSync(path.join(dataDir, 'backups', failed.file)), 'local copy survives remote upload failure');
    assert.ok(!failed.offsite.error.includes('test transport detail'), 'remote transport details are not exposed');
    const afterFailure = backupApi.getOffsiteBackupHealth({ dataDir });
    assert.equal(afterFailure.lastAttemptOk, false);
    assert.equal(afterFailure.lastSuccessFile, successful.file, 'last known good remote copy is preserved in status');
    assert.ok(afterFailure.lastError);

    delete process.env.BACKUP_S3_ACCESS_KEY_ID;
    const misconfigured = await backupApi.createBackup({ dataDir, fetchImpl: async () => {
      throw new Error('upload must not run when the configuration is incomplete');
    } });
    assert.equal(misconfigured.ok, true);
    assert.equal(misconfigured.offsite.status, 'misconfigured');
    assert.ok(fs.existsSync(path.join(dataDir, 'backups', misconfigured.file)));
    console.log('PASS optional S3-compatible backup configuration, SigV4 upload, safe failures, and local snapshot preservation');
  } finally {
    if (source) source.close();
    for (const key of vars) {
      if (oldEnv[key] === undefined) delete process.env[key];
      else process.env[key] = oldEnv[key];
    }
    fs.rmSync(root, { recursive: true, force: true });
  }
})().catch(error => {
  console.error('FAIL S3 off-site backup tests:', error);
  process.exitCode = 1;
});
