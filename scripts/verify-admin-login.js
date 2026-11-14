#!/usr/bin/env node
/**
 * Verifies the configured administrator credentials end to end without revealing them.
 *
 * Reads ADMIN_EMAIL and ADMIN_PASSWORD from the environment (or .env) plus an
 * optional BASE_URL, then checks:
 *   1. the API is reachable,
 *   2. an incorrect password is rejected (401),
 *   3. the configured password is accepted (200 with a JWT),
 *   4. the protected admin API rejects a request with no token (401),
 *   5. the protected admin API accepts the issued token (200).
 *
 * Only HTTP status codes and pass/fail lines are printed: never the password,
 * the hash, the JWT or any part of a secret. Exits non-zero if a check fails.
 *
 *   BASE_URL=https://your-app.example.com npm run verify:admin
 *   npm run verify:admin                      # defaults to http://127.0.0.1:4000
 */
'use strict';

const crypto = require('node:crypto');

try {
  // eslint-disable-next-line global-require
  require('dotenv').config();
} catch {
  /* dotenv is optional for this helper */
}

const BASE_URL = (
  process.env.BASE_URL ||
  process.env.APP_URL ||
  'http://127.0.0.1:4000'
).replace(/\/+$/, '');

const EMAIL = (process.env.ADMIN_EMAIL || '').trim();
const PASSWORD = process.env.ADMIN_PASSWORD || '';

let failures = 0;

function check(ok, message) {
  if (!ok) failures += 1;
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${message}`);
}

async function request(path, options = {}) {
  const response = await fetch(`${BASE_URL}${path}`, options);
  let body = null;
  try {
    body = await response.json();
  } catch {
    /* non-JSON response */
  }
  return { status: response.status, body };
}

function postJson(path, payload, headers = {}) {
  return request(path, {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...headers },
    body: JSON.stringify(payload),
  });
}

(async () => {
  console.log(`CredVault administrator sign-in verification against ${BASE_URL}`);

  if (!EMAIL || !PASSWORD) {
    console.error(
      'Cannot verify: ADMIN_EMAIL and ADMIN_PASSWORD must be available to this command ' +
        '(export them or add them to .env). Their values are never printed.',
    );
    process.exit(2);
  }

  // Random throwaway value: it cannot match the real password, so 401 is expected.
  const wrongPassword = crypto.randomBytes(24).toString('base64url');

  const health = await request('/api/health');
  check(health.status === 200, `GET /api/health returned ${health.status} (expected 200)`);

  const rejected = await postJson('/api/admin/login', { email: EMAIL, password: wrongPassword });
  check(
    rejected.status === 401,
    `POST /api/admin/login with an incorrect password returned ${rejected.status} (expected 401)`,
  );

  const accepted = await postJson('/api/admin/login', { email: EMAIL, password: PASSWORD });
  const token = accepted.body && typeof accepted.body.token === 'string' ? accepted.body.token : null;
  check(
    accepted.status === 200 && Boolean(token),
    `POST /api/admin/login with the configured password returned ${accepted.status} (expected 200 with a token)`,
  );

  const anonymous = await request('/api/admin/me');
  check(
    anonymous.status === 401,
    `GET /api/admin/me without a token returned ${anonymous.status} (expected 401)`,
  );

  if (token) {
    const authorised = await request('/api/admin/me', {
      headers: { authorization: `Bearer ${token}` },
    });
    check(
      authorised.status === 200,
      `GET /api/admin/me with the issued token returned ${authorised.status} (expected 200)`,
    );
  } else {
    check(false, 'Skipped the token check because no token was issued');
  }

  console.log(
    failures === 0
      ? '\nAll administrator sign-in checks passed.'
      : `\n${failures} administrator sign-in check(s) failed.`,
  );
  process.exit(failures === 0 ? 0 : 1);
})().catch((error) => {
  console.error(`Verification could not complete: ${error.message}`);
  process.exit(1);
});
