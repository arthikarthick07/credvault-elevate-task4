import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { ShieldEmblem } from '../components/icons';
import { Alert, Button, Card, Field, Input } from '../components/ui';
import { ApiError } from '../lib/api';

export function AdminLogin() {
  const { token, ready, login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const redirectTo = (location.state as { from?: string } | null)?.from ?? '/admin';

  useEffect(() => {
    if (ready && token) navigate(redirectTo, { replace: true });
  }, [ready, token, navigate, redirectTo]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    if (!email.trim() || !password) {
      setError('Enter both your administrator email and password.');
      return;
    }

    setSubmitting(true);
    try {
      await login(email.trim(), password);
      navigate(redirectTo, { replace: true });
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : 'Unable to sign in right now. Please check your connection and try again.',
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-[#f6f8fb]">
      <div className="tricolour-strip h-1 w-full" />
      <div className="flex flex-1 items-center justify-center px-4 py-10">
        <div className="w-full max-w-md space-y-5">
          <div className="flex flex-col items-center text-center">
            <span className="rounded-lg bg-brand-800 p-3 text-gold-400">
              <ShieldEmblem className="h-8 w-8" />
            </span>
            <h1 className="mt-3 text-2xl font-extrabold tracking-tight text-brand-900">
              CredVault Administration
            </h1>
            <p className="mt-1 text-sm text-slate-600">
              Authorised department staff sign in to review applications and manage certificates.
            </p>
          </div>

          <Card className="p-6">
            <form onSubmit={handleSubmit} className="space-y-4" noValidate>
              {error ? (
                <Alert variant="error" title="Sign in failed">
                  {error}
                </Alert>
              ) : null}

              <Field label="Administrator email" htmlFor="email" required>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="name@department.gov"
                  autoComplete="username"
                  spellCheck={false}
                  maxLength={120}
                />
              </Field>

              <Field label="Password" htmlFor="password" required>
                <Input
                  id="password"
                  name="password"
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="Enter your password"
                  autoComplete="current-password"
                  maxLength={200}
                />
              </Field>

              <Button type="submit" size="lg" className="w-full" disabled={submitting}>
                {submitting ? 'Signing in…' : 'Sign in'}
              </Button>
            </form>

            <p className="mt-4 border-t border-slate-200 pt-4 text-xs text-slate-500">
              Administrator accounts are provisioned on the server through environment variables. Passwords are
              stored as bcrypt hashes and every administrative request is authorised with a signed session
              token.
            </p>
          </Card>

          <p className="text-center text-sm">
            <Link to="/" className="font-semibold text-brand-700 hover:text-brand-900 hover:underline">
              ← Back to the public site
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
