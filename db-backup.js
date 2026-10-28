// Automated SQLite snapshots with optional S3-compatible off-site copies.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { DatabaseSync } = require('node:sqlite');

const DEFAULT_DATA_DIR = process.env.DATA_DIR || path.join(__dirname, 'storage');
const DAY_MS = 24 * 60 * 60 * 1000;
const SQLITE_CONTENT_TYPE = 'application/vnd.sqlite3';
let started = false;

function listBackups(options = {}) {
  const dataDir = options.dataDir || DEFAULT_DATA_DIR;
  const backupDir = path.join(dataDir, 'backups');
  if (!fs.existsSync(backupDir)) return [];
  return fs.readdirSync(backupDir)
    .filter(name => /^app-\d{4}-\d{2}-\d{2}T.*\.db$/.test(name))
    .map(name => {
      const stat = fs.statSync(path.join(backupDir, name));
      return { file: name, bytes: stat.size, createdAt: stat.mtime.toISOString() };
    })
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

function resolveS3Config(env = process.env) {
  const bucket = String(env.BACKUP_S3_BUCKET || '').trim();
  const accessKeyId = String(env.BACKUP_S3_ACCESS_KEY_ID || '').trim();
  const secretAccessKey = String(env.BACKUP_S3_SECRET_ACCESS_KEY || '').trim();
  const endpointSetting = String(env.BACKUP_S3_ENDPOINT || '').trim();
  const region = String(env.BACKUP_S3_REGION || 'us-east-1').trim();
  const anyConfigured = !!(bucket || accessKeyId || secretAccessKey || endpointSetting || env.BACKUP_S3_REGION);
  if (!anyConfigured) return { config: null, error: null };

  const missing = [];
  if (!bucket) missing.push('BACKUP_S3_BUCKET');
  if (!accessKeyId) missing.push('BACKUP_S3_ACCESS_KEY_ID');
  if (!secretAccessKey) missing.push('BACKUP_S3_SECRET_ACCESS_KEY');
  if (missing.length) return { config: null, error: 'Missing required settings: ' + missing.join(', ') + '.' };
  if (!region) return { config: null, error: 'BACKUP_S3_REGION cannot be empty.' };
  if (!endpointSetting && region.toLowerCase() === 'auto') {
    return { config: null, error: 'BACKUP_S3_ENDPOINT is required when BACKUP_S3_REGION=auto.' };
  }

  let endpoint;
  try {
    endpoint = new URL(endpointSetting || ('https://s3.' + region + '.amazonaws.com'));
  } catch {
    return { config: null, error: 'BACKUP_S3_ENDPOINT must be a valid URL.' };
  }
  if (!['https:', 'http:'].includes(endpoint.protocol) || endpoint.username || endpoint.password ||
      endpoint.search || endpoint.hash) {
    return { config: null, error: 'BACKUP_S3_ENDPOINT must be an HTTP(S) URL without credentials, query, or fragment.' };
  }
  if (env.NODE_ENV === 'production' && endpoint.protocol !== 'https:') {
    return { config: null, error: 'BACKUP_S3_ENDPOINT must use HTTPS in production.' };
  }
  const localHosts = ['localhost', '127.0.0.1', '[::1]', '::1'];
  if (endpoint.protocol === 'http:' && !localHosts.includes(endpoint.hostname)) {
    return { config: null, error: 'HTTP is allowed only for loopback test endpoints; use HTTPS for cloud storage.' };
  }
  endpoint.pathname = endpoint.pathname.replace(/\/+$/, '');
  const prefix = String(env.BACKUP_S3_PREFIX || 'competitive-exam-ai')
    .replace(/\\/g, '/')
    .split('/')
    .filter(part => part && part !== '.' && part !== '..')
    .join('/');
  return {
    config: {
      bucket,
      accessKeyId,
      secretAccessKey,
      region,
      endpoint: endpoint.origin + endpoint.pathname,
      prefix
    },
    error: null
  };
}

function awsUriEncode(value) {
  return encodeURIComponent(String(value)).replace(/[!'()*]/g, char =>
    '%' + char.charCodeAt(0).toString(16).toUpperCase());
}
function sha256(value) {
  return crypto.createHash('sha256').update(value).digest('hex');
}
function hmac(key, value) {
  return crypto.createHmac('sha256', key).update(value).digest();
}
function objectKeyFor(config, filename) {
  return (config.prefix ? config.prefix + '/' : '') + path.basename(filename);
}
function signingKey(secret, dateStamp, region) {
  const dateKey = hmac(Buffer.from('AWS4' + secret, 'utf8'), dateStamp);
  const regionKey = hmac(dateKey, region);
  const serviceKey = hmac(regionKey, 's3');
  return hmac(serviceKey, 'aws4_request');
}

async function uploadBackupToS3(filePath, config, options = {}) {
  const payload = fs.readFileSync(filePath);
  const payloadHash = sha256(payload);
  const now = options.now instanceof Date ? options.now : new Date();
  const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, '');
  const dateStamp = amzDate.slice(0, 8);
  const endpoint = new URL(config.endpoint);
  const key = options.key || objectKeyFor(config, path.basename(filePath));
  const basePath = endpoint.pathname.replace(/\/+$/, '');
  const objectPath = [config.bucket, ...key.split('/')].map(awsUriEncode).join('/');
  const canonicalUri = (basePath || '') + '/' + objectPath;
  endpoint.pathname = canonicalUri;

  const host = endpoint.host.toLowerCase();
  const canonicalHeaders =
    'content-type:' + SQLITE_CONTENT_TYPE + '\n' +
    'host:' + host + '\n' +
    'x-amz-content-sha256:' + payloadHash + '\n' +
    'x-amz-date:' + amzDate + '\n';
  const signedHeaders = 'content-type;host;x-amz-content-sha256;x-amz-date';
  const canonicalRequest = [
    'PUT',
    endpoint.pathname,
    '',
    canonicalHeaders,
    signedHeaders,
    payloadHash
  ].join('\n');
  const scope = dateStamp + '/' + config.region + '/s3/aws4_request';
  const stringToSign = 'AWS4-HMAC-SHA256\n' + amzDate + '\n' + scope + '\n' + sha256(canonicalRequest);
  const signature = crypto.createHmac('sha256', signingKey(config.secretAccessKey, dateStamp, config.region))
    .update(stringToSign)
    .digest('hex');
  const authorization = 'AWS4-HMAC-SHA256 Credential=' + config.accessKeyId + '/' + scope +
    ', SignedHeaders=' + signedHeaders + ', Signature=' + signature;

  const timeoutMs = Math.max(1000, Math.min(300000, Number(options.timeoutMs || process.env.BACKUP_S3_TIMEOUT_MS) || 60000));
  const fetchImpl = options.fetchImpl || fetch;
  let response;
  try {
    response = await fetchImpl(endpoint.href, {
      method: 'PUT',
      headers: {
        'content-type': SQLITE_CONTENT_TYPE,
        'x-amz-content-sha256': payloadHash,
        'x-amz-date': amzDate,
        authorization
      },
      body: payload,
      signal: AbortSignal.timeout(timeoutMs)
    });
  } catch {
    throw new Error('S3 off-site backup upload failed (network or timeout).');
  }
  if (!response.ok) {
    try { await response.body?.cancel(); } catch {}
    throw new Error('S3 off-site backup upload failed with HTTP ' + response.status + '.');
  }
  try { await response.body?.cancel(); } catch {}
  return { key, bytes: payload.length, statusCode: response.status };
}

function readOffsiteState(dataDir) {
  try {
    const value = JSON.parse(fs.readFileSync(path.join(dataDir, 'offsite-backup-status.json'), 'utf8'));
    return value && typeof value === 'object' ? value : {};
  } catch {
    return {};
  }
}
function writeOffsiteState(dataDir, state) {
  try {
    fs.mkdirSync(dataDir, { recursive: true, mode: 0o700 });
    const destination = path.join(dataDir, 'offsite-backup-status.json');
    const temporary = destination + '.tmp-' + process.pid + '-' + crypto.randomBytes(4).toString('hex');
    fs.writeFileSync(temporary, JSON.stringify(state, null, 2), { mode: 0o600, flag: 'wx' });
    fs.renameSync(temporary, destination);
    fs.chmodSync(destination, 0o600);
  } catch (error) {
    console.error('[db-backup] Could not persist off-site backup status:', error.message);
  }
}
function updateOffsiteState(dataDir, attempt) {
  const previous = readOffsiteState(dataDir);
  const next = {
    version: 1,
    lastAttemptAt: attempt.at,
    lastAttemptOk: attempt.ok,
    lastAttemptFile: attempt.file,
    lastAttemptKey: attempt.key || null,
    lastError: attempt.ok ? null : attempt.error,
    lastSuccessAt: attempt.ok ? attempt.at : (previous.lastSuccessAt || null),
    lastSuccessFile: attempt.ok ? attempt.file : (previous.lastSuccessFile || null),
    lastSuccessKey: attempt.ok ? attempt.key : (previous.lastSuccessKey || null)
  };
  writeOffsiteState(dataDir, next);
  return next;
}
function getOffsiteBackupHealth(options = {}) {
  const dataDir = options.dataDir || DEFAULT_DATA_DIR;
  const resolved = resolveS3Config();
  const state = readOffsiteState(dataDir);
  return {
    configured: !!resolved.config,
    configurationError: resolved.error || null,
    provider: resolved.config ? 's3-compatible' : null,
    lastAttemptAt: state.lastAttemptAt || null,
    lastAttemptOk: typeof state.lastAttemptOk === 'boolean' ? state.lastAttemptOk : null,
    lastAttemptFile: state.lastAttemptFile || null,
    lastSuccessAt: state.lastSuccessAt || null,
    lastSuccessFile: state.lastSuccessFile || null,
    lastSuccessKey: state.lastSuccessKey || null,
    lastError: state.lastError || null
  };
}

async function createBackup(options = {}) {
  const dataDir = options.dataDir || DEFAULT_DATA_DIR;
  const keep = Math.max(1, Math.min(30, Number(options.keep ?? process.env.DB_BACKUP_KEEP) || 7));
  const sourcePath = path.join(dataDir, 'app.db');
  const backupDir = path.join(dataDir, 'backups');
  if (!fs.existsSync(sourcePath)) throw new Error('SQLite source database not found; backup was not created.');
  fs.mkdirSync(backupDir, { recursive: true, mode: 0o700 });
  const stamp = new Date().toISOString().replace(/:/g, '-');
  let destinationPath = path.join(backupDir, 'app-' + stamp + '.db');
  let suffix = 1;
  while (fs.existsSync(destinationPath)) destinationPath = path.join(backupDir, 'app-' + stamp + '-' + suffix++ + '.db');

  const source = new DatabaseSync(sourcePath);
  try {
    source.exec('PRAGMA busy_timeout = 5000');
    source.exec("VACUUM INTO '" + destinationPath.replace(/'/g, "''") + "'");
  } finally { source.close(); }

  try {
    fs.chmodSync(destinationPath, 0o600);
    const snapshot = new DatabaseSync(destinationPath, { readOnly: true });
    try {
      const check = snapshot.prepare('PRAGMA quick_check').all();
      const hasUsers = snapshot.prepare("SELECT 1 FROM sqlite_master WHERE type='table' AND name='users'").get();
      if (check.length !== 1 || check[0].quick_check !== 'ok' || !hasUsers) throw new Error('SQLite backup verification failed.');
    } finally { snapshot.close(); }
  } catch (error) {
    try { fs.rmSync(destinationPath, { force: true }); } catch {}
    throw error;
  }

  const file = path.basename(destinationPath);
  const resolved = resolveS3Config();
  let offsite = { configured: false, uploaded: false, status: 'not_configured', key: null, error: null };
  if (resolved.error) {
    const attemptAt = new Date().toISOString();
    updateOffsiteState(dataDir, { at: attemptAt, ok: false, file, key: null, error: resolved.error });
    offsite = { configured: false, uploaded: false, status: 'misconfigured', key: null, error: resolved.error };
    console.error('[db-backup] Off-site storage is misconfigured:', resolved.error);
  } else if (resolved.config) {
    const key = objectKeyFor(resolved.config, file);
    const attemptAt = new Date().toISOString();
    try {
      await uploadBackupToS3(destinationPath, resolved.config, {
        fetchImpl: options.fetchImpl,
        timeoutMs: options.timeoutMs,
        key
      });
      updateOffsiteState(dataDir, { at: attemptAt, ok: true, file, key, error: null });
      offsite = { configured: true, uploaded: true, status: 'uploaded', key, error: null };
      console.log('[db-backup] Off-site snapshot uploaded:', key);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'S3 off-site backup upload failed.';
      updateOffsiteState(dataDir, { at: attemptAt, ok: false, file, key, error: message });
      offsite = { configured: true, uploaded: false, status: 'failed', key, error: message };
      console.error('[db-backup] Off-site upload failed for ' + file + ':', message);
    }
  }

  const backups = listBackups({ dataDir });
  for (const old of backups.slice(keep)) {
    try { fs.rmSync(path.join(backupDir, old.file), { force: true }); }
    catch (error) { console.error('[db-backup] Could not prune old snapshot:', error.message); }
  }
  const stat = fs.statSync(destinationPath);
  return {
    ok: true,
    file,
    bytes: stat.size,
    createdAt: stat.mtime.toISOString(),
    retained: listBackups({ dataDir }).length,
    offsite
  };
}

function startScheduledBackups() {
  if (started) return;
  started = true;
  const run = async () => {
    try {
      const result = await createBackup();
      console.log('[db-backup] Snapshot created and verified:', result.file, '(' + result.bytes + ' bytes)');
    } catch (error) {
      console.error('[db-backup] Snapshot failed:', error.message);
    }
  };
  const initial = setTimeout(run, 60_000);
  initial.unref?.();
  const interval = setInterval(run, DAY_MS);
  interval.unref?.();
}
module.exports = { createBackup, listBackups, startScheduledBackups, resolveS3Config, getOffsiteBackupHealth, uploadBackupToS3 };
