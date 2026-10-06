import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '@/lib/auth';
import { Spinner } from '@/components/ui';

/** Requires a signed-in user; otherwise redirects to /login and returns here afterwards. */
export function ProtectedRoute() {
  const { session, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Spinner />
      </div>
    );
  }

  if (!session) {
    const redirect = `${location.pathname}${location.search}`;
    return <Navigate to={`/login?redirect=${encodeURIComponent(redirect)}`} replace />;
  }

  return <Outlet />;
}

/** For /login, /signup etc.: signed-in users are sent to the dashboard. */
export function GuestRoute() {
  const { session, loading } = useAuth();
  const location = useLocation();
  if (loading) return null;
  if (session) {
    const redirect = new URLSearchParams(location.search).get('redirect');
    return <Navigate to={redirect && redirect.startsWith('/') && !redirect.startsWith('//') ? redirect : '/app'} replace />;
  }
  return <Outlet />;
}
