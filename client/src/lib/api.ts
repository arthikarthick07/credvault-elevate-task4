import type {
  AdminApplication,
  AdminCertificate,
  AdminStats,
  AdminUser,
  Application,
  ApplicationPayload,
  PublicCertificate,
  PublicStats,
} from './types';

const BASE_URL = (import.meta.env.VITE_API_BASE_URL ?? '').replace(/\/+$/, '');

export class ApiError extends Error {
  readonly status: number;
  readonly fieldErrors: Record<string, string>;

  constructor(status: number, message: string, fieldErrors: Record<string, string> = {}) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.fieldErrors = fieldErrors;
  }
}

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PATCH';
  body?: unknown;
  token?: string | null;
}

interface ErrorPayload {
  error?: { message?: string; errors?: Record<string, string> };
}

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const headers: Record<string, string> = { Accept: 'application/json' };
  if (options.body !== undefined) headers['Content-Type'] = 'application/json';
  if (options.token) headers.Authorization = `Bearer ${options.token}`;

  let response: Response;
  try {
    response = await fetch(`${BASE_URL}${path}`, {
      method: options.method ?? 'GET',
      headers,
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
    });
  } catch {
    throw new ApiError(
      0,
      'Unable to reach the CredVault server. Check your connection and try again.',
    );
  }

  const text = await response.text();
  let payload: unknown = null;
  if (text) {
    try {
      payload = JSON.parse(text);
    } catch {
      payload = null;
    }
  }

  if (!response.ok) {
    const errorPayload = (payload ?? {}) as ErrorPayload;
    const message =
      errorPayload.error?.message ??
      (response.status === 401
        ? 'Your session has expired. Please sign in again.'
        : `Request failed with status ${response.status}.`);
    throw new ApiError(response.status, message, errorPayload.error?.errors ?? {});
  }

  return payload as T;
}

export const api = {
  submitApplication(payload: ApplicationPayload) {
    return request<{ application: Application }>('/api/applications', {
      method: 'POST',
      body: payload,
    });
  },

  trackApplication(applicationId: string) {
    return request<{ application: Application }>(
      `/api/applications/${encodeURIComponent(applicationId)}`,
    );
  },

  verifyCertificate(certificateId: string) {
    return request<{ certificate: PublicCertificate }>(
      `/api/certificates/${encodeURIComponent(certificateId)}`,
    );
  },

  publicStats() {
    return request<{ stats: PublicStats }>('/api/stats');
  },

  login(email: string, password: string) {
    return request<{ token: string; admin: AdminUser }>('/api/admin/login', {
      method: 'POST',
      body: { email, password },
    });
  },

  me(token: string) {
    return request<{ admin: AdminUser }>('/api/admin/me', { token });
  },

  stats(token: string) {
    return request<{ stats: AdminStats }>('/api/admin/stats', { token });
  },

  applications(token: string, params: { status?: string; q?: string } = {}) {
    const search = new URLSearchParams();
    if (params.status && params.status !== 'all') search.set('status', params.status);
    if (params.q) search.set('q', params.q);
    const suffix = search.toString() ? `?${search.toString()}` : '';
    return request<{ applications: AdminApplication[]; total: number }>(
      `/api/admin/applications${suffix}`,
      { token },
    );
  },

  application(token: string, applicationId: string) {
    return request<{ application: AdminApplication }>(
      `/api/admin/applications/${encodeURIComponent(applicationId)}`,
      { token },
    );
  },

  reviewApplication(
    token: string,
    applicationId: string,
    payload: { status: 'approved' | 'rejected'; remarks?: string },
  ) {
    return request<{ application: AdminApplication }>(
      `/api/admin/applications/${encodeURIComponent(applicationId)}`,
      { method: 'PATCH', body: payload, token },
    );
  },

  issueCertificate(token: string, applicationId: string) {
    return request<{ certificate: AdminCertificate; application: AdminApplication }>(
      `/api/admin/applications/${encodeURIComponent(applicationId)}/certificate`,
      { method: 'POST', token },
    );
  },

  certificates(token: string, params: { status?: string; q?: string } = {}) {
    const search = new URLSearchParams();
    if (params.status && params.status !== 'all') search.set('status', params.status);
    if (params.q) search.set('q', params.q);
    const suffix = search.toString() ? `?${search.toString()}` : '';
    return request<{ certificates: AdminCertificate[]; total: number }>(
      `/api/admin/certificates${suffix}`,
      { token },
    );
  },

  revokeCertificate(token: string, certificateId: string, reason: string) {
    return request<{ certificate: AdminCertificate }>(
      `/api/admin/certificates/${encodeURIComponent(certificateId)}/revoke`,
      { method: 'POST', body: { reason }, token },
    );
  },
};
