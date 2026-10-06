import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { MailCheck } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { AuthLayout } from '@/layouts/AuthLayout';
import { Alert, Button, Field, Input } from '@/components/ui';

export function SignUpPage() {
  const { signUp } = useAuth();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    setSubmitting(true);
    setError(null);
    const result = await signUp(email.trim(), password, fullName.trim());
    setSubmitting(false);
    if (result.error) setError(result.error);
    else setSent(true);
  };

  if (sent) {
    return (
      <AuthLayout title="Check your email" footer={<Link to="/login" className="font-medium text-brand-700">Back to sign in</Link>}>
        <div className="rounded-xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
          <MailCheck className="h-8 w-8 text-brand-600" />
          <p className="mt-4 text-sm text-slate-600">
            We sent a verification link to <span className="font-medium text-slate-900">{email}</span>. Click it to activate your account.
            Once verified, an Organization Admin can add you to their organization.
          </p>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      title="Create your account"
      subtitle="You'll verify your email, then an Organization Admin grants you access."
      footer={<>Already have an account? <Link to="/login" className="font-medium text-brand-700 hover:text-brand-800">Sign in</Link></>}
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        {error && <Alert tone="error">{error}</Alert>}
        <Field label="Full name">
          {(id) => <Input id={id} autoComplete="name" required value={fullName} onChange={(e) => setFullName(e.target.value)} />}
        </Field>
        <Field label="Work email">
          {(id) => <Input id={id} type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />}
        </Field>
        <Field label="Password" hint="At least 8 characters.">
          {(id) => <Input id={id} type="password" autoComplete="new-password" required value={password} onChange={(e) => setPassword(e.target.value)} />}
        </Field>
        <Button type="submit" className="w-full" loading={submitting}>Create account</Button>
      </form>
    </AuthLayout>
  );
}
