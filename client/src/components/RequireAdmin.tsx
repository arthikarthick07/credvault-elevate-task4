import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { Spinner } from './ui';

/** Blocks the admin area until a valid JWT has been confirmed by the backend. */
export function RequireAdmin() {
  const { token, ready } = useAuth();
  const location = useLocation();

  if (!ready) {
    return (
      <div className="mx-auto flex min-h-screen max-w-6xl items-center justify-center px-4">
        <Spinner label="Checking your session…" />
      </div>
    );
  }

  if (!token) {
    return <Navigate to="/admin/login" replace state={{ from: location.pathname }} />;
  }

  return <Outlet />;
}
