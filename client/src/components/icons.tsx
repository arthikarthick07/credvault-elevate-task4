export function ShieldEmblem({ className = 'h-8 w-8' }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden="true">
      <path
        d="M16 3l10 4v9.5c0 6.2-4.2 11.4-10 12.5C10.2 27.9 6 22.7 6 16.5V7l10-4z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
      />
      <path
        d="M11.6 15.6l3 3 5.8-6"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function DocumentIcon({ className = 'h-5 w-5' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true">
      <path d="M7 3.75h7l4 4V20.25H7z" strokeLinejoin="round" />
      <path d="M13.5 3.9V8h4.2M9.5 12.5h6M9.5 16h4" strokeLinecap="round" />
    </svg>
  );
}

export function SearchIcon({ className = 'h-5 w-5' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <circle cx="11" cy="11" r="6.25" />
      <path d="M15.6 15.6L20 20" strokeLinecap="round" />
    </svg>
  );
}

export function BadgeCheckIcon({ className = 'h-5 w-5' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true">
      <path d="M12 3l2.2 1.7 2.7-.3 1 2.6 2.3 1.5-.9 2.6.9 2.6-2.3 1.5-1 2.6-2.7-.3L12 21l-2.2-1.7-2.7.3-1-2.6L3.8 15.5l.9-2.6-.9-2.6L6.1 8.8l1-2.6 2.7.3z" strokeLinejoin="round" />
      <path d="M8.8 12.2l2.3 2.3 4.2-4.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function PlusIcon({ className = 'h-5 w-5' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.9" aria-hidden="true">
      <path d="M12 5v14M5 12h14" strokeLinecap="round" />
    </svg>
  );
}

export function ArrowRightIcon({ className = 'h-4 w-4' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <path d="M5 12h13M13 6.5l5.5 5.5L13 17.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
