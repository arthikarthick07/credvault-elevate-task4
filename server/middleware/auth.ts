import type { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config';
import { get } from '../db';
import type { AdminRecord } from '../types';
import { ApiError } from '../utils/http';

interface AdminTokenPayload {
  sub: string;
  email: string;
  name: string;
  role: 'admin';
}

export function signAdminToken(admin: AdminRecord): string {
  const payload = { email: admin.email, name: admin.name, role: 'admin' as const };
  const options = {
    subject: admin.email,
    expiresIn: config.jwtExpiresIn,
  } as jwt.SignOptions;
  return jwt.sign(payload, config.jwtSecret, options);
}

function readBearerToken(req: Request): string | null {
  const header = req.headers.authorization;
  if (!header || !header.toLowerCase().startsWith('bearer ')) return null;
  const token = header.slice(7).trim();
  return token.length > 0 ? token : null;
}

/**
 * Verifies the JWT and re-checks that the administrator still exists,
 * so revoked accounts cannot keep using an old token.
 */
export function requireAdmin(req: Request, _res: Response, next: NextFunction): void {
  const token = readBearerToken(req);
  if (!token) {
    next(new ApiError(401, 'Authentication required. Please sign in as an administrator.'));
    return;
  }

  let payload: AdminTokenPayload;
  try {
    payload = jwt.verify(token, config.jwtSecret) as AdminTokenPayload;
  } catch {
    next(new ApiError(401, 'Your session has expired or is invalid. Please sign in again.'));
    return;
  }

  if (payload.role !== 'admin' || !payload.sub) {
    next(new ApiError(403, 'This account is not allowed to access administrator resources.'));
    return;
  }

  const admin = get<AdminRecord>(
    'SELECT id, email, name, created_at FROM admins WHERE email = ?',
    [payload.sub.toLowerCase()],
  );
  if (!admin) {
    next(new ApiError(401, 'This administrator account no longer exists.'));
    return;
  }

  req.admin = admin;
  next();
}

/** Small in-memory limiter to slow down admin login brute-force attempts. */
const attempts = new Map<string, { count: number; resetAt: number }>();
const WINDOW_MS = 10 * 60 * 1000;
const MAX_ATTEMPTS = 8;

export function loginRateLimiter(req: Request, _res: Response, next: NextFunction): void {
  const key = req.ip ?? 'unknown';
  const now = Date.now();
  const entry = attempts.get(key);

  if (!entry || entry.resetAt < now) {
    attempts.set(key, { count: 1, resetAt: now + WINDOW_MS });
    next();
    return;
  }

  if (entry.count >= MAX_ATTEMPTS) {
    const minutes = Math.max(1, Math.ceil((entry.resetAt - now) / 60000));
    next(
      new ApiError(429, `Too many sign-in attempts. Please try again in ${minutes} minute(s).`),
    );
    return;
  }

  entry.count += 1;
  next();
}

export function resetLoginAttempts(ip?: string): void {
  if (ip) attempts.delete(ip);
  else attempts.clear();
}
