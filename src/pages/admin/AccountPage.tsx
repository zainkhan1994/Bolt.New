import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';
import { useQuery } from '@/lib/useQuery';
import { errorMessage } from '@/lib/format';
import { useToast } from '@/components/ui/toast';
import { Alert, Button, Card, Field, Input, PageHeader, Spinner, Toggle } from '@/components/ui';
import type { NotificationPreferences } from '@/types';

type PrefKey = 'email_announcements' | 'emergency_alerts' | 'weekly_digest' | 'document_updates';

const prefLabels: Record<PrefKey, { label: string; description: string }> = {
  emergency_alerts: { label: 'Emergency alerts', description: 'Closures, safety incidents and other urgent notices.' },
  email_announcements: { label: 'Announcement emails', description: 'A copy of each announcement your organizations publish.' },
  document_updates: { label: 'Document updates', description: 'When new policies, forms or agendas are posted.' },
  weekly_digest: { label: 'Weekly digest', description: 'A Monday summary of activity across your organizations.' },
};

export function AccountPage() {
  const { profile, session, updatePassword } = useAuth();
  const toast = useToast();
  const [fullName, setFullName] = useState(profile?.full_name ?? '');
  const [savingProfile, setSavingProfile] = useState(false);
  const [password, setPassword] = useState('');
  const [savingPassword, setSavingPassword] = useState(false);
  const [prefs, setPrefs] = useState<NotificationPreferences | null>(null);

  useEffect(() => setFullName(profile?.full_name ?? ''), [profile]);

  const { error, loading } = useQuery(async () => {
    const { data, error: e } = await supabase.from('notification_preferences').select('*').eq('user_id', session!.user.id).maybeSingle();
    if (e) throw e;
    setPrefs(data);
    return data;
  }, [session?.user.id]);

  const saveProfile = async () => {
    setSavingProfile(true);
    const { error: e } = await supabase.from('profiles').update({ full_name: fullName.trim() || null }).eq('id', session!.user.id);
    setSavingProfile(false);
    if (e) toast.error(errorMessage(e));
    else toast.success('Profile updated.');
  };

  const changePassword = async () => {
    if (password.length < 8) return toast.error('Password must be at least 8 characters.');
    setSavingPassword(true);
    const result = await updatePassword(password);
    setSavingPassword(false);
    if (result.error) return toast.error(result.error);
    setPassword('');
    toast.success('Password changed.');
  };

  const togglePref = async (key: PrefKey, value: boolean) => {
    if (!prefs) return;
    const previous = prefs;
    setPrefs({ ...prefs, [key]: value });
    const { error: e } = await supabase.from('notification_preferences').update({ [key]: value }).eq('id', prefs.id);
    if (e) {
      setPrefs(previous);
      toast.error(errorMessage(e));
    }
  };

  return (
    <>
      <PageHeader title="Account" description="Your profile, password and notification preferences." />
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-6">
          <Card className="space-y-5 p-6">
            <h2 className="text-sm font-semibold text-slate-900">Profile</h2>
            <Field label="Email">{(id) => <Input id={id} value={profile?.email ?? ''} disabled />}</Field>
            <Field label="Full name">{(id) => <Input id={id} value={fullName} onChange={(e) => setFullName(e.target.value)} />}</Field>
            <Button loading={savingProfile} onClick={saveProfile}>Save profile</Button>
          </Card>
          <Card className="space-y-5 p-6">
            <h2 className="text-sm font-semibold text-slate-900">Change password</h2>
            <Field label="New password" hint="At least 8 characters.">
              {(id) => <Input id={id} type="password" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} />}
            </Field>
            <Button variant="secondary" loading={savingPassword} disabled={!password} onClick={changePassword}>Update password</Button>
          </Card>
        </div>
        <Card className="p-6">
          <h2 className="text-sm font-semibold text-slate-900">Notification preferences</h2>
          <p className="mt-1 text-sm text-slate-500">Choose which emails you receive.</p>
          {error && <div className="mt-4"><Alert tone="error">{error}</Alert></div>}
          {loading && !prefs ? (
            <Spinner />
          ) : prefs ? (
            <div className="mt-6 space-y-5">
              {(Object.keys(prefLabels) as PrefKey[]).map((key) => (
                <Toggle key={key} label={prefLabels[key].label} description={prefLabels[key].description} checked={prefs[key]} onChange={(v) => togglePref(key, v)} />
              ))}
            </div>
          ) : null}
        </Card>
      </div>
    </>
  );
}
