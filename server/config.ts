import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import dotenv from 'dotenv';
import { validateEmail } from './validation';

dotenv.config();

const ROOT = process.cwd();

const DEV_ADMIN_EMAIL = 'admin@credvault.gov';
const DEV_ADMIN_PASSWORD = 'CredVault@2025';

/** Minimum length accepted for a JWT signing secret. */
const MIN_JWT_SECRET_LENGTH = 32;

/** bcryptjs hashes look like $2a$10$<53 base64 characters>. */
const BCRYPT_HASH_PATTERN = /^\$2[aby]\$\d{2}\$[./A-Za-z0-9]{53}$/;

/** Reads an environment variable, treating blank values as "not set". */
function readEnv(name: string): string | undefined {
  const raw = process.env[name];
  if (raw === undefined) return undefined;
  const value = raw.trim();
  return value.length > 0 ? value : undefined;
}

const configuredJwtSecret = readEnv('JWT_SECRET');
let jwtSecret: string;
let jwtSecretIsEphemeral = false;

if (configuredJwtSecret) {
  if (configuredJwtSecret.length < MIN_JWT_SECRET_LENGTH) {
    // Only the length is logged: the secret itself must never reach the logs.
    // eslint-disable-next-line no-console
    console.warn(
      `[credvault] JWT_SECRET is only ${configuredJwtSecret.length} characters long. ` +
        `Use at least ${MIN_JWT_SECRET_LENGTH} random characters so tokens cannot be guessed.`,
    );
  }
  jwtSecret = configuredJwtSecret;
} else {
  jwtSecret = crypto.randomBytes(48).toString('hex');
  jwtSecretIsEphemeral = true;
  // eslint-disable-next-line no-console
  console.warn(
    '[credvault] JWT_SECRET is not set. An ephemeral secret was generated for this process, ' +
      'so admin sessions will be invalidated on restart. Set JWT_SECRET in your environment.',
  );
}

const configuredAdminEmail = readEnv('ADMIN_EMAIL');

// The login route only accepts a syntactically valid address, so an ADMIN_EMAIL
// that fails that check would seed an administrator nobody can ever sign in as.
// Reject it here, at startup, instead of failing silently at the login form.
const validAdminEmail = configuredAdminEmail ? validateEmail(configuredAdminEmail) : null;
if (configuredAdminEmail && !validAdminEmail) {
  // Only the shape is described: the configured value itself stays out of the logs.
  // eslint-disable-next-line no-console
  console.warn(
    '[credvault] ADMIN_EMAIL is not a valid email address (expected a form like ' +
      `name@example.gov), so it is ignored and ${DEV_ADMIN_EMAIL} is used instead. ` +
      'Update ADMIN_EMAIL to a valid address to sign in with your own account.',
  );
}

const configuredAdminPassword = readEnv('ADMIN_PASSWORD');
const configuredAdminPasswordHash = readEnv('ADMIN_PASSWORD_HASH');

let adminPasswordHash: string | undefined;
if (configuredAdminPasswordHash) {
  if (BCRYPT_HASH_PATTERN.test(configuredAdminPasswordHash)) {
    adminPasswordHash = configuredAdminPasswordHash;
  } else {
    // eslint-disable-next-line no-console
    console.warn(
      '[credvault] ADMIN_PASSWORD_HASH is not a valid bcrypt hash and will be ignored. ' +
        'Generate one with "npm run hash:admin".',
    );
  }
}

const adminPasswordConfigured = Boolean(configuredAdminPassword || adminPasswordHash);
if (!adminPasswordConfigured) {
  // eslint-disable-next-line no-console
  console.warn(
    '[credvault] Neither ADMIN_PASSWORD nor ADMIN_PASSWORD_HASH is set. Falling back to the ' +
      'documented demo administrator password. Set one of them before exposing this app publicly.',
  );
}

export const config = {
  rootDir: ROOT,
  port: Number(process.env.PORT ?? 4000),
  nodeEnv: process.env.NODE_ENV ?? 'development',
  jwtSecret,
  /** True when no JWT_SECRET was configured and a throwaway per-process secret is in use. */
  jwtSecretIsEphemeral,
  jwtExpiresIn: (process.env.JWT_EXPIRES_IN ?? '8h').trim(),
  bcryptRounds: Number(process.env.BCRYPT_ROUNDS ?? 10),
  dbPath: process.env.DB_PATH
    ? path.resolve(ROOT, process.env.DB_PATH)
    : path.join(ROOT, 'data', 'credvault.sqlite'),
  clientDist: path.join(ROOT, 'client', 'dist'),
  admin: {
    email: validAdminEmail ?? DEV_ADMIN_EMAIL,
    /** Plain-text password from the environment; undefined when a pre-hashed one is supplied. */
    password: adminPasswordHash ? undefined : (configuredAdminPassword ?? DEV_ADMIN_PASSWORD),
    /** Pre-hashed bcrypt password (ADMIN_PASSWORD_HASH); takes precedence over `password`. */
    passwordHash: adminPasswordHash,
    name: (process.env.ADMIN_NAME ?? 'CredVault Administrator').trim(),
    usingDefaults: !adminPasswordConfigured,
  },
  issuer: {
    authority: 'CredVault Certification Authority',
    department: 'Department of Skill Certification & Verification',
  },
};

export function ensureRuntimeDirs(): void {
  fs.mkdirSync(path.dirname(config.dbPath), { recursive: true });
}
