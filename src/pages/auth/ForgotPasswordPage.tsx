import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/lib/auth';
import { AuthLayout } from '@/layouts/AuthLayout';
import { Alert, Button, Field, Input } from '@/components/ui';

export function ForgotPasswordPage() {
  const { sendPasswordReset } = useAuth();
  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    const result = await sendPasswordReset(email.trim());
    setSubmitting(false);
    if (result.error) setError(result.error);
    else setSent(true);
  };

  return (
    <AuthLayout
      title="Reset your password"
      subtitle="Enter your account email and we'll send you a secure reset link."
      footer={<Link to="/login" className="font-medium text-brand-700 hover:text-brand-800">Back to sign in</Link>}
    >
      {sent ? (
        // Same message whether or not the account exists, to avoid account enumeration.
        <Alert tone="success" title="Check your inbox">
          If an account exists for {email}, a password reset link is on its way.
        </Alert>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-5">
          {error && <Alert tone="error">{error}</Alert>}
          <Field label="Email address">
            {(id) => <Input id={id} type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />}
          </Field>
          <Button type="submit" className="w-full" loading={submitting} disabled={!email}>Send reset link</Button>
        </form>
      )}
    </AuthLayout>
  );
}
