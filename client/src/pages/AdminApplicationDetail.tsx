import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import {
  Alert,
  Button,
  Card,
  DetailRow,
  Field,
  Modal,
  SectionHeading,
  Spinner,
  StatusBadge,
  Textarea,
} from '../components/ui';
import { api, ApiError } from '../lib/api';
import { formatDate, formatDateTime, formatGender } from '../lib/format';
import type { AdminApplication } from '../lib/types';

type Decision = 'approved' | 'rejected';

export function AdminApplicationDetail() {
  const { applicationId = '' } = useParams<{ applicationId: string }>();
  const { token, logout } = useAuth();
  const navigate = useNavigate();

  const [application, setApplication] = useState<AdminApplication | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const [decision, setDecision] = useState<Decision | null>(null);
  const [remarks, setRemarks] = useState('');
  const [modalError, setModalError] = useState<string | null>(null);

  const [issueOpen, setIssueOpen] = useState(false);

  const [revokeOpen, setRevokeOpen] = useState(false);
  const [revokeReason, setRevokeReason] = useState('');
  const [revokeError, setRevokeError] = useState<string | null>(null);

  const handleFailure = useCallback(
    (err: unknown) => {
      if (err instanceof ApiError && err.status === 401) {
        logout();
        navigate('/admin/login', { replace: true });
        return;
      }
      setError(err instanceof ApiError ? err.message : 'Something went wrong. Please try again.');
    },
    [logout, navigate],
  );

  const load = useCallback(async () => {
    if (!token || !applicationId) return;
    setLoading(true);
    setError(null);
    try {
      const result = await api.application(token, applicationId);
      setApplication(result.application);
    } catch (err) {
      handleFailure(err);
    } finally {
      setLoading(false);
    }
  }, [token, applicationId, handleFailure]);

  useEffect(() => {
    void load();
  }, [load]);

  const submitDecision = async () => {
    if (!token || !application || !decision) return;
    if (decision === 'rejected' && !remarks.trim()) {
      setModalError('A reason is required when rejecting an application.');
      return;
    }
    setBusy(true);
    setModalError(null);
    try {
      const result = await api.reviewApplication(token, application.application_id, {
        status: decision,
        remarks: remarks.trim() || undefined,
      });
      setApplication(result.application);
      setNotice(`Application ${decision === 'approved' ? 'approved' : 'rejected'}.`);
      setDecision(null);
      setRemarks('');
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        handleFailure(err);
        return;
      }
      setModalError(err instanceof ApiError ? err.message : 'Could not update this application.');
    } finally {
      setBusy(false);
    }
  };

  const submitIssue = async () => {
    if (!token || !application) return;
    setBusy(true);
    try {
      const result = await api.issueCertificate(token, application.application_id);
      setApplication(result.application);
      setNotice(`Certificate ${result.certificate.certificate_id} issued.`);
      setIssueOpen(false);
    } catch (err) {
      handleFailure(err);
      setIssueOpen(false);
    } finally {
      setBusy(false);
    }
  };

  const submitRevoke = async () => {
    if (!token || !application?.certificate_id) return;
    if (revokeReason.trim().length < 4) {
      setRevokeError('Provide a revocation reason of at least 4 characters.');
      return;
    }
    setBusy(true);
    setRevokeError(null);
    try {
      await api.revokeCertificate(token, application.certificate_id, revokeReason.trim());
      setRevokeOpen(false);
      setRevokeReason('');
      setNotice('Certificate revoked.');
      await load();
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        handleFailure(err);
        return;
      }
      setRevokeError(err instanceof ApiError ? err.message : 'Could not revoke this certificate.');
    } finally {
      setBusy(false);
    }
  };

  if (loading) {
    return (
      <Card className="p-6">
        <Spinner label="Loading application…" />
      </Card>
    );
  }

  if (!application) {
    return (
      <div className="space-y-4">
        <Alert variant="error" title="Application unavailable">
          {error ?? 'This application could not be loaded.'}
        </Alert>
        <Link to="/admin" className="text-sm font-semibold text-brand-700 hover:underline">
          ← Back to dashboard
        </Link>
      </div>
    );
  }

  const canReview = application.status === 'pending';
  const canIssue = application.status === 'approved' && !application.certificate_id;

  return (
    <div className="space-y-5">
      <Link to="/admin" className="text-sm font-semibold text-brand-700 hover:underline">
        ← Back to dashboard
      </Link>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <SectionHeading
          eyebrow="Application record"
          title={application.application_id}
          description={`Submitted ${formatDateTime(application.created_at)}`}
        />
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-slate-500 uppercase">Status</span>
          <StatusBadge status={application.status} />
        </div>
      </div>

      {notice ? (
        <Alert variant="success" title="Updated">
          {notice}
        </Alert>
      ) : null}
      {error ? (
        <Alert variant="error" title="Request failed">
          {error}
        </Alert>
      ) : null}

      <div className="grid gap-5 lg:grid-cols-[1.4fr_1fr]">
        <Card className="p-6">
          <h2 className="text-sm font-bold tracking-wide text-slate-500 uppercase">Applicant details</h2>
          <dl className="mt-2">
            <DetailRow label="Full name" value={application.full_name} />
            <DetailRow label="Phone number" value={application.phone} />
            <DetailRow label="Gender" value={formatGender(application.gender)} />
            <DetailRow label="City" value={application.city} />
            <DetailRow label="State" value={application.state} />
            <DetailRow label="Submitted" value={formatDateTime(application.created_at)} />
            <DetailRow label="Last updated" value={formatDateTime(application.updated_at)} />
            <DetailRow label="Reviewed on" value={formatDateTime(application.reviewed_at)} />
            <DetailRow label="Reviewed by" value={application.reviewed_by ?? '—'} />
            <DetailRow label="Reviewer remarks" value={application.remarks ?? '—'} />
          </dl>
        </Card>

        <div className="space-y-5">
          <Card className="p-6">
            <h2 className="text-sm font-bold tracking-wide text-slate-500 uppercase">Decision</h2>
            {canReview ? (
              <div className="mt-3 flex flex-col gap-2">
                <p className="text-sm text-slate-600">
                  This application is awaiting review. Approving makes it eligible for certificate issuance.
                </p>
                <Button
                  onClick={() => {
                    setRemarks('');
                    setModalError(null);
                    setDecision('approved');
                  }}
                >
                  Approve application
                </Button>
                <Button
                  variant="danger"
                  onClick={() => {
                    setRemarks('');
                    setModalError(null);
                    setDecision('rejected');
                  }}
                >
                  Reject application
                </Button>
              </div>
            ) : (
              <p className="mt-2 text-sm text-slate-600">
                A decision has already been recorded for this application. Review decisions are final for the
                purpose of this registry.
              </p>
            )}
          </Card>

          <Card className="p-6">
            <h2 className="text-sm font-bold tracking-wide text-slate-500 uppercase">Certificate</h2>
            {application.certificate_id ? (
              <div className="mt-3 space-y-3">
                <dl>
                  <DetailRow
                    label="Certificate ID"
                    value={<span className="font-mono">{application.certificate_id}</span>}
                  />
                  <DetailRow label="Status" value={<StatusBadge status={application.certificate_status ?? 'valid'} />} />
                  <DetailRow label="Issued on" value={formatDate(application.certificate_issued_at)} />
                </dl>
                <div className="flex flex-col gap-2">
                  <Link to={`/verify?id=${encodeURIComponent(application.certificate_id)}`}>
                    <Button variant="secondary" className="w-full">
                      Open public verification
                    </Button>
                  </Link>
                  {application.certificate_status === 'valid' ? (
                    <Button
                      variant="danger"
                      onClick={() => {
                        setRevokeReason('');
                        setRevokeError(null);
                        setRevokeOpen(true);
                      }}
                    >
                      Revoke certificate
                    </Button>
                  ) : null}
                </div>
              </div>
            ) : canIssue ? (
              <div className="mt-3 space-y-3">
                <p className="text-sm text-slate-600">
                  The application is approved and ready for issuance. A unique certificate ID will be generated
                  by the server.
                </p>
                <Button variant="gold" className="w-full" onClick={() => setIssueOpen(true)}>
                  Issue certificate
                </Button>
              </div>
            ) : (
              <p className="mt-2 text-sm text-slate-600">
                No certificate has been issued. Certificates can only be issued for approved applications.
              </p>
            )}
          </Card>
        </div>
      </div>

      <Modal
        open={decision !== null}
        title={decision === 'approved' ? 'Approve application' : 'Reject application'}
        description={`${application.application_id} · ${application.full_name}`}
        onClose={() => {
          setDecision(null);
          setModalError(null);
        }}
      >
        <div className="space-y-4">
          {modalError ? <Alert variant="error">{modalError}</Alert> : null}
          <Field
            label={decision === 'approved' ? 'Remarks (optional)' : 'Reason for rejection'}
            htmlFor="detail-remarks"
            required={decision === 'rejected'}
          >
            <Textarea
              id="detail-remarks"
              value={remarks}
              onChange={(event) => setRemarks(event.target.value)}
              maxLength={400}
              placeholder={
                decision === 'approved'
                  ? 'e.g. Details verified against department records.'
                  : 'e.g. Applicant details could not be verified.'
              }
            />
          </Field>
          <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
            <Button
              variant="secondary"
              disabled={busy}
              onClick={() => {
                setDecision(null);
                setModalError(null);
              }}
            >
              Cancel
            </Button>
            <Button
              variant={decision === 'approved' ? 'primary' : 'danger'}
              disabled={busy}
              onClick={() => void submitDecision()}
            >
              {busy ? 'Saving…' : decision === 'approved' ? 'Confirm approval' : 'Confirm rejection'}
            </Button>
          </div>
        </div>
      </Modal>

      <Modal
        open={issueOpen}
        title="Issue certificate"
        description={`${application.application_id} · ${application.full_name}`}
        onClose={() => setIssueOpen(false)}
      >
        <div className="space-y-4">
          <p className="text-sm text-slate-600">
            Confirm issuance to create a certificate for this approved applicant. The certificate becomes
            publicly verifiable immediately.
          </p>
          <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
            <Button variant="secondary" disabled={busy} onClick={() => setIssueOpen(false)}>
              Cancel
            </Button>
            <Button variant="gold" disabled={busy} onClick={() => void submitIssue()}>
              {busy ? 'Issuing…' : 'Issue certificate'}
            </Button>
          </div>
        </div>
      </Modal>

      <Modal
        open={revokeOpen}
        title="Revoke certificate"
        description={application.certificate_id ?? undefined}
        onClose={() => {
          setRevokeOpen(false);
          setRevokeError(null);
        }}
      >
        <div className="space-y-4">
          {revokeError ? <Alert variant="error">{revokeError}</Alert> : null}
          <Field label="Revocation reason" htmlFor="detail-revoke-reason" required>
            <Textarea
              id="detail-revoke-reason"
              value={revokeReason}
              onChange={(event) => setRevokeReason(event.target.value)}
              maxLength={400}
              placeholder="e.g. Certificate issued with incorrect holder details."
            />
          </Field>
          <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
            <Button
              variant="secondary"
              disabled={busy}
              onClick={() => {
                setRevokeOpen(false);
                setRevokeError(null);
              }}
            >
              Cancel
            </Button>
            <Button variant="danger" disabled={busy} onClick={() => void submitRevoke()}>
              {busy ? 'Revoking…' : 'Confirm revocation'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
