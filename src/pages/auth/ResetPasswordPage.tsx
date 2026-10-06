import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/lib/auth';
import { AuthLayout } from '@/layouts/AuthLayout';
import { Alert, Button, Field, Input, Spinner } from '@/components/ui';

/**
 * Landing page for the reset link. supabase-js exchanges the ?code= in the URL for a
 * short-lived recovery session (detectSessionInUrl), which authorizes updateUser().
 */
export function ResetPasswordPage() {
  const { session, loading, updatePassword, signOut } = useAuth();
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (password.length < 8) return setError('Password must be at least 8 characters.');
    if (password !== confirm) return setError('Passwords do not match.');
    setSubmitting(true);
    const result = await updatePassword(password);
    setSubmitting(false);
    if (result.error) return setError(result.error);
    await signOut();
    navigate('/login?reset=success', { replace: true });
  };

  if (loading) return <Spinner />;

  return (
    <AuthLayout title="Choose a new password" footer={<Link to="/login" className="font-medium text-brand-700">Back to sign in</Link>}>
      {!session ? (
        <Alert tone="error" title="This reset link is invalid or has expired">
          <Link to="/forgot-password" className="underline">Request a new link</Link>.
        </Alert>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-5">
          {error && <Alert tone="error">{error}</Alert>}
          <Field label="New password" hint="At least 8 characters.">
            {(id) => <Input id={id} type="password" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} />}
          </Field>
          <Field label="Confirm new password">
            {(id) => <Input id={id} type="password" autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} />}
          </Field>
          <Button type="submit" className="w-full" loading={submitting}>Update password</Button>
        </form>
      )}
    </AuthLayout>
  );
}
