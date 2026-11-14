import { useState } from 'react';
import type { FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { Alert, Button, Card, Field, Input, SectionHeading, Select } from '../components/ui';
import { api, ApiError } from '../lib/api';
import type { Application, ApplicationPayload } from '../lib/types';
import { formatDateTime } from '../lib/format';

const INDIAN_STATES = [
  'Andhra Pradesh',
  'Arunachal Pradesh',
  'Assam',
  'Bihar',
  'Chhattisgarh',
  'Delhi',
  'Goa',
  'Gujarat',
  'Haryana',
  'Himachal Pradesh',
  'Jharkhand',
  'Karnataka',
  'Kerala',
  'Madhya Pradesh',
  'Maharashtra',
  'Manipur',
  'Meghalaya',
  'Mizoram',
  'Nagaland',
  'Odisha',
  'Punjab',
  'Rajasthan',
  'Sikkim',
  'Tamil Nadu',
  'Telangana',
  'Tripura',
  'Uttar Pradesh',
  'Uttarakhand',
  'West Bengal',
  'Chandigarh',
  'Jammu and Kashmir',
  'Ladakh',
  'Puducherry',
];

type FormState = {
  full_name: string;
  phone: string;
  gender: string;
  city: string;
  state: string;
};

const emptyForm: FormState = { full_name: '', phone: '', gender: '', city: '', state: '' };

function validate(form: FormState): Record<string, string> {
  const errors: Record<string, string> = {};
  const name = form.full_name.trim();
  if (!name) errors.full_name = 'Full name is required.';
  else if (name.length < 3) errors.full_name = 'Enter at least 3 characters.';
  else if (!/^[A-Za-z\u00C0-\u024F][A-Za-z\u00C0-\u024F .'-]*$/.test(name))
    errors.full_name = 'Use letters, spaces, apostrophes, hyphens or dots only.';

  const digits = form.phone.replace(/\D/g, '');
  if (!form.phone.trim()) errors.phone = 'Phone number is required.';
  else if (digits.length === 12 && digits.startsWith('91')) {
    if (!/^[6-9]\d{9}$/.test(digits.slice(2))) errors.phone = 'Enter a valid 10-digit Indian mobile number.';
  } else if (digits.length === 10) {
    if (!/^[6-9]\d{9}$/.test(digits)) errors.phone = 'Enter a valid 10-digit Indian mobile number.';
  } else {
    errors.phone = 'Enter a 10-digit mobile number, optionally with +91.';
  }

  if (!form.gender) errors.gender = 'Select a gender.';
  if (!form.city.trim()) errors.city = 'City is required.';
  else if (form.city.trim().length < 2) errors.city = 'Enter at least 2 characters.';
  if (!form.state.trim()) errors.state = 'State is required.';

  return errors;
}

export function RequestCertificate() {
  const [form, setForm] = useState<FormState>(emptyForm);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [created, setCreated] = useState<Application | null>(null);
  const [copied, setCopied] = useState(false);

  const update = (field: keyof FormState) => (value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => {
      if (!prev[field]) return prev;
      const next = { ...prev };
      delete next[field];
      return next;
    });
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormError(null);
    const clientErrors = validate(form);
    if (Object.keys(clientErrors).length > 0) {
      setErrors(clientErrors);
      return;
    }

    const payload: ApplicationPayload = {
      full_name: form.full_name.trim(),
      phone: form.phone.trim(),
      gender: form.gender,
      city: form.city.trim(),
      state: form.state.trim(),
    };

    setSubmitting(true);
    try {
      const result = await api.submitApplication(payload);
      setCreated(result.application);
      setForm(emptyForm);
      setErrors({});
    } catch (error) {
      if (error instanceof ApiError) {
        setErrors(error.fieldErrors);
        setFormError(error.message);
      } else {
        setFormError('Something went wrong while submitting the application. Please try again.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const copyId = async () => {
    if (!created) return;
    try {
      await navigator.clipboard.writeText(created.application_id);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2500);
    } catch {
      setCopied(false);
    }
  };

  if (created) {
    return (
      <div className="mx-auto max-w-2xl space-y-5">
        <Card className="overflow-hidden">
          <div role="status" aria-live="polite" className="border-b border-emerald-200 bg-emerald-50 px-6 py-5">
            <h1 className="text-xl font-bold text-emerald-900">Application submitted</h1>
            <p className="mt-1 text-sm font-semibold text-emerald-800">Your application is pending review</p>
            <p className="mt-1 text-sm text-emerald-800">
              Keep this application ID safe. You need it to track the status of your certificate request.
            </p>
          </div>
          <div className="space-y-4 px-6 py-6">
            <div>
              <p className="text-xs font-semibold tracking-wide text-slate-500 uppercase">Application ID</p>
              <div className="mt-1 flex flex-col gap-2 sm:flex-row sm:items-center">
                <p
                  data-testid="application-id"
                  className="rounded-md border border-brand-200 bg-brand-50 px-4 py-2.5 font-mono text-lg font-bold tracking-wider text-brand-900"
                >
                  {created.application_id}
                </p>
                <Button variant="secondary" size="sm" onClick={copyId}>
                  {copied ? 'Copied' : 'Copy ID'}
                </Button>
              </div>
            </div>

            <dl className="grid gap-x-6 gap-y-3 text-sm sm:grid-cols-2">
              <div>
                <dt className="text-xs font-semibold text-slate-500 uppercase">Applicant</dt>
                <dd className="font-medium text-slate-900">{created.full_name}</dd>
              </div>
              <div>
                <dt className="text-xs font-semibold text-slate-500 uppercase">Submitted</dt>
                <dd className="font-medium text-slate-900">{formatDateTime(created.created_at)}</dd>
              </div>
              <div>
                <dt className="text-xs font-semibold text-slate-500 uppercase">Location</dt>
                <dd className="font-medium text-slate-900">
                  {created.city}, {created.state}
                </dd>
              </div>
              <div>
                <dt className="text-xs font-semibold text-slate-500 uppercase">Status</dt>
                <dd className="font-medium text-slate-900">Pending</dd>
              </div>
            </dl>

            <div className="flex flex-col gap-2 border-t border-slate-200 pt-4 sm:flex-row">
              <Link to={`/track?id=${encodeURIComponent(created.application_id)}`} className="sm:flex-1">
                <Button className="w-full">Track this application</Button>
              </Link>
              <Button variant="secondary" className="sm:flex-1" onClick={() => setCreated(null)}>
                Submit another application
              </Button>
            </div>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <SectionHeading
        eyebrow="Certificate request"
        title="Apply for a certificate"
        description="Complete the form below. The registry stores your application and returns a unique application ID that you can use to track its progress."
      />

      <Card className="p-6">
        <form onSubmit={handleSubmit} noValidate className="space-y-5">
          {formError ? (
            <Alert variant="error" title="Application not submitted">
              {formError}
            </Alert>
          ) : null}

          <Field label="Full name" htmlFor="full_name" required error={errors.full_name} hint="As it should appear on the certificate.">
            <Input
              id="full_name"
              name="full_name"
              value={form.full_name}
              onChange={(event) => update('full_name')(event.target.value)}
              invalid={Boolean(errors.full_name)}
              placeholder="e.g. Ananya Sharma"
              autoComplete="name"
              maxLength={80}
            />
          </Field>

          <div className="grid gap-5 sm:grid-cols-2">
            <Field
              label="Phone number"
              htmlFor="phone"
              required
              error={errors.phone}
              hint="10-digit mobile number. +91 is accepted."
            >
              <Input
                id="phone"
                name="phone"
                type="tel"
                value={form.phone}
                onChange={(event) => update('phone')(event.target.value)}
                invalid={Boolean(errors.phone)}
                placeholder="9876543210"
                autoComplete="tel"
                inputMode="tel"
                maxLength={16}
              />
            </Field>

            <Field label="Gender" htmlFor="gender" required error={errors.gender}>
              <Select
                id="gender"
                name="gender"
                value={form.gender}
                onChange={(event) => update('gender')(event.target.value)}
                invalid={Boolean(errors.gender)}
              >
                <option value="">Select gender</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="other">Other</option>
              </Select>
            </Field>
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            <Field label="City" htmlFor="city" required error={errors.city}>
              <Input
                id="city"
                name="city"
                value={form.city}
                onChange={(event) => update('city')(event.target.value)}
                invalid={Boolean(errors.city)}
                placeholder="e.g. Pune"
                autoComplete="address-level2"
                maxLength={60}
              />
            </Field>

            <Field label="State" htmlFor="state" required error={errors.state}>
              <Input
                id="state"
                name="state"
                list="state-options"
                value={form.state}
                onChange={(event) => update('state')(event.target.value)}
                invalid={Boolean(errors.state)}
                placeholder="e.g. Maharashtra"
                autoComplete="address-level1"
                maxLength={60}
              />
              <datalist id="state-options">
                {INDIAN_STATES.map((state) => (
                  <option key={state} value={state} />
                ))}
              </datalist>
            </Field>
          </div>

          <div className="rounded-md border border-brand-100 bg-brand-50 px-4 py-3 text-xs text-brand-900">
            Your application ID is generated by the CredVault server after your details are saved. Applications
            start in <strong>pending</strong> status and are reviewed by department staff.
          </div>

          <div className="flex flex-col gap-2 border-t border-slate-200 pt-5 sm:flex-row sm:justify-end">
            <Button type="submit" size="lg" disabled={submitting}>
              {submitting ? 'Submitting…' : 'Submit application'}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
