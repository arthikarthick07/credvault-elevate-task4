import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Alert, Button, Card, DetailRow, Field, Input, SectionHeading, Spinner, StatusBadge } from '../components/ui';
import { BadgeCheckIcon } from '../components/icons';
import { api, ApiError } from '../lib/api';
import { formatDate, formatDateTime, formatGender } from '../lib/format';
import type { PublicCertificate } from '../lib/types';

export function VerifyCertificate() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [certificateId, setCertificateId] = useState(searchParams.get('id') ?? '');
  const [certificate, setCertificate] = useState<PublicCertificate | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [loading, setLoading] = useState(false);

  const lookup = async (rawId: string) => {
    const id = rawId.trim().toUpperCase();
    if (!id) {
      setError('Enter the certificate ID printed on the certificate.');
      setNotFound(false);
      setCertificate(null);
      return;
    }

    setLoading(true);
    setError(null);
    setNotFound(false);
    setCertificate(null);

    try {
      const result = await api.verifyCertificate(id);
      setCertificate(result.certificate);
    } catch (err) {
      if (err instanceof ApiError && err.status === 404) {
        setNotFound(true);
      } else {
        setError(
          err instanceof ApiError
            ? err.message
            : 'Unable to reach the registry. Please check your connection and try again.',
        );
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const id = searchParams.get('id');
    if (id) void lookup(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const id = certificateId.trim().toUpperCase();
    setSearchParams(id ? { id } : {});
    void lookup(id);
  };

  const isValid = certificate?.status === 'valid';

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <SectionHeading
        eyebrow="Certificate verification"
        title="Verify a certificate"
        description="Enter a certificate ID to confirm that it exists in the official CredVault registry, check the holder details and see whether the certificate is valid or has been revoked."
      />

      <Card className="p-6">
        <form onSubmit={handleSubmit} className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="flex-1">
            <Field
              label="Certificate ID"
              htmlFor="certificate_id"
              hint="Format: CERT-YYYY-XXXXXXX, for example CERT-2025-4QP8RT2."
            >
              <Input
                id="certificate_id"
                name="certificate_id"
                value={certificateId}
                onChange={(event) => setCertificateId(event.target.value)}
                placeholder="CERT-2025-XXXXXXX"
                autoComplete="off"
                spellCheck={false}
                className="font-mono tracking-wide uppercase"
                maxLength={24}
              />
            </Field>
          </div>
          <Button type="submit" size="lg" disabled={loading} className="sm:mb-[2px]">
            {loading ? 'Verifying…' : 'Verify certificate'}
          </Button>
        </form>
      </Card>

      {loading ? (
        <Card className="p-6">
          <Spinner label="Checking the registry…" />
        </Card>
      ) : null}

      {error ? (
        <Alert variant="error" title="Could not verify">
          {error}
        </Alert>
      ) : null}

      {notFound ? (
        <Alert variant="warning" title="Certificate not found">
          No certificate exists in the CredVault registry with the ID{' '}
          <span className="font-mono font-semibold">{certificateId.trim().toUpperCase()}</span>. The ID may be
          typed incorrectly, or the certificate may never have been issued. Please check the ID printed on the
          certificate and try again.
        </Alert>
      ) : null}

      {certificate ? (
        <Card className="overflow-hidden">
          <div
            className={
              isValid
                ? 'border-b border-emerald-200 bg-emerald-50 px-6 py-5'
                : 'border-b border-rose-200 bg-rose-50 px-6 py-5'
            }
          >
            <div className="flex items-start gap-3">
              <span
                className={
                  isValid
                    ? 'rounded-full bg-emerald-100 p-2 text-emerald-700'
                    : 'rounded-full bg-rose-100 p-2 text-rose-700'
                }
              >
                <BadgeCheckIcon className="h-6 w-6" />
              </span>
              <div>
                <p
                  className={
                    isValid
                      ? 'text-lg font-bold text-emerald-900'
                      : 'text-lg font-bold text-rose-900'
                  }
                  data-testid="verification-result"
                >
                  {isValid ? 'Certificate is valid' : 'Certificate has been revoked'}
                </p>
                <p className={isValid ? 'text-sm text-emerald-800' : 'text-sm text-rose-800'}>
                  {isValid
                    ? 'This certificate is recorded in the official registry and has not been revoked.'
                    : 'This certificate was issued by the department but has since been revoked and must not be relied upon.'}
                </p>
                <div className="mt-2">
                  <StatusBadge status={certificate.status} />
                </div>
              </div>
            </div>
          </div>

          <div className="px-6 py-4">
            <h2 className="text-sm font-bold tracking-wide text-slate-500 uppercase">Certificate details</h2>
            <dl className="mt-2">
              <DetailRow
                label="Certificate ID"
                value={<span className="font-mono">{certificate.certificate_id}</span>}
              />
              <DetailRow label="Certificate holder" value={certificate.full_name} />
              <DetailRow label="Gender" value={formatGender(certificate.gender)} />
              <DetailRow label="City / State" value={`${certificate.city}, ${certificate.state}`} />
              <DetailRow label="Application ID" value={<span className="font-mono">{certificate.application_id}</span>} />
              <DetailRow label="Issued on" value={formatDate(certificate.issued_at)} />
              <DetailRow label="Issuing authority" value={certificate.issuing_authority} />
              <DetailRow label="Department" value={certificate.department} />
              <DetailRow label="Registered phone" value={certificate.masked_phone} />
              {certificate.revoked_at ? (
                <DetailRow label="Revoked on" value={formatDateTime(certificate.revoked_at)} />
              ) : null}
              {certificate.revocation_reason ? (
                <DetailRow label="Revocation reason" value={certificate.revocation_reason} />
              ) : null}
            </dl>
          </div>

          <div className="border-t border-slate-200 bg-slate-50 px-6 py-3 text-xs text-slate-500">
            Verified against the live CredVault registry. Phone numbers are partially masked for privacy.
          </div>
        </Card>
      ) : null}
    </div>
  );
}
