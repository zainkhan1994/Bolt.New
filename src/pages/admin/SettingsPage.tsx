import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useOrg } from '@/lib/org';
import { useAuth } from '@/lib/auth';
import { errorMessage } from '@/lib/format';
import { useToast } from '@/components/ui/toast';
import { Alert, Button, Card, Field, Input, PageHeader, Textarea, Toggle } from '@/components/ui';

export function SettingsPage() {
  const { organization, can } = useOrg();
  const { refreshMemberships } = useAuth();
  const toast = useToast();
  const readOnly = !can('settings.manage');

  const [form, setForm] = useState(organization);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => setForm(organization), [organization]);

  const set = <K extends keyof typeof form>(key: K, value: (typeof form)[K]) => setForm((f) => ({ ...f, [key]: value }));

  const save = async () => {
    setError(null);
    if (!/^#[0-9a-fA-F]{6}$/.test(form.primary_color)) return setError('Brand color must be a hex value like #1d4ed8.');
    setSaving(true);
    const { error: saveError } = await supabase
      .from('organizations')
      .update({
        name: form.name.trim(),
        tagline: form.tagline?.trim() || null,
        description: form.description?.trim() || null,
        primary_color: form.primary_color,
        contact_email: form.contact_email?.trim() || null,
        contact_phone: form.contact_phone?.trim() || null,
        address: form.address?.trim() || null,
        is_public: form.is_public,
      })
      .eq('id', organization.id);
    setSaving(false);
    if (saveError) return setError(errorMessage(saveError));
    toast.success('Organization settings saved.');
    await refreshMemberships();
  };

  return (
    <>
      <PageHeader
        title="Organization Settings"
        description="Branding and contact details shown on your public site."
        actions={!readOnly && <Button loading={saving} onClick={save} data-testid="save-settings">Save changes</Button>}
      />
      {readOnly && <div className="mb-4"><Alert tone="info" title="Read-only">Only Organization Admins can change settings.</Alert></div>}
      {error && <div className="mb-4"><Alert tone="error">{error}</Alert></div>}

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="space-y-5 p-6 lg:col-span-2">
          <h2 className="text-sm font-semibold text-slate-900">Profile</h2>
          <Field label="Organization name">{(id) => <Input id={id} value={form.name} disabled={readOnly} onChange={(e) => set('name', e.target.value)} />}</Field>
          <Field label="Tagline">{(id) => <Input id={id} value={form.tagline ?? ''} disabled={readOnly} onChange={(e) => set('tagline', e.target.value)} />}</Field>
          <Field label="Description">{(id) => <Textarea id={id} rows={3} value={form.description ?? ''} disabled={readOnly} onChange={(e) => set('description', e.target.value)} />}</Field>
          <div className="grid gap-5 sm:grid-cols-2">
            <Field label="Contact email">{(id) => <Input id={id} type="email" value={form.contact_email ?? ''} disabled={readOnly} onChange={(e) => set('contact_email', e.target.value)} />}</Field>
            <Field label="Phone">{(id) => <Input id={id} value={form.contact_phone ?? ''} disabled={readOnly} onChange={(e) => set('contact_phone', e.target.value)} />}</Field>
          </div>
          <Field label="Address">{(id) => <Input id={id} value={form.address ?? ''} disabled={readOnly} onChange={(e) => set('address', e.target.value)} />}</Field>
        </Card>

        <div className="space-y-6">
          <Card className="space-y-5 p-6">
            <h2 className="text-sm font-semibold text-slate-900">Branding</h2>
            <Field label="Brand color">
              {(id) => (
                <div className="flex items-center gap-3">
                  <input type="color" value={form.primary_color} disabled={readOnly} onChange={(e) => set('primary_color', e.target.value)} className="h-10 w-12 cursor-pointer rounded-lg border border-slate-300 bg-white p-1" aria-label="Pick brand color" />
                  <Input id={id} value={form.primary_color} disabled={readOnly} onChange={(e) => set('primary_color', e.target.value)} />
                </div>
              )}
            </Field>
            <div className="overflow-hidden rounded-lg ring-1 ring-slate-200">
              <div className="px-4 py-5 text-white" style={{ backgroundColor: form.primary_color }}>
                <p className="font-semibold">{form.name}</p>
                <p className="text-sm opacity-80">{form.tagline}</p>
              </div>
              <p className="bg-slate-50 px-4 py-2 text-xs text-slate-500">Public site header preview</p>
            </div>
          </Card>
          <Card className="p-6">
            <Toggle
              label="Public website enabled"
              description="When off, your public portal and documents are hidden from visitors."
              checked={form.is_public}
              disabled={readOnly}
              onChange={(v) => set('is_public', v)}
            />
            <p className="mt-4 text-xs text-slate-500">Public URL: /o/{organization.slug}</p>
          </Card>
        </div>
      </div>
    </>
  );
}
