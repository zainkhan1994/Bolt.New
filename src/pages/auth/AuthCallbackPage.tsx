import { useEffect, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { useAuth } from '@/lib/auth';
import { AuthLayout } from '@/layouts/AuthLayout';
import { Alert, Spinner } from '@/components/ui';

/** Target of the email-verification link. */
export function AuthCallbackPage() {
  const { session, loading } = useAuth();
  const [timedOut, setTimedOut] = useState(false);
  const urlError = new URLSearchParams(window.location.search).get('error_description')
    ?? new URLSearchParams(window.location.hash.slice(1)).get('error_description');

  useEffect(() => {
    const t = window.setTimeout(() => setTimedOut(true), 8000);
    return () => window.clearTimeout(t);
  }, []);

  if (session && !loading) return <Navigate to="/app" replace />;

  if (urlError || timedOut) {
    return (
      <AuthLayout title="We couldn't verify that link">
        <Alert tone="error">
          {urlError ?? 'The link may have expired or was already used.'}{' '}
          <Link to="/login" className="underline">Return to sign in</Link>.
        </Alert>
      </AuthLayout>
    );
  }

  return <Spinner label="Verifying your email…" />;
}
