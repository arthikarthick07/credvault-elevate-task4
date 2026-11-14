export type ApplicationStatus = 'pending' | 'approved' | 'rejected';
export type CertificateStatus = 'valid' | 'revoked';

export interface Application {
  application_id: string;
  full_name: string;
  phone: string;
  gender: string;
  city: string;
  state: string;
  status: ApplicationStatus;
  remarks: string | null;
  created_at: string;
  updated_at: string;
  reviewed_at: string | null;
  certificate_id: string | null;
  certificate_status: CertificateStatus | null;
}

export interface AdminApplication extends Application {
  reviewed_by: string | null;
  certificate_issued_at: string | null;
}

export interface Certificate {
  certificate_id: string;
  application_id: string;
  full_name: string;
  gender: string;
  city: string;
  state: string;
  status: CertificateStatus;
  issued_at: string;
  revoked_at: string | null;
  revocation_reason: string | null;
}

export interface PublicCertificate extends Certificate {
  masked_phone: string;
  issuing_authority: string;
  department: string;
}

export interface AdminCertificate extends Certificate {
  phone: string;
  issued_by: string;
}

export interface AdminUser {
  email: string;
  name: string;
}

export interface AdminStats {
  applications: { total: number; pending: number; approved: number; rejected: number };
  certificates: { total: number; valid: number; revoked: number };
}

export interface PublicStats {
  applications: number;
  approved: number;
  certificates: number;
  valid: number;
}

export interface ApplicationPayload {
  full_name: string;
  phone: string;
  gender: string;
  city: string;
  state: string;
}
