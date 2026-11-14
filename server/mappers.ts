import { maskPhone } from './validation';
import type {
  ApplicationWithCertificate,
  CertificateRecord,
  ApplicationStatus,
} from './types';
import { config } from './config';

/** Shape returned to the applicant when tracking their own application. */
export function toTrackedApplication(row: ApplicationWithCertificate) {
  return {
    application_id: row.application_id,
    full_name: row.full_name,
    phone: row.phone,
    gender: row.gender,
    city: row.city,
    state: row.state,
    status: row.status as ApplicationStatus,
    remarks: row.remarks,
    created_at: row.created_at,
    updated_at: row.updated_at,
    reviewed_at: row.reviewed_at,
    certificate_id: row.certificate_id ?? null,
    certificate_status: row.certificate_status ?? null,
  };
}

/** Shape returned by the public certificate verification endpoint. */
export function toPublicCertificate(row: CertificateRecord) {
  return {
    certificate_id: row.certificate_id,
    application_id: row.application_id,
    full_name: row.full_name,
    masked_phone: maskPhone(row.phone),
    gender: row.gender,
    city: row.city,
    state: row.state,
    status: row.status,
    issued_at: row.issued_at,
    issued_by: row.issued_by,
    revoked_at: row.revoked_at,
    revocation_reason: row.revocation_reason,
    issuing_authority: config.issuer.authority,
    department: config.issuer.department,
  };
}

/** Full record for authenticated administrators. */
export function toAdminApplication(row: ApplicationWithCertificate) {
  return {
    ...row,
    status: row.status as ApplicationStatus,
    certificate_id: row.certificate_id ?? null,
    certificate_status: row.certificate_status ?? null,
    certificate_issued_at: row.certificate_issued_at ?? null,
  };
}

export function toAdminCertificate(row: CertificateRecord) {
  return { ...row };
}
