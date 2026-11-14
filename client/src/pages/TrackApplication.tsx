import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Alert, Button, Card, DetailRow, Field, Input, SectionHeading, Spinner, StatusBadge } from '../components/ui';
import { api, ApiError } from '../lib/api';
import { formatDateTime, formatGender } from '../lib/format';
import type { Application } from '../lib/types';
import { cx } from '../lib/cx';

const timeline = [
  { key: 'submitted', label: 'Application submitted' },
  { key: 'review', label: 'Department review' },
  { key: 'issued', label: 'Certificate issued' },
];

export function TrackApplication() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [applicationId, setApplicationId] = useState(searchParams.get('id') ?? '');
  const [application, setApplication] = useState<Application | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  const lookup = async (rawId: string) => {
    const id = rawId.trim().toUpperCase();
    if (!id) {
      setError('Enter the application ID you received when you submitted the form.');
      setNotFound(false);
      setApplication(null);
      return;
    }

    setLoading(true);
    setError(null);
    setNotFound(false);
    setApplication(null);
    setSearched(true);

    try {
      const result = await api.trackApplication(id);
      setApplication(result.application);
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

  // Support deep links such as /track?id=APP-2025-ABC123
  useEffect(() => {
    const id = searchParams.get('id');
    if (id) void lookup(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const id = applicationId.trim().toUpperCase();
    setSearchParams(id ? { id } : {});
    void lookup(id);
  };

  const stageIndex = !application
    ? -1
    : application.status === 'approved'
      ? 2
      : application.status === 'rejected'
        ? 1
        : 0;

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <SectionHeading
        eyebrow="Application tracking"
        title="Track your application"
        description="Enter the application ID issued when you submitted your request to see the current status and details held in the registry."
      />

      <Card className="p-6">
        <form onSubmit={handleSubmit} className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="flex-1">
            <Field
              label="Application ID"
              htmlFor="application_id"
              hint="Format: APP-YYYY-XXXXXX, for example APP-2025-7K4M9Q."
            >
              <Input
                id="application_id"
                name="application_id"
                value={applicationId}
                onChange={(event) => setApplicationId(event.target.value)}
                placeholder="APP-2025-XXXXXX"
                autoComplete="off"
                spellCheck={false}
                className="font-mono tracking-wide uppercase"
                maxLength={24}
              />
            </Field>
          </div>
          <Button type="submit" size="lg" disabled={loading} className="sm:mb-[2px]">
            {loading ? 'Searching…' : 'Track application'}
          </Button>
        </form>
      </Card>

      {loading ? (
        <Card className="p-6">
          <Spinner label="Looking up your application…" />
        </Card>
      ) : null}

      {error ? (
        <Alert variant="error" title="Could not search">
          {error}
        </Alert>
      ) : null}

      {notFound ? (
        <Alert variant="warning" title="No application found">
          No application exists with the ID <span className="font-mono font-semibold">{applicationId.trim().toUpperCase()}</span>.
          Check the ID and try again, or{' '}
          <Link to="/request" className="font-semibold underline">
            submit a new application
          </Link>
          .
        </Alert>
      ) : null}

      {application ? (
        <div className="space-y-5">
          <Card className="overflow-hidden">
            <div className="flex flex-col gap-3 border-b border-slate-200 bg-slate-50 px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-xs font-semibold tracking-wide text-slate-500 uppercase">Application ID</p>
                <p className="font-mono text-lg font-bold tracking-wide text-brand-900">
                  {application.application_id}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-slate-500 uppercase">Status</span>
                <StatusBadge status={application.status} />
              </div>
            </div>

            <div className="px-6 py-4">
              <h2 className="text-sm font-bold tracking-wide text-slate-500 uppercase">Application details</h2>
              <dl className="mt-2">
                <DetailRow label="Full name" value={application.full_name} />
                <DetailRow label="Phone number" value={application.phone} />
                <DetailRow label="Gender" value={formatGender(application.gender)} />
                <DetailRow label="City" value={application.city} />
                <DetailRow label="State" value={application.state} />
                <DetailRow label="Submitted on" value={formatDateTime(application.created_at)} />
                <DetailRow label="Last updated" value={formatDateTime(application.updated_at)} />
                {application.reviewed_at ? (
                  <DetailRow label="Reviewed on" value={formatDateTime(application.reviewed_at)} />
                ) : null}
                {application.remarks ? <DetailRow label="Reviewer remarks" value={application.remarks} /> : null}
              </dl>
            </div>

            <div className="border-t border-slate-200 px-6 py-4">
              <h2 className="text-sm font-bold tracking-wide text-slate-500 uppercase">Progress</h2>
              <ol className="mt-3 space-y-3">
                {timeline.map((item, index) => {
                  const reached = stageIndex >= index;
                  const isRejectedAtReview = application.status === 'rejected' && index === 1;
                  return (
                    <li key={item.key} className="flex items-start gap-3">
                      <span
                        className={cx(
                          'mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[11px] font-bold',
                          isRejectedAtReview
                            ? 'bg-rose-100 text-rose-700 ring-1 ring-rose-300'
                            : reached
                              ? 'bg-emerald-100 text-emerald-700 ring-1 ring-emerald-300'
                              : 'bg-slate-100 text-slate-400 ring-1 ring-slate-200',
                        )}
                      >
                        {isRejectedAtReview ? '×' : reached ? '✓' : index + 1}
                      </span>
                      <div>
                        <p
                          className={cx(
                            'text-sm font-semibold',
                            reached ? 'text-slate-900' : 'text-slate-400',
                          )}
                        >
                          {item.label}
                          {isRejectedAtReview ? ' — rejected' : ''}
                        </p>
                        {index === 0 ? (
                          <p className="text-xs text-slate-500">{formatDateTime(application.created_at)}</p>
                        ) : null}
                        {index === 1 && application.reviewed_at ? (
                          <p className="text-xs text-slate-500">{formatDateTime(application.reviewed_at)}</p>
                        ) : null}
                        {index === 1 && application.status === 'pending' ? (
                          <p className="text-xs text-slate-500">Awaiting an administrator decision.</p>
                        ) : null}
                        {index === 2 && application.certificate_id ? (
                          <p className="text-xs text-slate-500">
                            Certificate {application.certificate_id}
                          </p>
                        ) : null}
                        {index === 2 && !application.certificate_id ? (
                          <p className="text-xs text-slate-500">
                            {application.status === 'approved'
                              ? 'Approved — the certificate is being prepared by the department.'
                              : 'Available once your application is approved.'}
                          </p>
                        ) : null}
                      </div>
                    </li>
                  );
                })}
              </ol>
            </div>
          </Card>

          {application.certificate_id ? (
            <Card className="border-emerald-200 p-6">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-xs font-bold tracking-[0.16em] text-emerald-700 uppercase">
                    Certificate issued
                  </p>
                  <p className="mt-1 font-mono text-lg font-bold text-slate-900">
                    {application.certificate_id}
                  </p>
                  <p className="mt-1 text-sm text-slate-600">
                    Status: <StatusBadge status={application.certificate_status ?? 'valid'} />
                  </p>
                </div>
                <Link to={`/verify?id=${encodeURIComponent(application.certificate_id)}`}>
                  <Button variant="secondary">Verify certificate</Button>
                </Link>
              </div>
            </Card>
          ) : null}

          <p className="text-xs text-slate-500">
            {searched ? 'Results are read live from the CredVault registry.' : null}
          </p>
        </div>
      ) : null}
    </div>
  );
}
