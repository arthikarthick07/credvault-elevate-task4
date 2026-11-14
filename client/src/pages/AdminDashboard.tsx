import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { PlusIcon, SearchIcon } from '../components/icons';
import {
  Alert,
  Button,
  Card,
  EmptyState,
  Field,
  Input,
  Modal,
  SectionHeading,
  Select,
  Spinner,
  StatCard,
  StatusBadge,
  Textarea,
} from '../components/ui';
import { api, ApiError } from '../lib/api';
import { cx } from '../lib/cx';
import { formatDate, formatDateTime, formatGender } from '../lib/format';
import type { AdminApplication, AdminCertificate, AdminStats } from '../lib/types';

type Tab = 'applications' | 'certificates';
type Decision = 'approved' | 'rejected';

const applicationFilters = [
  { value: 'all', label: 'All statuses' },
  { value: 'pending', label: 'Pending' },
  { value: 'approved', label: 'Approved' },
  { value: 'rejected', label: 'Rejected' },
];

const certificateFilters = [
  { value: 'all', label: 'All statuses' },
  { value: 'valid', label: 'Valid' },
  { value: 'revoked', label: 'Revoked' },
];

export function AdminDashboard() {
  const { token, logout } = useAuth();
  const navigate = useNavigate();

  const [tab, setTab] = useState<Tab>('applications');
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [applications, setApplications] = useState<AdminApplication[]>([]);
  const [certificates, setCertificates] = useState<AdminCertificate[]>([]);
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const [reviewTarget, setReviewTarget] = useState<{ application: AdminApplication; decision: Decision } | null>(
    null,
  );
  const [remarks, setRemarks] = useState('');
  const [reviewError, setReviewError] = useState<string | null>(null);

  const [issueTarget, setIssueTarget] = useState<AdminApplication | null>(null);

  const [revokeTarget, setRevokeTarget] = useState<AdminCertificate | null>(null);
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

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedQuery(query.trim()), 300);
    return () => window.clearTimeout(timer);
  }, [query]);

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const statsResult = await api.stats(token);
      setStats(statsResult.stats);
      if (tab === 'applications') {
        const result = await api.applications(token, { status: statusFilter, q: debouncedQuery });
        setApplications(result.applications);
      } else {
        const result = await api.certificates(token, { status: statusFilter, q: debouncedQuery });
        setCertificates(result.certificates);
      }
    } catch (err) {
      handleFailure(err);
    } finally {
      setLoading(false);
    }
  }, [token, tab, statusFilter, debouncedQuery, handleFailure]);

  useEffect(() => {
    void load();
  }, [load]);

  const switchTab = (next: Tab) => {
    setTab(next);
    setStatusFilter('all');
    setQuery('');
    setNotice(null);
  };

  const submitReview = async () => {
    if (!token || !reviewTarget) return;
    const { application, decision } = reviewTarget;
    if (decision === 'rejected' && !remarks.trim()) {
      setReviewError('A reason is required when rejecting an application.');
      return;
    }

    setBusy(true);
    setReviewError(null);
    try {
      await api.reviewApplication(token, application.application_id, {
        status: decision,
        remarks: remarks.trim() || undefined,
      });
      setNotice(
        `${application.application_id} has been ${decision === 'approved' ? 'approved' : 'rejected'}.`,
      );
      setReviewTarget(null);
      setRemarks('');
      await load();
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        handleFailure(err);
        return;
      }
      setReviewError(err instanceof ApiError ? err.message : 'Could not update this application.');
    } finally {
      setBusy(false);
    }
  };

  const confirmIssue = async () => {
    if (!token || !issueTarget) return;
    setBusy(true);
    try {
      const result = await api.issueCertificate(token, issueTarget.application_id);
      setNotice(
        `Certificate ${result.certificate.certificate_id} issued to ${result.certificate.full_name}.`,
      );
      setIssueTarget(null);
      await load();
    } catch (err) {
      handleFailure(err);
      setIssueTarget(null);
    } finally {
      setBusy(false);
    }
  };

  const confirmRevoke = async () => {
    if (!token || !revokeTarget) return;
    if (revokeReason.trim().length < 4) {
      setRevokeError('Provide a revocation reason of at least 4 characters.');
      return;
    }

    setBusy(true);
    setRevokeError(null);
    try {
      await api.revokeCertificate(token, revokeTarget.certificate_id, revokeReason.trim());
      setNotice(`Certificate ${revokeTarget.certificate_id} has been revoked.`);
      setRevokeTarget(null);
      setRevokeReason('');
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

  const filters = tab === 'applications' ? applicationFilters : certificateFilters;
  const total = tab === 'applications' ? applications.length : certificates.length;

  const statsCards = useMemo(
    () => [
      { label: 'Applications', value: stats?.applications.total ?? '—', tone: 'brand' as const },
      { label: 'Pending review', value: stats?.applications.pending ?? '—', tone: 'amber' as const },
      { label: 'Approved', value: stats?.applications.approved ?? '—', tone: 'emerald' as const },
      { label: 'Rejected', value: stats?.applications.rejected ?? '—', tone: 'rose' as const },
      { label: 'Certificates', value: stats?.certificates.total ?? '—', tone: 'brand' as const },
      { label: 'Valid', value: stats?.certificates.valid ?? '—', tone: 'emerald' as const },
      { label: 'Revoked', value: stats?.certificates.revoked ?? '—', tone: 'rose' as const },
    ],
    [stats],
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <SectionHeading
          eyebrow="Administration"
          title="Certificate registry dashboard"
          description="Review applications, issue certificates for approved applicants and revoke certificates that must no longer be honoured."
        />
        <Button variant="secondary" size="sm" onClick={() => void load()} disabled={loading}>
          {loading ? 'Refreshing…' : 'Refresh'}
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
        {statsCards.map((card) => (
          <StatCard key={card.label} label={card.label} value={card.value} tone={card.tone} />
        ))}
      </div>

      {notice ? (
        <Alert variant="success" title="Done">
          {notice}
        </Alert>
      ) : null}

      {error ? (
        <Alert variant="error" title="Request failed">
          {error}
        </Alert>
      ) : null}

      <Card>
        <div className="flex flex-col gap-3 border-b border-slate-200 p-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="flex gap-1 rounded-md bg-slate-100 p-1" role="tablist" aria-label="Registry records">
            <button
              type="button"
              role="tab"
              aria-selected={tab === 'applications'}
              onClick={() => switchTab('applications')}
              className={cx(
                'rounded px-3 py-1.5 text-sm font-semibold transition-colors',
                tab === 'applications' ? 'bg-white text-brand-800 shadow-sm' : 'text-slate-600',
              )}
            >
              Applications
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={tab === 'certificates'}
              onClick={() => switchTab('certificates')}
              className={cx(
                'rounded px-3 py-1.5 text-sm font-semibold transition-colors',
                tab === 'certificates' ? 'bg-white text-brand-800 shadow-sm' : 'text-slate-600',
              )}
            >
              Certificates
            </button>
          </div>

          <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_180px] lg:w-[520px]">
            <div className="relative">
              <span className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-slate-400">
                <SearchIcon className="h-4 w-4" />
              </span>
              <Input
                aria-label="Search records"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder={
                  tab === 'applications'
                    ? 'Search ID, name, phone, city or state'
                    : 'Search certificate ID, name or application ID'
                }
                className="pl-9"
              />
            </div>
            <Select
              aria-label="Filter by status"
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
            >
              {filters.map((filter) => (
                <option key={filter.value} value={filter.value}>
                  {filter.label}
                </option>
              ))}
            </Select>
          </div>
        </div>

        {loading ? (
          <div className="p-6">
            <Spinner label="Loading records…" />
          </div>
        ) : tab === 'applications' ? (
          applications.length === 0 ? (
            <div className="p-4">
              <EmptyState
                title="No applications match this view"
                description="Adjust the search text or status filter, or wait for new applications to arrive."
              />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[860px] text-left text-sm">
                <thead className="bg-slate-50 text-xs font-semibold tracking-wide text-slate-500 uppercase">
                  <tr>
                    <th className="px-4 py-3">Application</th>
                    <th className="px-4 py-3">Applicant</th>
                    <th className="px-4 py-3">Location</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Submitted</th>
                    <th className="px-4 py-3">Certificate</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {applications.map((application) => (
                    <tr key={application.application_id} className="align-top hover:bg-slate-50/70">
                      <td className="px-4 py-3">
                        <Link
                          to={`/admin/applications/${encodeURIComponent(application.application_id)}`}
                          className="font-mono text-xs font-bold text-brand-800 hover:underline"
                        >
                          {application.application_id}
                        </Link>
                      </td>
                      <td className="px-4 py-3">
                        <p className="font-semibold text-slate-900">{application.full_name}</p>
                        <p className="text-xs text-slate-500">
                          {application.phone} · {formatGender(application.gender)}
                        </p>
                      </td>
                      <td className="px-4 py-3 text-slate-700">
                        {application.city}
                        <span className="block text-xs text-slate-500">{application.state}</span>
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge status={application.status} />
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-600">
                        {formatDateTime(application.created_at)}
                      </td>
                      <td className="px-4 py-3 text-xs">
                        {application.certificate_id ? (
                          <span className="font-mono text-slate-800">{application.certificate_id}</span>
                        ) : (
                          <span className="text-slate-400">Not issued</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap justify-end gap-1.5">
                          {application.status === 'pending' ? (
                            <>
                              <Button
                                size="sm"
                                onClick={() => {
                                  setRemarks('');
                                  setReviewError(null);
                                  setReviewTarget({ application, decision: 'approved' });
                                }}
                              >
                                Approve
                              </Button>
                              <Button
                                size="sm"
                                variant="danger"
                                onClick={() => {
                                  setRemarks('');
                                  setReviewError(null);
                                  setReviewTarget({ application, decision: 'rejected' });
                                }}
                              >
                                Reject
                              </Button>
                            </>
                          ) : null}
                          {application.status === 'approved' && !application.certificate_id ? (
                            <Button size="sm" variant="gold" onClick={() => setIssueTarget(application)}>
                              <PlusIcon className="h-4 w-4" />
                              Issue
                            </Button>
                          ) : null}
                          <Link
                            to={`/admin/applications/${encodeURIComponent(application.application_id)}`}
                            className="inline-flex items-center rounded-md border border-brand-200 px-3 py-1.5 text-sm font-semibold text-brand-800 hover:bg-brand-50"
                          >
                            View
                          </Link>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        ) : certificates.length === 0 ? (
          <div className="p-4">
            <EmptyState
              title="No certificates match this view"
              description="Certificates appear here once an approved application has been issued a certificate."
            />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[860px] text-left text-sm">
              <thead className="bg-slate-50 text-xs font-semibold tracking-wide text-slate-500 uppercase">
                <tr>
                  <th className="px-4 py-3">Certificate</th>
                  <th className="px-4 py-3">Holder</th>
                  <th className="px-4 py-3">Application</th>
                  <th className="px-4 py-3">Issued</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {certificates.map((certificate) => (
                  <tr key={certificate.certificate_id} className="align-top hover:bg-slate-50/70">
                    <td className="px-4 py-3">
                      <p className="font-mono text-xs font-bold text-brand-800">
                        {certificate.certificate_id}
                      </p>
                      <p className="text-xs text-slate-500">by {certificate.issued_by}</p>
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-semibold text-slate-900">{certificate.full_name}</p>
                      <p className="text-xs text-slate-500">
                        {certificate.city}, {certificate.state}
                      </p>
                    </td>
                    <td className="px-4 py-3">
                      <Link
                        to={`/admin/applications/${encodeURIComponent(certificate.application_id)}`}
                        className="font-mono text-xs text-brand-700 hover:underline"
                      >
                        {certificate.application_id}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-600">{formatDate(certificate.issued_at)}</td>
                    <td className="px-4 py-3">
                      <StatusBadge status={certificate.status} />
                      {certificate.revocation_reason ? (
                        <p className="mt-1 max-w-[180px] text-xs text-slate-500">
                          {certificate.revocation_reason}
                        </p>
                      ) : null}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap justify-end gap-1.5">
                        <Link
                          to={`/verify?id=${encodeURIComponent(certificate.certificate_id)}`}
                          className="inline-flex items-center rounded-md border border-brand-200 px-3 py-1.5 text-sm font-semibold text-brand-800 hover:bg-brand-50"
                        >
                          Verify
                        </Link>
                        {certificate.status === 'valid' ? (
                          <Button
                            size="sm"
                            variant="danger"
                            onClick={() => {
                              setRevokeReason('');
                              setRevokeError(null);
                              setRevokeTarget(certificate);
                            }}
                          >
                            Revoke
                          </Button>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="border-t border-slate-200 px-4 py-3 text-xs text-slate-500">
          Showing {total} {tab === 'applications' ? 'application' : 'certificate'}
          {total === 1 ? '' : 's'}
          {statusFilter !== 'all' ? ` · filtered by ${statusFilter}` : ''}
          {debouncedQuery ? ` · search "${debouncedQuery}"` : ''}
        </div>
      </Card>

      {/* Approve / reject confirmation */}
      <Modal
        open={reviewTarget !== null}
        title={
          reviewTarget?.decision === 'approved' ? 'Approve application' : 'Reject application'
        }
        description={
          reviewTarget
            ? `${reviewTarget.application.application_id} · ${reviewTarget.application.full_name}`
            : undefined
        }
        onClose={() => {
          setReviewTarget(null);
          setReviewError(null);
        }}
      >
        <div className="space-y-4">
          {reviewTarget?.decision === 'approved' ? (
            <p className="text-sm text-slate-600">
              Approving makes this application eligible for certificate issuance. You can then issue a
              certificate from the dashboard.
            </p>
          ) : (
            <p className="text-sm text-slate-600">
              Rejecting closes the application. The applicant will see the rejected status and your reason when
              tracking it.
            </p>
          )}

          {reviewError ? <Alert variant="error">{reviewError}</Alert> : null}

          <Field
            label={reviewTarget?.decision === 'approved' ? 'Remarks (optional)' : 'Reason for rejection'}
            htmlFor="review-remarks"
            required={reviewTarget?.decision === 'rejected'}
          >
            <Textarea
              id="review-remarks"
              value={remarks}
              onChange={(event) => setRemarks(event.target.value)}
              placeholder={
                reviewTarget?.decision === 'approved'
                  ? 'e.g. Documents verified against department records.'
                  : 'e.g. Submitted details could not be verified.'
              }
              maxLength={400}
            />
          </Field>

          <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
            <Button
              variant="secondary"
              onClick={() => {
                setReviewTarget(null);
                setReviewError(null);
              }}
              disabled={busy}
            >
              Cancel
            </Button>
            <Button
              variant={reviewTarget?.decision === 'approved' ? 'primary' : 'danger'}
              onClick={() => void submitReview()}
              disabled={busy}
            >
              {busy
                ? 'Saving…'
                : reviewTarget?.decision === 'approved'
                  ? 'Confirm approval'
                  : 'Confirm rejection'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Issue certificate */}
      <Modal
        open={issueTarget !== null}
        title="Issue certificate"
        description={issueTarget ? `${issueTarget.application_id} · ${issueTarget.full_name}` : undefined}
        onClose={() => setIssueTarget(null)}
      >
        <div className="space-y-4">
          <p className="text-sm text-slate-600">
            A unique certificate ID will be generated by the server and recorded against this application. The
            certificate becomes publicly verifiable immediately.
          </p>
          {issueTarget ? (
            <dl className="rounded-md border border-slate-200 bg-slate-50 px-4 py-3 text-sm">
              <div className="flex justify-between gap-4 py-0.5">
                <dt className="text-slate-500">Holder</dt>
                <dd className="font-medium text-slate-900">{issueTarget.full_name}</dd>
              </div>
              <div className="flex justify-between gap-4 py-0.5">
                <dt className="text-slate-500">Location</dt>
                <dd className="font-medium text-slate-900">
                  {issueTarget.city}, {issueTarget.state}
                </dd>
              </div>
              <div className="flex justify-between gap-4 py-0.5">
                <dt className="text-slate-500">Reviewed</dt>
                <dd className="font-medium text-slate-900">{formatDateTime(issueTarget.reviewed_at)}</dd>
              </div>
            </dl>
          ) : null}
          <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
            <Button variant="secondary" onClick={() => setIssueTarget(null)} disabled={busy}>
              Cancel
            </Button>
            <Button variant="gold" onClick={() => void confirmIssue()} disabled={busy}>
              {busy ? 'Issuing…' : 'Issue certificate'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Revoke certificate */}
      <Modal
        open={revokeTarget !== null}
        title="Revoke certificate"
        description={revokeTarget ? revokeTarget.certificate_id : undefined}
        onClose={() => {
          setRevokeTarget(null);
          setRevokeError(null);
        }}
      >
        <div className="space-y-4">
          <p className="text-sm text-slate-600">
            Revoking is permanent for verification purposes: anyone verifying this certificate will see the
            revoked status and your reason.
          </p>
          {revokeError ? <Alert variant="error">{revokeError}</Alert> : null}
          <Field label="Revocation reason" htmlFor="revoke-reason" required>
            <Textarea
              id="revoke-reason"
              value={revokeReason}
              onChange={(event) => setRevokeReason(event.target.value)}
              placeholder="e.g. Issued on the basis of incorrect applicant details."
              maxLength={400}
            />
          </Field>
          <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
            <Button
              variant="secondary"
              onClick={() => {
                setRevokeTarget(null);
                setRevokeError(null);
              }}
              disabled={busy}
            >
              Cancel
            </Button>
            <Button variant="danger" onClick={() => void confirmRevoke()} disabled={busy}>
              {busy ? 'Revoking…' : 'Confirm revocation'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
