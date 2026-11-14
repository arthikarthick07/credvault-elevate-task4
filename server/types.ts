export type ApplicationStatus = 'pending' | 'approved' | 'rejected';
export type CertificateStatus = 'valid' | 'revoked';

export interface AdminRecord {
  id: number;
  email: string;
  name: string;
  created_at: string;
}

export interface ApplicationRecord {
  application_id: string;
  full_name: string;
  phone: string;
  gender: string;
  city: string;
  state: string;
  status: ApplicationStatus;
  remarks: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface CertificateRecord {
  certificate_id: string;
  application_id: string;
  full_name: string;
  phone: string;
  gender: string;
  city: string;
  state: string;
  status: CertificateStatus;
  issued_by: string;
  issued_at: string;
  revoked_at: string | null;
  revocation_reason: string | null;
}

export interface ApplicationWithCertificate extends ApplicationRecord {
  certificate_id: string | null;
  certificate_status: CertificateStatus | null;
  certificate_issued_at: string | null;
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      admin?: AdminRecord;
    }
  }
}
