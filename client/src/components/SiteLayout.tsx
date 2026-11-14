import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';
import { cx } from '../lib/cx';
import { ShieldEmblem } from './icons';

const navItems = [
  { to: '/', label: 'Home', end: true },
  { to: '/request', label: 'Request Certificate' },
  { to: '/track', label: 'Track Application' },
  { to: '/verify', label: 'Verify Certificate' },
];

export function SiteLayout() {
  const location = useLocation();

  return (
    <div className="flex min-h-screen flex-col bg-[#f6f8fb]">
      <div className="tricolour-strip h-1 w-full" />
      <div className="border-b border-brand-900/10 bg-brand-900 text-white">
        <div className="mx-auto flex max-w-6xl flex-col gap-1 px-4 py-1.5 text-[11px] tracking-wide sm:flex-row sm:items-center sm:justify-between sm:text-xs">
          <p className="font-medium">CredVault · Department of Skill Certification &amp; Verification</p>
          <p className="text-brand-100/80">Secure digital certificate registry</p>
        </div>
      </div>

      <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <Link to="/" className="flex items-center gap-3">
            <span className="rounded-md bg-brand-800 p-2 text-gold-400">
              <ShieldEmblem className="h-7 w-7" />
            </span>
            <span>
              <span className="block text-lg leading-tight font-extrabold tracking-tight text-brand-900">
                CredVault
              </span>
              <span className="block text-[11px] leading-tight font-medium text-slate-500">
                Certificate Issuing &amp; Verification Platform
              </span>
            </span>
          </Link>

          <nav className="flex flex-wrap items-center gap-1" aria-label="Primary">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  cx(
                    'rounded-md px-3 py-2 text-sm font-semibold transition-colors',
                    isActive
                      ? 'bg-brand-50 text-brand-800'
                      : 'text-slate-600 hover:bg-slate-100 hover:text-brand-800',
                  )
                }
              >
                {item.label}
              </NavLink>
            ))}
            <Link
              to="/admin"
              className={cx(
                'ml-1 rounded-md border px-3 py-2 text-sm font-semibold transition-colors',
                location.pathname.startsWith('/admin')
                  ? 'border-brand-700 bg-brand-700 text-white'
                  : 'border-brand-200 text-brand-800 hover:bg-brand-50',
              )}
            >
              Admin
            </Link>
          </nav>
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:py-10">
        <Outlet />
      </main>

      <footer className="mt-8 border-t border-slate-200 bg-white">
        <div className="mx-auto grid max-w-6xl gap-6 px-4 py-8 text-sm sm:grid-cols-3">
          <div>
            <div className="flex items-center gap-2 text-brand-900">
              <ShieldEmblem className="h-5 w-5" />
              <span className="font-bold">CredVault</span>
            </div>
            <p className="mt-2 text-slate-600">
              A single registry for certificate applications, issuance and public verification.
            </p>
          </div>
          <div>
            <p className="text-xs font-bold tracking-[0.16em] text-slate-500 uppercase">Services</p>
            <ul className="mt-2 space-y-1.5 text-slate-600">
              <li>
                <Link to="/request" className="hover:text-brand-700 hover:underline">
                  Request a certificate
                </Link>
              </li>
              <li>
                <Link to="/track" className="hover:text-brand-700 hover:underline">
                  Track an application
                </Link>
              </li>
              <li>
                <Link to="/verify" className="hover:text-brand-700 hover:underline">
                  Verify a certificate
                </Link>
              </li>
            </ul>
          </div>
          <div>
            <p className="text-xs font-bold tracking-[0.16em] text-slate-500 uppercase">Access</p>
            <ul className="mt-2 space-y-1.5 text-slate-600">
              <li>
                <Link to="/admin/login" className="hover:text-brand-700 hover:underline">
                  Administrator sign in
                </Link>
              </li>
              <li className="text-slate-500">Records are reviewed by authorised staff only.</li>
            </ul>
          </div>
        </div>
        <div className="tricolour-strip h-1 w-full" />
        <div className="mx-auto max-w-6xl px-4 py-4 text-xs text-slate-500">
          © {new Date().getFullYear()} CredVault. Built as an ELEVATE Software Development Engineer internship
          project — a demonstration of a certificate issuing and verification service.
        </div>
      </footer>
    </div>
  );
}
