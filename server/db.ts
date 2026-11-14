import fs from 'node:fs';
import path from 'node:path';
import initSqlJs from 'sql.js';
import bcrypt from 'bcryptjs';
import { config, ensureRuntimeDirs } from './config';

/** Values accepted by sql.js bindings. */
export type SqlValue = string | number | null;

interface SqlStatement {
  bind(params: SqlValue[]): void;
  step(): boolean;
  getAsObject(): Record<string, SqlValue>;
  free(): void;
}

interface SqlDatabase {
  run(sql: string, params?: SqlValue[]): void;
  exec(sql: string): unknown;
  prepare(sql: string): SqlStatement;
  export(): Uint8Array;
  close(): void;
}

interface SqlJsFactory {
  Database: new (data?: Uint8Array) => SqlDatabase;
}

let db: SqlDatabase | undefined;

const SCHEMA = `
CREATE TABLE IF NOT EXISTS admins (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  email         TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  name          TEXT NOT NULL,
  created_at    TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS applications (
  application_id TEXT PRIMARY KEY,
  full_name      TEXT NOT NULL,
  phone          TEXT NOT NULL,
  gender         TEXT NOT NULL,
  city           TEXT NOT NULL,
  state          TEXT NOT NULL,
  status         TEXT NOT NULL DEFAULT 'pending'
                 CHECK (status IN ('pending', 'approved', 'rejected')),
  remarks        TEXT,
  reviewed_by    TEXT,
  reviewed_at    TEXT,
  created_at     TEXT NOT NULL,
  updated_at     TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS certificates (
  certificate_id   TEXT PRIMARY KEY,
  application_id   TEXT NOT NULL UNIQUE,
  full_name        TEXT NOT NULL,
  phone            TEXT NOT NULL,
  gender           TEXT NOT NULL,
  city             TEXT NOT NULL,
  state            TEXT NOT NULL,
  status           TEXT NOT NULL DEFAULT 'valid'
                   CHECK (status IN ('valid', 'revoked')),
  issued_by        TEXT NOT NULL,
  issued_at        TEXT NOT NULL,
  revoked_at       TEXT,
  revocation_reason TEXT,
  FOREIGN KEY (application_id) REFERENCES applications (application_id)
);

CREATE INDEX IF NOT EXISTS idx_applications_status ON applications (status);
CREATE INDEX IF NOT EXISTS idx_applications_created ON applications (created_at);
CREATE INDEX IF NOT EXISTS idx_certificates_status ON certificates (status);
`;

function resolveWasmDir(): string {
  const candidates = [
    path.join(process.cwd(), 'node_modules', 'sql.js', 'dist'),
    path.join(__dirname, '..', 'node_modules', 'sql.js', 'dist'),
    path.join(__dirname, 'node_modules', 'sql.js', 'dist'),
  ];
  for (const dir of candidates) {
    if (fs.existsSync(path.join(dir, 'sql-wasm.wasm'))) return dir;
  }
  throw new Error(
    'Unable to locate the sql.js WebAssembly assets. Run "npm install" in the repository root.',
  );
}

function requireDb(): SqlDatabase {
  if (!db) throw new Error('Database has not been initialised. Call initDatabase() first.');
  return db;
}

/** Writes the in-memory SQLite image to disk atomically. */
export function persist(): void {
  if (!db) return;
  const data = Buffer.from(db.export());
  const tmpPath = `${config.dbPath}.tmp`;
  fs.writeFileSync(tmpPath, data);
  fs.renameSync(tmpPath, config.dbPath);
}

export function all<T>(sql: string, params: SqlValue[] = []): T[] {
  const statement = requireDb().prepare(sql);
  try {
    statement.bind(params);
    const rows: T[] = [];
    while (statement.step()) {
      rows.push(statement.getAsObject() as unknown as T);
    }
    return rows;
  } finally {
    statement.free();
  }
}

export function get<T>(sql: string, params: SqlValue[] = []): T | undefined {
  return all<T>(sql, params)[0];
}

export function run(sql: string, params: SqlValue[] = []): void {
  requireDb().run(sql, params);
  persist();
}

/** Hashes a plain-text password with bcryptjs using the configured cost factor. */
export function hashPassword(plainPassword: string): string {
  return bcrypt.hashSync(plainPassword, config.bcryptRounds);
}

interface AdminRow {
  id: number;
  email: string;
  password_hash: string;
}

/**
 * Keeps the configured administrator account in sync with the environment.
 *
 * The password is only ever stored as a bcryptjs hash. An existing account is
 * rewritten only when the configured credential no longer matches the stored
 * hash, so ordinary restarts do not churn the row.
 */
function syncAdmin(): void {
  const { email, name, password, passwordHash } = config.admin;

  const existing = get<AdminRow>(
    'SELECT id, email, password_hash FROM admins WHERE email = ?',
    [email],
  );

  if (!existing) {
    const hash = passwordHash ?? (password ? hashPassword(password) : undefined);
    if (!hash) {
      // eslint-disable-next-line no-console
      console.warn(
        `[credvault] No administrator account exists for ${email} and no password is configured. ` +
          'Set ADMIN_PASSWORD or ADMIN_PASSWORD_HASH.',
      );
      return;
    }
    run('INSERT INTO admins (email, password_hash, name, created_at) VALUES (?, ?, ?, ?)', [
      email,
      hash,
      name,
      new Date().toISOString(),
    ]);
    // eslint-disable-next-line no-console
    console.log(`[credvault] Created administrator account ${email} (password hashed with bcryptjs).`);
    return;
  }

  if (passwordHash) {
    if (existing.password_hash !== passwordHash) {
      run('UPDATE admins SET password_hash = ? WHERE id = ?', [passwordHash, existing.id]);
      // eslint-disable-next-line no-console
      console.log(`[credvault] Administrator ${email} password updated from ADMIN_PASSWORD_HASH.`);
    }
    return;
  }

  // No configured credential (documented demo fallback): never overwrite an
  // existing password that the account already has.
  if (!password) return;
  if (bcrypt.compareSync(password, existing.password_hash)) return;

  run('UPDATE admins SET password_hash = ? WHERE id = ?', [hashPassword(password), existing.id]);
  // eslint-disable-next-line no-console
  console.log(`[credvault] Administrator ${email} password updated from ADMIN_PASSWORD.`);
}

export async function initDatabase(): Promise<void> {
  ensureRuntimeDirs();
  const factory = (await (initSqlJs as unknown as (cfg?: unknown) => Promise<SqlJsFactory>)({
    locateFile: (file: string) => path.join(resolveWasmDir(), file),
  })) as SqlJsFactory;

  if (fs.existsSync(config.dbPath)) {
    db = new factory.Database(new Uint8Array(fs.readFileSync(config.dbPath)));
  } else {
    db = new factory.Database();
  }

  requireDb().exec(SCHEMA);
  syncAdmin();
  persist();
  // eslint-disable-next-line no-console
  console.log(`[credvault] SQLite database ready at ${config.dbPath}`);
}

export function closeDatabase(): void {
  if (!db) return;
  persist();
  db.close();
  db = undefined;
}
