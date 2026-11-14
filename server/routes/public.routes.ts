import { Router } from 'express';
import { all, get, run } from '../db';
import { toPublicCertificate, toTrackedApplication } from '../mappers';
import type { ApplicationWithCertificate, CertificateRecord } from '../types';
import { ApiError, asyncHandler } from '../utils/http';
import { generateUniqueId } from '../utils/ids';
import { validateApplicationInput } from '../validation';

export const publicRouter = Router();

const APPLICATION_SELECT = `
  SELECT a.application_id, a.full_name, a.phone, a.gender, a.city, a.state,
         a.status, a.remarks, a.reviewed_by, a.reviewed_at, a.created_at, a.updated_at,
         c.certificate_id AS certificate_id,
         c.status         AS certificate_status,
         c.issued_at      AS certificate_issued_at
  FROM applications a
  LEFT JOIN certificates c ON c.application_id = a.application_id
`;

function applicationExists(applicationId: string): boolean {
  return Boolean(
    get<{ application_id: string }>('SELECT application_id FROM applications WHERE application_id = ?', [
      applicationId,
    ]),
  );
}

function certificateExists(certificateId: string): boolean {
  return Boolean(
    get<{ certificate_id: string }>('SELECT certificate_id FROM certificates WHERE certificate_id = ?', [
      certificateId,
    ]),
  );
}

/** POST /api/applications — submit a certificate request. */
publicRouter.post(
  '/applications',
  asyncHandler((req, res) => {
    const { value, errors } = validateApplicationInput(req.body);
    if (!value) {
      throw new ApiError(400, 'Please correct the highlighted fields and submit again.', errors);
    }

    const applicationId = generateUniqueId('APP', applicationExists);
    const now = new Date().toISOString();

    run(
      `INSERT INTO applications
         (application_id, full_name, phone, gender, city, state, status, remarks,
          reviewed_by, reviewed_at, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, 'pending', NULL, NULL, NULL, ?, ?)`,
      [
        applicationId,
        value.full_name,
        value.phone,
        value.gender,
        value.city,
        value.state,
        now,
        now,
      ],
    );

    const created = get<ApplicationWithCertificate>(
      `${APPLICATION_SELECT} WHERE a.application_id = ?`,
      [applicationId],
    );
    if (!created) throw new ApiError(500, 'The application could not be saved. Please try again.');

    res.status(201).json({ application: toTrackedApplication(created) });
  }),
);

/** GET /api/applications/:applicationId — track an application. */
publicRouter.get(
  '/applications/:applicationId',
  asyncHandler((req, res) => {
    const applicationId = String(req.params.applicationId ?? '').trim().toUpperCase();
    if (!applicationId) throw new ApiError(400, 'Enter the Application ID you received.');

    const application = get<ApplicationWithCertificate>(`${APPLICATION_SELECT} WHERE a.application_id = ?`, [
      applicationId,
    ]);
    if (!application) {
      throw new ApiError(
        404,
        `No application was found for ID "${applicationId}". Check the ID and try again.`,
      );
    }

    res.json({ application: toTrackedApplication(application) });
  }),
);

/** GET /api/certificates/:certificateId — public certificate verification. */
publicRouter.get(
  '/certificates/:certificateId',
  asyncHandler((req, res) => {
    const certificateId = String(req.params.certificateId ?? '').trim().toUpperCase();
    if (!certificateId) throw new ApiError(400, 'Enter the Certificate ID printed on the certificate.');

    const certificate = get<CertificateRecord>('SELECT * FROM certificates WHERE certificate_id = ?', [
      certificateId,
    ]);
    if (!certificate) {
      throw new ApiError(
        404,
        `Certificate ID "${certificateId}" was not found in the CredVault registry. This certificate is not genuine or the ID was entered incorrectly.`,
      );
    }

    res.json({ certificate: toPublicCertificate(certificate) });
  }),
);

/** GET /api/stats — aggregate registry figures for the home page. */
publicRouter.get(
  '/stats',
  asyncHandler((_req, res) => {
    const applications = get<{ total: number; approved: number }>(
      `SELECT COUNT(*) AS total,
              COALESCE(SUM(CASE WHEN status = 'approved' THEN 1 ELSE 0 END), 0) AS approved
       FROM applications`,
    );
    const certificates = get<{ total: number; valid: number }>(
      `SELECT COUNT(*) AS total,
              COALESCE(SUM(CASE WHEN status = 'valid' THEN 1 ELSE 0 END), 0) AS valid
       FROM certificates`,
    );

    res.json({
      stats: {
        applications: Number(applications?.total ?? 0),
        approved: Number(applications?.approved ?? 0),
        certificates: Number(certificates?.total ?? 0),
        valid: Number(certificates?.valid ?? 0),
      },
    });
  }),
);

// Keeps the unused-import checker honest about helpers used by the admin router.
export const registryHelpers = { applicationExists, certificateExists, all };
