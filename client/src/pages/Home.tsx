import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRightIcon, BadgeCheckIcon, DocumentIcon, SearchIcon, ShieldEmblem } from '../components/icons';
import { Card, SectionHeading } from '../components/ui';
import { api } from '../lib/api';
import type { PublicStats } from '../lib/types';

const services = [
  {
    to: '/request',
    title: 'Request a certificate',
    description:
      'Submit your details once. CredVault issues a unique application ID you can use for every follow-up.',
    action: 'Start an application',
    icon: DocumentIcon,
  },
  {
    to: '/track',
    title: 'Track an application',
    description:
      'Enter your application ID to see the live status — pending, approved or rejected — and any reviewer remarks.',
    action: 'Check status',
    icon: SearchIcon,
  },
  {
    to: '/verify',
    title: 'Verify a certificate',
    description:
      'Employers and institutions can confirm a certificate ID against the official registry in seconds.',
    action: 'Verify now',
    icon: BadgeCheckIcon,
  },
];

const steps = [
  {
    step: '01',
    title: 'Submit your application',
    text: 'Provide your full name, phone number, gender, city and state. The registry generates your application ID.',
  },
  {
    step: '02',
    title: 'Department review',
    text: 'An authorised administrator reviews the application and records a decision with remarks.',
  },
  {
    step: '03',
    title: 'Certificate issued',
    text: 'Approved applications receive a certificate ID that is written to the registry immediately.',
  },
  {
    step: '04',
    title: 'Public verification',
    text: 'Anyone holding the certificate ID can confirm the holder details and validity, or see if it was revoked.',
  },
];

export function Home() {
  const [stats, setStats] = useState<PublicStats | null>(null);
  const [statsError, setStatsError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    api
      .publicStats()
      .then((result) => {
        if (!cancelled) setStats(result.stats);
      })
      .catch(() => {
        if (!cancelled) setStatsError(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const metric = (value: number | undefined) => (value === undefined ? '—' : value.toLocaleString('en-IN'));

  return (
    <div className="space-y-10">
      <section className="overflow-hidden rounded-xl border border-brand-200 bg-white shadow-sm">
        <div className="grid gap-8 p-6 sm:p-10 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
          <div>
            <p className="inline-flex items-center gap-2 rounded-full bg-brand-50 px-3 py-1 text-xs font-bold tracking-[0.14em] text-brand-700 uppercase">
              <ShieldEmblem className="h-4 w-4" />
              Official Certificate Registry
            </p>
            <h1 className="mt-4 text-4xl font-extrabold tracking-tight text-brand-900 sm:text-5xl">
              CredVault
            </h1>
            <p className="mt-2 text-lg font-semibold text-brand-700 sm:text-xl">
              Certificate Issuing &amp; Verification Platform
            </p>
            <p className="mt-4 max-w-xl text-sm leading-relaxed text-slate-600 sm:text-base">
              Apply for a certificate, follow your application through review, and let employers verify the
              result online. Every application and certificate is stored in the CredVault registry and issued
              with a unique identifier.
            </p>

            <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
              <Link
                to="/request"
                className="inline-flex items-center justify-center gap-2 rounded-md border border-brand-700 bg-brand-700 px-5 py-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-brand-800"
              >
                Request Certificate
                <ArrowRightIcon />
              </Link>
              <Link
                to="/track"
                className="inline-flex items-center justify-center gap-2 rounded-md border border-brand-200 bg-white px-5 py-3 text-sm font-semibold text-brand-800 shadow-sm transition-colors hover:bg-brand-50"
              >
                Track Application
              </Link>
              <Link
                to="/verify"
                className="inline-flex items-center justify-center gap-2 rounded-md border border-brand-200 bg-white px-5 py-3 text-sm font-semibold text-brand-800 shadow-sm transition-colors hover:bg-brand-50"
              >
                Verify Certificate
              </Link>
            </div>
          </div>

          <div className="rounded-lg border border-slate-200 bg-[#f9fbfd] p-5">
            <p className="text-xs font-bold tracking-[0.16em] text-slate-500 uppercase">Registry at a glance</p>
            <dl className="mt-4 grid grid-cols-2 gap-3">
              <div className="rounded-md border border-brand-100 bg-white p-3">
                <dt className="text-xs font-semibold text-slate-500">Applications</dt>
                <dd className="mt-1 text-2xl font-bold text-brand-900">
                  {statsError ? '—' : metric(stats?.applications)}
                </dd>
              </div>
              <div className="rounded-md border border-emerald-100 bg-white p-3">
                <dt className="text-xs font-semibold text-slate-500">Approved</dt>
                <dd className="mt-1 text-2xl font-bold text-emerald-700">
                  {statsError ? '—' : metric(stats?.approved)}
                </dd>
              </div>
              <div className="rounded-md border border-brand-100 bg-white p-3">
                <dt className="text-xs font-semibold text-slate-500">Certificates issued</dt>
                <dd className="mt-1 text-2xl font-bold text-brand-900">
                  {statsError ? '—' : metric(stats?.certificates)}
                </dd>
              </div>
              <div className="rounded-md border border-emerald-100 bg-white p-3">
                <dt className="text-xs font-semibold text-slate-500">Currently valid</dt>
                <dd className="mt-1 text-2xl font-bold text-emerald-700">
                  {statsError ? '—' : metric(stats?.valid)}
                </dd>
              </div>
            </dl>
            <p className="mt-4 text-xs text-slate-500">
              {statsError
                ? 'Registry totals are temporarily unavailable.'
                : 'Live counts read directly from the CredVault database.'}
            </p>
          </div>
        </div>
        <div className="tricolour-strip h-1 w-full" />
      </section>

      <section>
        <SectionHeading
          eyebrow="Services"
          title="Three things you can do here"
          description="CredVault covers the full certificate lifecycle: apply, follow up and verify — all against the same database."
        />
        <div className="mt-5 grid gap-4 md:grid-cols-3">
          {services.map(({ to, title, description, action, icon: Icon }) => (
            <Card key={to} className="flex flex-col p-5">
              <span className="inline-flex h-10 w-10 items-center justify-center rounded-md bg-brand-50 text-brand-700">
                <Icon className="h-5 w-5" />
              </span>
              <h3 className="mt-4 text-base font-bold text-brand-900">{title}</h3>
              <p className="mt-2 flex-1 text-sm leading-relaxed text-slate-600">{description}</p>
              <Link
                to={to}
                className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-brand-700 hover:text-brand-900"
              >
                {action}
                <ArrowRightIcon />
              </Link>
            </Card>
          ))}
        </div>
      </section>

      <section>
        <SectionHeading eyebrow="Process" title="How the certificate process works" />
        <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {steps.map((item) => (
            <div key={item.step} className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
              <span className="text-xs font-extrabold tracking-[0.2em] text-gold-600">{item.step}</span>
              <h3 className="mt-2 text-sm font-bold text-brand-900">{item.title}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-slate-600">{item.text}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-lg border border-brand-200 bg-brand-900 p-6 text-white sm:p-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-bold">Department staff</h2>
            <p className="mt-1 max-w-2xl text-sm text-brand-100">
              Administrators sign in with a password-protected account to review applications, issue
              certificates and revoke them when necessary. All administrative endpoints require a valid
              session token.
            </p>
          </div>
          <Link
            to="/admin/login"
            className="inline-flex shrink-0 items-center justify-center gap-2 rounded-md border border-gold-500 bg-gold-500 px-5 py-3 text-sm font-semibold text-brand-900 transition-colors hover:bg-gold-400"
          >
            Administrator sign in
          </Link>
        </div>
      </section>
    </div>
  );
}
