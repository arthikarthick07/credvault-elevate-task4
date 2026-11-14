#!/usr/bin/env node
/**
 * Regression test for administrator credential configuration.
 *
 * Proves that:
 *   - the stored password is a bcryptjs hash, never plain text;
 *   - changing ADMIN_PASSWORD updates the *existing* administrator row, so the
 *     new password signs in and the old one stops working;
 *   - ADMIN_PASSWORD_HASH takes precedence over ADMIN_PASSWORD.
 *
 * Each phase starts the built server (dist/index.js) against the same temporary
 * database file. Secrets are generated per run and never printed.
 *
 *   npm run build && node scripts/test-password-rotation.js
 */
'use strict';

const { spawn } = require('node:child_process');
const crypto = require('node:crypto');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const bcrypt = require('bcryptjs');
const initSqlJs = require('sql.js');

const ROOT = path.resolve(__dirname, '..');
const PORT = Number(process.env.ROTATION_TEST_PORT || 4319);
const BASE_URL = `http://127.0.0.1:${PORT}`;
const EMAIL = 'rotation-test@credvault.gov';

let failures = 0;

function check(ok, message) {
  if (!ok) failures += 1;
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${message}`);
}

function secret(bytes = 32) {
  return crypto.randomBytes(bytes).toString('hex');
}

function startServer(env) {
  const child = spawn(process.execPath, ['dist/index.js'], {
    cwd: ROOT,
    env: {
      ...process.env,
      PORT: String(PORT),
      NODE_ENV: 'production',
      DB_PATH: '',
      ...env,
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  child.stdout.setEncoding('utf8');
  child.stderr.setEncoding('utf8');
  // Server logs contain account emails and status only, never secrets.
  child.stdout.on('data', (chunk) => process.stdout.write(`    ${chunk}`));
  child.stderr.on('data', (chunk) => process.stderr.write(`    ${chunk}`));
  return child;
}

function stopServer(child) {
  return new Promise((resolve) => {
    if (!child || child.exitCode !== null) {
      resolve();
      return;
    }
    const timer = setTimeout(() => child.kill('SIGKILL'), 5000);
    child.once('exit', () => {
      clearTimeout(timer);
      resolve();
    });
    child.kill('SIGTERM');
  });
}

async function waitForHealth(timeoutMs = 20000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(`${BASE_URL}/api/health`);
      if (response.ok) return true;
    } catch {
      /* not listening yet */
    }
    await new Promise((resolve) => setTimeout(resolve, 200));
  }
  return false;
}

async function login(password) {
  const response = await fetch(`${BASE_URL}/api/admin/login`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email: EMAIL, password }),
  });
  let body = null;
  try {
    body = await response.json();
  } catch {
    /* ignore */
  }
  return { status: response.status, body };
}

async function readStoredHash(dbPath) {
  const factory = await initSqlJs({
    locateFile: (file) => path.join(ROOT, 'node_modules', 'sql.js', 'dist', file),
  });
  const database = new factory.Database(new Uint8Array(fs.readFileSync(dbPath)));
  const statement = database.prepare('SELECT password_hash FROM admins WHERE email = ?');
  statement.bind([EMAIL]);
  let hash = null;
  if (statement.step()) hash = statement.getAsObject().password_hash;
  statement.free();
  database.close();
  return hash;
}

(async () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'credvault-rotation-'));
  const dbPath = path.join(tempDir, 'rotation.sqlite');
  const firstPassword = secret(16);
  const secondPassword = secret(16);
  const thirdPassword = secret(16);
  let child = null;

  try {
    /* Phase 1: first boot creates the account with a bcrypt hash. */
    child = startServer({
      DB_PATH: dbPath,
      JWT_SECRET: secret(48),
      ADMIN_EMAIL: EMAIL,
      ADMIN_PASSWORD: firstPassword,
    });
    check(await waitForHealth(), 'server started with the initial ADMIN_PASSWORD');

    const first = await login(firstPassword);
    check(
      first.status === 200 && Boolean(first.body && first.body.token),
      `sign-in with the configured password returned ${first.status} (expected 200)`,
    );

    const storedHash = await readStoredHash(dbPath);
    check(
      typeof storedHash === 'string' && storedHash.startsWith('$2'),
      'stored password is a bcryptjs hash',
    );
    check(
      typeof storedHash === 'string' && !storedHash.includes(firstPassword),
      'stored password is not the plain-text value',
    );
    check(
      bcrypt.compareSync(firstPassword, String(storedHash)),
      'stored bcrypt hash verifies against the configured password',
    );

    await stopServer(child);
    child = null;

    /* Phase 2: a changed ADMIN_PASSWORD must update the existing row. */
    child = startServer({
      DB_PATH: dbPath,
      JWT_SECRET: secret(48),
      ADMIN_EMAIL: EMAIL,
      ADMIN_PASSWORD: secondPassword,
    });
    check(await waitForHealth(), 'server restarted against the existing database');

    const rotated = await login(secondPassword);
    check(
      rotated.status === 200,
      `sign-in with the newly configured password returned ${rotated.status} (expected 200)`,
    );

    const superseded = await login(firstPassword);
    check(
      superseded.status === 401,
      `sign-in with the previous password returned ${superseded.status} (expected 401)`,
    );

    await stopServer(child);
    child = null;

    /* Phase 3: ADMIN_PASSWORD_HASH wins over ADMIN_PASSWORD. */
    child = startServer({
      DB_PATH: dbPath,
      JWT_SECRET: secret(48),
      ADMIN_EMAIL: EMAIL,
      ADMIN_PASSWORD_HASH: bcrypt.hashSync(thirdPassword, 10),
      ADMIN_PASSWORD: '',
    });
    check(await waitForHealth(), 'server restarted with ADMIN_PASSWORD_HASH');

    const hashed = await login(thirdPassword);
    check(
      hashed.status === 200,
      `sign-in with the ADMIN_PASSWORD_HASH credential returned ${hashed.status} (expected 200)`,
    );

    const stale = await login(secondPassword);
    check(
      stale.status === 401,
      `sign-in with the superseded password returned ${stale.status} (expected 401)`,
    );
  } finally {
    if (child) await stopServer(child);
    fs.rmSync(tempDir, { recursive: true, force: true });
  }

  console.log(
    failures === 0
      ? '\nAll administrator credential rotation checks passed.'
      : `\n${failures} administrator credential rotation check(s) failed.`,
  );
  process.exit(failures === 0 ? 0 : 1);
})().catch((error) => {
  console.error(`Rotation test could not complete: ${error.message}`);
  process.exit(1);
});
