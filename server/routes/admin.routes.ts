import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { all, get, run, type SqlValue } from '../db';
import { toAdminApplication, toAdminCertificate } from '../mappers';
import { loginRateLimiter, requireAdmin, resetLoginAttempts, signAdminToken } from '../middleware/auth';
import type {
  AdminRecord,
  ApplicationStatus,
  ApplicationWithCertificate,
  CertificateRecord,
} from '../types';
import { ApiError, asyncHandler } from '../utils/http';
import { generateUniqueId } from '../utils/ids';
import { validateEmail, validateRemarks } from '../validation';

export const adminRouter = Router();

const APPLICATION_SELECT = `
  SELECT a.application_id, a.full_name, a.phone, a.gender, a.city, a.state,
         a.status, a.remarks, a.reviewed_by, a.reviewed_at, a.created_at, a.updated_at,
         c.certificate_id AS certificate_id,
         c.status         AS certificate_status,
         c.issued_at      AS certificate_issued_at
  FROM applications a
  LEFT JOIN certificates c ON c.application_id = a.application_id
`;

function loadApplication(applicationId: string): ApplicationWithCertificate {
  const application = get<ApplicationWithCertificate>(`${APPLICATION_SELECT} WHERE a.application_id = ?`, [
    applicationId,
  ]);
  if (!application) {
    throw new ApiError(404, `Application "${applicationId}" was not found.`);
  }
  return application;
}

function loadCertificate(certificateId: string): CertificateRecord {
  const certificate = get<CertificateRecord>('SELECT * FROM certificates WHERE certificate_id = ?', [
    certificateId,
  ]);
  if (!certificate) {
    throw new ApiError(404, `Certificate "${certificateId}" was not found.`);
  }
  return certificate;
}

function normaliseId(raw: unknown): string {
  return String(raw ?? '').trim().toUpperCase();
}

/* ------------------------------------------------------------------ auth -- */

adminRouter.post(
  '/login',
  loginRateLimiter,
  asyncHandler(async (req, res) => {
    const email = validateEmail((req.body ?? {}).email);
    const password = typeof (req.body ?? {}).password === 'string' ? req.body.password : '';

    if (!email || !password) {
      throw new ApiError(400, 'Enter your administrator email address and password.');
    }

    const admin = get<AdminRecord & { password_hash: string }>(
      'SELECT id, email, name, created_at, password_hash FROM admins WHERE email = ?',
      [email],
    );

    // Constant-ish response for unknown accounts and wrong passwords.
    const hash = admin?.password_hash ?? '$2a$10$invalidinvalidinvalidinvalidinvalidinvalidinvalidinvalidinv';
    const matches = await bcrypt.compare(password, hash);

    if (!admin || !matches) {
      throw new ApiError(401, 'Incorrect email address or password.');
    }

    resetLoginAttempts(req.ip);
    const token = signAdminToken(admin);
    res.json({
      token,
      admin: { email: admin.email, name: admin.name },
    });
  }),
);

adminRouter.get(
  '/me',
  requireAdmin,
  asyncHandler((req, res) => {
    const admin = req.admin as AdminRecord;
    res.json({ admin: { email: admin.email, name: admin.name } });
  }),
);

/* ----------------------------------------------------------------- stats -- */

adminRouter.get(
  '/stats',
  requireAdmin,
  asyncHandler((_req, res) => {
    const applications = get<Record<string, number>>(
      `SELECT COUNT(*) AS total,
              COALESCE(SUM(CASE WHEN status = 'pending'  THEN 1 ELSE 0 END), 0) AS pending,
              COALESCE(SUM(CASE WHEN status = 'approved' THEN 1 ELSE 0 END), 0) AS approved,
              COALESCE(SUM(CASE WHEN status = 'rejected' THEN 1 ELSE 0 END), 0) AS rejected
       FROM applications`,
    );
    const certificates = get<Record<string, number>>(
      `SELECT COUNT(*) AS total,
              COALESCE(SUM(CASE WHEN status = 'valid'   THEN 1 ELSE 0 END), 0) AS valid,
              COALESCE(SUM(CASE WHEN status = 'revoked' THEN 1 ELSE 0 END), 0) AS revoked
       FROM certificates`,
    );

    res.json({
      stats: {
        applications: {
          total: Number(applications?.total ?? 0),
          pending: Number(applications?.pending ?? 0),
          approved: Number(applications?.approved ?? 0),
          rejected: Number(applications?.rejected ?? 0),
        },
        certificates: {
          total: Number(certificates?.total ?? 0),
          valid: Number(certificates?.valid ?? 0),
          revoked: Number(certificates?.revoked ?? 0),
        },
      },
    });
  }),
);

/* ---------------------------------------------------------- applications -- */

adminRouter.get(
  '/applications',
  requireAdmin,
  asyncHandler((req, res) => {
    const status = String(req.query.status ?? 'all').toLowerCase();
    const query = String(req.query.q ?? '').trim();
    const where: string[] = [];
    const params: SqlValue[] = [];

    if (['pending', 'approved', 'rejected'].includes(status)) {
      where.push('a.status = ?');
      params.push(status);
    }
    if (query) {
      const like = `%${query.toLowerCase()}%`;
      where.push(
        `(lower(a.application_id) LIKE ? OR lower(a.full_name) LIKE ? OR a.phone LIKE ? OR lower(a.city) LIKE ? OR lower(a.state) LIKE ?)`,
      );
      params.push(like, like, `%${query}%`, like, like);
    }

    const clause = where.length ? ` WHERE ${where.join(' AND ')}` : '';
    const rows = all<ApplicationWithCertificate>(
      `${APPLICATION_SELECT}${clause} ORDER BY a.created_at DESC LIMIT 500`,
      params,
    );

    res.json({ applications: rows.map(toAdminApplication), total: rows.length });
  }),
);

adminRouter.get(
  '/applications/:applicationId',
  requireAdmin,
  asyncHandler((req, res) => {
    const application = loadApplication(normaliseId(req.params.applicationId));
    res.json({ application: toAdminApplication(application) });
  }),
);

adminRouter.patch(
  '/applications/:applicationId',
  requireAdmin,
  asyncHandler((req, res) => {
    const applicationId = normaliseId(req.params.applicationId);
    const application = loadApplication(applicationId);
    const body = (req.body ?? {}) as Record<string, unknown>;
    const status = String(body.status ?? '').trim().toLowerCase();

    if (!['approved', 'rejected', 'pending'].includes(status)) {
      throw new ApiError(400, 'Select a valid decision: approved or rejected.', {
        status: 'Select a valid decision.',
      });
    }

    if (status === 'rejected' && application.certificate_id) {
      throw new ApiError(
        409,
        'This application already has an issued certificate. Revoke the certificate instead of rejecting the application.',
      );
    }

    if (status === 'pending' && application.certificate_id) {
      throw new ApiError(409, 'An issued certificate cannot be moved back to pending.');
    }

    const remarks = validateRemarks(body.remarks);
    if (remarks.error) throw new ApiError(400, remarks.error, { remarks: remarks.error });

    const admin = req.admin as AdminRecord;
    const now = new Date().toISOString();

    run(
      `UPDATE applications
          SET status = ?, remarks = ?, reviewed_by = ?, reviewed_at = ?, updated_at = ?
        WHERE application_id = ?`,
      [status as ApplicationStatus, remarks.value, admin.email, now, now, applicationId],
    );

    res.json({ application: toAdminApplication(loadApplication(applicationId)) });
  }),
);

/* ---------------------------------------------------------- certificates -- */

adminRouter.post(
  '/applications/:applicationId/certificate',
  requireAdmin,
  asyncHandler((req, res) => {
    const applicationId = normaliseId(req.params.applicationId);
    const application = loadApplication(applicationId);

    if (application.status !== 'approved') {
      throw new ApiError(
        409,
        'Only approved applications can be issued a certificate. Approve this application first.',
      );
    }
    if (application.certificate_id) {
      throw new ApiError(
        409,
        `Certificate ${application.certificate_id} has already been issued for this application.`,
      );
    }

    const certificateId = generateUniqueId('CERT', (id) =>
      Boolean(get<{ certificate_id: string }>('SELECT certificate_id FROM certificates WHERE certificate_id = ?', [id])),
    );
    const admin = req.admin as AdminRecord;
    const now = new Date().toISOString();

    run(
      `INSERT INTO certificates
         (certificate_id, application_id, full_name, phone, gender, city, state,
          status, issued_by, issued_at, revoked_at, revocation_reason)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'valid', ?, ?, NULL, NULL)`,
      [
        certificateId,
        application.application_id,
        application.full_name,
        application.phone,
        application.gender,
        application.city,
        application.state,
        admin.email,
        now,
      ],
    );

    run('UPDATE applications SET updated_at = ? WHERE application_id = ?', [now, applicationId]);

    res.status(201).json({
      certificate: toAdminCertificate(loadCertificate(certificateId)),
      application: toAdminApplication(loadApplication(applicationId)),
    });
  }),
);

adminRouter.get(
  '/certificates',
  requireAdmin,
  asyncHandler((req, res) => {
    const status = String(req.query.status ?? 'all').toLowerCase();
    const query = String(req.query.q ?? '').trim();
    const where: string[] = [];
    const params: SqlValue[] = [];

    if (['valid', 'revoked'].includes(status)) {
      where.push('status = ?');
      params.push(status);
    }
    if (query) {
      const like = `%${query.toLowerCase()}%`;
      where.push(
        `(lower(certificate_id) LIKE ? OR lower(application_id) LIKE ? OR lower(full_name) LIKE ? OR lower(city) LIKE ? OR lower(state) LIKE ?)`,
      );
      params.push(like, like, like, like, like);
    }

    const clause = where.length ? ` WHERE ${where.join(' AND ')}` : '';
    const rows = all<CertificateRecord>(
      `SELECT * FROM certificates${clause} ORDER BY issued_at DESC LIMIT 500`,
      params,
    );

    res.json({ certificates: rows.map(toAdminCertificate), total: rows.length });
  }),
);

adminRouter.get(
  '/certificates/:certificateId',
  requireAdmin,
  asyncHandler((req, res) => {
    res.json({ certificate: toAdminCertificate(loadCertificate(normaliseId(req.params.certificateId))) });
  }),
);

adminRouter.post(
  '/certificates/:certificateId/revoke',
  requireAdmin,
  asyncHandler((req, res) => {
    const certificateId = normaliseId(req.params.certificateId);
    const certificate = loadCertificate(certificateId);

    if (certificate.status === 'revoked') {
      throw new ApiError(409, `Certificate ${certificateId} is already revoked.`);
    }

    const body = (req.body ?? {}) as Record<string, unknown>;
    const reason = validateRemarks(body.reason, { required: true });
    if (reason.error || !reason.value) {
      throw new ApiError(400, reason.error ?? 'Please provide a revocation reason.', {
        reason: reason.error ?? 'Please provide a revocation reason.',
      });
    }

    const now = new Date().toISOString();
    run(
      `UPDATE certificates
          SET status = 'revoked', revoked_at = ?, revocation_reason = ?
        WHERE certificate_id = ?`,
      [now, reason.value, certificateId],
    );

    res.json({ certificate: toAdminCertificate(loadCertificate(certificateId)) });
  }),
);
