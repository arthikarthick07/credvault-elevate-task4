import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import dotenv from 'dotenv';

dotenv.config();

const ROOT = process.cwd();

const DEV_ADMIN_EMAIL = 'admin@credvault.gov';
const DEV_ADMIN_PASSWORD = 'CredVault@2025';

let jwtSecret = (process.env.JWT_SECRET ?? '').trim();
if (!jwtSecret) {
  jwtSecret = crypto.randomBytes(48).toString('hex');
  // eslint-disable-next-line no-console
  console.warn(
    '[credvault] JWT_SECRET is not set. An ephemeral secret was generated for this process, ' +
      'so admin sessions will be invalidated on restart. Set JWT_SECRET in your environment.',
  );
}

const usingDefaultAdmin = !process.env.ADMIN_EMAIL || !process.env.ADMIN_PASSWORD;
if (usingDefaultAdmin) {
  // eslint-disable-next-line no-console
  console.warn(
    '[credvault] ADMIN_EMAIL / ADMIN_PASSWORD are not fully set. Falling back to the documented ' +
      'demo administrator account. Set both variables before deploying to production.',
  );
}

export const config = {
  rootDir: ROOT,
  port: Number(process.env.PORT ?? 4000),
  nodeEnv: process.env.NODE_ENV ?? 'development',
  jwtSecret,
  jwtExpiresIn: (process.env.JWT_EXPIRES_IN ?? '8h').trim(),
  bcryptRounds: Number(process.env.BCRYPT_ROUNDS ?? 10),
  dbPath: process.env.DB_PATH
    ? path.resolve(ROOT, process.env.DB_PATH)
    : path.join(ROOT, 'data', 'credvault.sqlite'),
  clientDist: path.join(ROOT, 'client', 'dist'),
  admin: {
    email: (process.env.ADMIN_EMAIL ?? DEV_ADMIN_EMAIL).trim().toLowerCase(),
    password: process.env.ADMIN_PASSWORD ?? DEV_ADMIN_PASSWORD,
    name: (process.env.ADMIN_NAME ?? 'CredVault Administrator').trim(),
    usingDefaults: usingDefaultAdmin,
  },
  issuer: {
    authority: 'CredVault Certification Authority',
    department: 'Department of Skill Certification & Verification',
  },
};

export function ensureRuntimeDirs(): void {
  fs.mkdirSync(path.dirname(config.dbPath), { recursive: true });
}
