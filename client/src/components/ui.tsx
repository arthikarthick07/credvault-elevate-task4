import type {
  ButtonHTMLAttributes,
  InputHTMLAttributes,
  ReactNode,
  SelectHTMLAttributes,
  TextareaHTMLAttributes,
} from 'react';
import { cx } from '../lib/cx';
import { titleCase } from '../lib/format';

/* ------------------------------------------------------------------ button */

type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost' | 'gold';
type ButtonSize = 'sm' | 'md' | 'lg';

const buttonVariants: Record<ButtonVariant, string> = {
  primary:
    'bg-brand-700 text-white shadow-sm hover:bg-brand-800 active:bg-brand-900 border border-brand-700',
  secondary:
    'bg-white text-brand-800 border border-brand-200 shadow-sm hover:bg-brand-50 active:bg-brand-100',
  danger: 'bg-rose-700 text-white shadow-sm hover:bg-rose-800 border border-rose-700',
  ghost: 'bg-transparent text-brand-800 border border-transparent hover:bg-brand-50',
  gold: 'bg-gold-500 text-brand-900 shadow-sm hover:bg-gold-400 border border-gold-500',
};

const buttonSizes: Record<ButtonSize, string> = {
  sm: 'px-3 py-1.5 text-sm',
  md: 'px-4 py-2.5 text-sm',
  lg: 'px-6 py-3 text-base',
};

export function Button({
  variant = 'primary',
  size = 'md',
  className,
  type = 'button',
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: ButtonVariant; size?: ButtonSize }) {
  return (
    <button
      type={type}
      className={cx(
        'inline-flex items-center justify-center gap-2 rounded-md font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-60',
        buttonVariants[variant],
        buttonSizes[size],
        className,
      )}
      {...rest}
    />
  );
}

/* ------------------------------------------------------------------- cards */

export function Card({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <div
      className={cx(
        'rounded-lg border border-slate-200 bg-white shadow-sm shadow-slate-200/50',
        className,
      )}
    >
      {children}
    </div>
  );
}

export function SectionHeading({
  eyebrow,
  title,
  description,
  className,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  className?: string;
}) {
  return (
    <div className={cx('space-y-2', className)}>
      {eyebrow ? (
        <p className="text-xs font-bold tracking-[0.18em] text-brand-600 uppercase">{eyebrow}</p>
      ) : null}
      <h2 className="text-xl font-bold text-brand-900 sm:text-2xl">{title}</h2>
      {description ? <p className="max-w-3xl text-sm text-slate-600">{description}</p> : null}
    </div>
  );
}

/* ------------------------------------------------------------------ badges */

const statusStyles: Record<string, string> = {
  pending: 'bg-amber-50 text-amber-800 ring-amber-200',
  approved: 'bg-emerald-50 text-emerald-800 ring-emerald-200',
  rejected: 'bg-rose-50 text-rose-800 ring-rose-200',
  valid: 'bg-emerald-50 text-emerald-800 ring-emerald-200',
  revoked: 'bg-rose-50 text-rose-800 ring-rose-200',
};

export function StatusBadge({ status, className }: { status: string; className?: string }) {
  const key = status.toLowerCase();
  return (
    <span
      className={cx(
        'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset',
        statusStyles[key] ?? 'bg-slate-100 text-slate-700 ring-slate-200',
        className,
      )}
    >
      <span
        className={cx(
          'h-1.5 w-1.5 rounded-full',
          key === 'pending' && 'bg-amber-500',
          (key === 'approved' || key === 'valid') && 'bg-emerald-500',
          (key === 'rejected' || key === 'revoked') && 'bg-rose-500',
          !['pending', 'approved', 'valid', 'rejected', 'revoked'].includes(key) && 'bg-slate-400',
        )}
      />
      {titleCase(status)}
    </span>
  );
}

/* ------------------------------------------------------------------ alerts */

type AlertVariant = 'info' | 'success' | 'error' | 'warning';

const alertStyles: Record<AlertVariant, string> = {
  info: 'border-brand-200 bg-brand-50 text-brand-900',
  success: 'border-emerald-200 bg-emerald-50 text-emerald-900',
  error: 'border-rose-200 bg-rose-50 text-rose-900',
  warning: 'border-amber-200 bg-amber-50 text-amber-900',
};

export function Alert({
  variant = 'info',
  title,
  children,
}: {
  variant?: AlertVariant;
  title?: string;
  children: ReactNode;
}) {
  return (
    <div
      role={variant === 'error' ? 'alert' : 'status'}
      className={cx('rounded-md border px-4 py-3 text-sm', alertStyles[variant])}
    >
      {title ? <p className="font-semibold">{title}</p> : null}
      <div className={title ? 'mt-1' : undefined}>{children}</div>
    </div>
  );
}

/* ------------------------------------------------------------------ fields */

export function Field({
  label,
  htmlFor,
  error,
  hint,
  required,
  children,
}: {
  label: string;
  htmlFor: string;
  error?: string;
  hint?: string;
  required?: boolean;
  children: ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={htmlFor} className="block text-sm font-semibold text-slate-700">
        {label}
        {required ? <span className="ml-0.5 text-rose-600">*</span> : null}
      </label>
      {children}
      {error ? (
        <p className="text-xs font-medium text-rose-700">{error}</p>
      ) : hint ? (
        <p className="text-xs text-slate-500">{hint}</p>
      ) : null}
    </div>
  );
}

const controlBase =
  'w-full rounded-md border bg-white px-3 py-2.5 text-sm text-slate-900 shadow-sm transition-colors placeholder:text-slate-400 focus:outline-none focus:ring-2 disabled:bg-slate-50 disabled:text-slate-500';

export function Input({ className, invalid, ...rest }: InputHTMLAttributes<HTMLInputElement> & { invalid?: boolean }) {
  return (
    <input
      className={cx(
        controlBase,
        invalid
          ? 'border-rose-400 focus:border-rose-500 focus:ring-rose-200'
          : 'border-slate-300 focus:border-brand-500 focus:ring-brand-200',
        className,
      )}
      aria-invalid={invalid ? true : undefined}
      {...rest}
    />
  );
}

export function Select({
  className,
  invalid,
  children,
  ...rest
}: SelectHTMLAttributes<HTMLSelectElement> & { invalid?: boolean }) {
  return (
    <select
      className={cx(
        controlBase,
        'appearance-none bg-[length:16px] bg-[right_0.75rem_center] bg-no-repeat pr-9',
        invalid
          ? 'border-rose-400 focus:border-rose-500 focus:ring-rose-200'
          : 'border-slate-300 focus:border-brand-500 focus:ring-brand-200',
        className,
      )}
      style={{
        backgroundImage:
          "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 20 20' fill='%2364748b'%3E%3Cpath d='M5.5 7.5L10 12l4.5-4.5'/%3E%3C/svg%3E\")",
      }}
      aria-invalid={invalid ? true : undefined}
      {...rest}
    >
      {children}
    </select>
  );
}

export function Textarea({
  className,
  invalid,
  ...rest
}: TextareaHTMLAttributes<HTMLTextAreaElement> & { invalid?: boolean }) {
  return (
    <textarea
      className={cx(
        controlBase,
        'min-h-[96px] resize-y',
        invalid
          ? 'border-rose-400 focus:border-rose-500 focus:ring-rose-200'
          : 'border-slate-300 focus:border-brand-500 focus:ring-brand-200',
        className,
      )}
      aria-invalid={invalid ? true : undefined}
      {...rest}
    />
  );
}

/* --------------------------------------------------------------- data bits */

export function DetailRow({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5 border-b border-slate-100 py-2.5 last:border-b-0 sm:flex-row sm:items-baseline sm:justify-between sm:gap-6">
      <dt className="text-xs font-semibold tracking-wide text-slate-500 uppercase">{label}</dt>
      <dd className="text-sm font-medium break-words text-slate-900 sm:text-right">{value}</dd>
    </div>
  );
}

export function StatCard({
  label,
  value,
  tone = 'brand',
  hint,
}: {
  label: string;
  value: number | string;
  tone?: 'brand' | 'amber' | 'emerald' | 'rose';
  hint?: string;
}) {
  const tones: Record<string, string> = {
    brand: 'border-brand-200 bg-brand-50 text-brand-900',
    amber: 'border-amber-200 bg-amber-50 text-amber-900',
    emerald: 'border-emerald-200 bg-emerald-50 text-emerald-900',
    rose: 'border-rose-200 bg-rose-50 text-rose-900',
  };
  return (
    <div className={cx('rounded-lg border p-4', tones[tone])}>
      <p className="text-xs font-bold tracking-[0.14em] uppercase opacity-80">{label}</p>
      <p className="mt-1 text-2xl font-bold">{value}</p>
      {hint ? <p className="mt-0.5 text-xs opacity-75">{hint}</p> : null}
    </div>
  );
}

export function Spinner({ label = 'Loading…' }: { label?: string }) {
  return (
    <div className="flex items-center gap-2 text-sm text-slate-600" role="status">
      <span className="h-4 w-4 animate-spin rounded-full border-2 border-brand-300 border-t-brand-700" />
      {label}
    </div>
  );
}

export function EmptyState({ title, description }: { title: string; description?: string }) {
  return (
    <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 px-6 py-10 text-center">
      <p className="text-sm font-semibold text-slate-700">{title}</p>
      {description ? <p className="mt-1 text-sm text-slate-500">{description}</p> : null}
    </div>
  );
}

/* ------------------------------------------------------------------- modal */

export function Modal({
  open,
  title,
  description,
  onClose,
  children,
}: {
  open: boolean;
  title: string;
  description?: string;
  onClose: () => void;
  children: ReactNode;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/50 p-4 sm:items-center">
      <div
        className="w-full max-w-lg rounded-lg border border-slate-200 bg-white shadow-xl"
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-5 py-4">
          <div>
            <h3 className="text-base font-bold text-brand-900">{title}</h3>
            {description ? <p className="mt-1 text-sm text-slate-600">{description}</p> : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close dialog"
            className="rounded-md p-1 text-slate-500 hover:bg-slate-100 hover:text-slate-700"
          >
            <svg viewBox="0 0 20 20" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
              <path d="M5 5l10 10M15 5L5 15" strokeLinecap="round" />
            </svg>
          </button>
        </div>
        <div className="px-5 py-4">{children}</div>
      </div>
    </div>
  );
}
