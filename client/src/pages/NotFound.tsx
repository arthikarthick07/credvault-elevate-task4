import { Link } from 'react-router-dom';
import { Card } from '../components/ui';

export function NotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#f6f8fb] px-4">
      <Card className="max-w-md p-8 text-center">
        <p className="text-xs font-bold tracking-[0.2em] text-brand-600 uppercase">Error 404</p>
        <h1 className="mt-2 text-2xl font-bold text-brand-900">Page not found</h1>
        <p className="mt-2 text-sm text-slate-600">
          The page you requested is not part of the CredVault platform. Use the links below to continue.
        </p>
        <div className="mt-5 flex flex-col gap-2">
          <Link
            to="/"
            className="rounded-md border border-brand-700 bg-brand-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-800"
          >
            Return to home
          </Link>
          <Link
            to="/verify"
            className="rounded-md border border-brand-200 bg-white px-4 py-2.5 text-sm font-semibold text-brand-800 hover:bg-brand-50"
          >
            Verify a certificate
          </Link>
        </div>
      </Card>
    </div>
  );
}
