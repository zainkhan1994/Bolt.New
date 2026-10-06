import { useState, type FormEvent } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/lib/auth';
import { AuthLayout } from '@/layouts/AuthLayout';
import { Alert, Button, Field, Input } from '@/components/ui';

// Only rendered in development or when VITE_SHOW_DEMO_ACCOUNTS=true. These accounts exist
// only in supabase/seed.sql, which is never applied to production.
const showDemoAccounts = import.meta.env.DEV || import.meta.env.VITE_SHOW_DEMO_ACCOUNTS === 'true';
const DEMO_PASSWORD = 'CommunityHub!2026';
const demoAccounts = [
  { label: 'Northstar · Admin', email: 'admin@northstar.test' },
  { label: 'Northstar · Editor', email: 'editor@northstar.test' },
  { label: 'Northstar · Viewer', email: 'viewer@northstar.test' },
  { label: 'Riverside · Admin', email: 'admin@riverside.test' },
  { label: 'Riverside · Editor', email: 'editor@riverside.test' },
  { label: 'Super Admin', email: 'super@communityhub.test' },
];

function safeRedirect(value: string | null): string {
  return value && value.startsWith('/') && !value.startsWith('//') ? value : '/app';
}

export function SignInPage() {
  const { signIn } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    const result = await signIn(email.trim(), password);
    setSubmitting(false);
    if (result.error) {
      setError(result.error === 'Email not confirmed' ? 'Please verify your email address before signing in. Check your inbox for the confirmation link.' : result.error);
      return;
    }
    navigate(safeRedirect(params.get('redirect')), { replace: true });
  };

  return (
    <AuthLayout
      title="Sign in to your dashboard"
      subtitle="Staff access for CommunityHub organizations."
      footer={
        <>
          New to CommunityHub?{' '}
          <Link to="/signup" className="font-medium text-brand-700 hover:text-brand-800">Create an account</Link>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-5" noValidate>
        {params.get('reset') === 'success' && <Alert tone="success">Your password was updated. Sign in with your new password.</Alert>}
        {error && <Alert tone="error" title="Sign-in failed"><span data-testid="login-error">{error}</span></Alert>}
        <Field label="Email address">
          {(id) => (
            <Input id={id} type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} data-testid="email-input" />
          )}
        </Field>
        <Field label="Password">
          {(id) => (
            <Input id={id} type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} data-testid="password-input" />
          )}
        </Field>
        <div className="flex justify-end">
          <Link to="/forgot-password" className="text-sm font-medium text-brand-700 hover:text-brand-800">Forgot password?</Link>
        </div>
        <Button type="submit" className="w-full" loading={submitting} disabled={!email || !password} data-testid="sign-in-button">
          Sign in
        </Button>
      </form>
      {showDemoAccounts && (
        <div className="mt-8 rounded-xl border border-dashed border-slate-300 p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Demo accounts (local seed data)</p>
          <div className="mt-3 grid grid-cols-2 gap-2">
            {demoAccounts.map((a) => (
              <button
                key={a.email}
                type="button"
                onClick={() => {
                  setEmail(a.email);
                  setPassword(DEMO_PASSWORD);
                }}
                className="rounded-lg bg-white px-3 py-2 text-left text-xs ring-1 ring-slate-200 hover:ring-brand-400"
              >
                <span className="block font-medium text-slate-800">{a.label}</span>
                <span className="block truncate text-slate-500">{a.email}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </AuthLayout>
  );
}
