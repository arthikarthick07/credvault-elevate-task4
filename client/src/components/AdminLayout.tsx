import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { cx } from '../lib/cx';
import { ShieldEmblem } from './icons';
import { Button } from './ui';

export function AdminLayout() {
  const { admin, logout } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = () => {
    logout();
    navigate('/admin/login', { replace: true });
  };

  return (
    <div className="min-h-screen bg-[#f6f8fb]">
      <div className="tricolour-strip h-1 w-full" />
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <span className="rounded-md bg-brand-800 p-2 text-gold-400">
              <ShieldEmblem className="h-6 w-6" />
            </span>
            <div>
              <Link to="/admin" className="block text-base leading-tight font-extrabold text-brand-900">
                CredVault Administration
              </Link>
              <p className="text-[11px] font-medium text-slate-500">
                Signed in as {admin?.name ?? 'Administrator'} · {admin?.email ?? ''}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <nav className="flex items-center gap-1" aria-label="Admin">
              <NavLink
                to="/admin"
                end
                className={({ isActive }) =>
                  cx(
                    'rounded-md px-3 py-2 text-sm font-semibold transition-colors',
                    isActive ? 'bg-brand-50 text-brand-800' : 'text-slate-600 hover:bg-slate-100',
                  )
                }
              >
                Dashboard
              </NavLink>
              <Link
                to="/"
                className="rounded-md px-3 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100"
              >
                Public site
              </Link>
            </nav>
            <Button variant="secondary" size="sm" onClick={handleSignOut}>
              Sign out
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl px-4 py-8">
        <Outlet />
      </main>

      <footer className="border-t border-slate-200 bg-white py-4">
        <p className="mx-auto max-w-6xl px-4 text-xs text-slate-500">
          Authorised personnel only. All review and issuance actions are recorded against your administrator
          account.
        </p>
      </footer>
    </div>
  );
}
