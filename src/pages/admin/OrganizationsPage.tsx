import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Building2, ExternalLink, Plus } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';
import { unwrap, useQuery } from '@/lib/useQuery';
import { errorMessage, formatDate, slugify } from '@/lib/format';
import { useToast } from '@/components/ui/toast';
import { Alert, Badge, Button, Card, EmptyState, Field, Input, Modal, PageHeader, Select, Spinner } from '@/components/ui';

const typeLabels: Record<string, string> = {
  school_district: 'School district',
  municipality: 'Municipality',
  community: 'Community organization',
};

/** Super-admin only. RLS returns every organization for super admins and rejects the RPC for everyone else. */
export function OrganizationsPage() {
  const { profile, refreshMemberships } = useAuth();
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [type, setType] = useState('community');
  const [adminEmail, setAdminEmail] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const { data, error, loading, reload } = useQuery(
    () => supabase.from('organizations').select('*, organization_members(count)').order('name').then(unwrap),
    [],
  );

  if (!profile?.is_super_admin) {
    return <Alert tone="error" title="Super Admins only">You don't have access to platform administration.</Alert>;
  }

  const create = async () => {
    setFormError(null);
    setSaving(true);
    const { error: rpcError } = await supabase.rpc('create_organization', {
      p_name: name.trim(),
      p_slug: slugify(slug || name),
      p_type: type,
      p_admin_email: adminEmail.trim(),
    });
    setSaving(false);
    if (rpcError) return setFormError(errorMessage(rpcError));
    toast.success(`${name} was created.`);
    setOpen(false);
    setName('');
    setSlug('');
    setAdminEmail('');
    await Promise.all([reload(), refreshMemberships()]);
  };

  return (
    <>
      <PageHeader
        title="All Organizations"
        description="Platform-wide view for Super Admins."
        actions={<Button icon={Plus} onClick={() => setOpen(true)}>New organization</Button>}
      />
      {error && <Alert tone="error">{error}</Alert>}
      <Card>
        {loading && !data ? (
          <Spinner />
        ) : !data?.length ? (
          <EmptyState icon={Building2} title="No organizations" />
        ) : (
          <ul className="divide-y divide-slate-100">
            {data.map((org) => (
              <li key={org.id} className="flex items-center gap-4 px-5 py-4">
                <span className="flex h-10 w-10 items-center justify-center rounded-lg text-sm font-semibold text-white" style={{ backgroundColor: org.primary_color }}>
                  {org.name[0]}
                </span>
                <div className="min-w-0 flex-1">
                  <Link to={`/app/${org.slug}`} className="font-medium text-slate-900 hover:text-brand-700">{org.name}</Link>
                  <p className="text-xs text-slate-500">
                    {typeLabels[org.type] ?? org.type} · {org.organization_members[0]?.count ?? 0} members · created {formatDate(org.created_at)}
                  </p>
                </div>
                {!org.is_public && <Badge tone="amber">Site hidden</Badge>}
                <a href={`/o/${org.slug}`} target="_blank" rel="noreferrer" className="text-slate-400 hover:text-slate-700" aria-label="Open public site">
                  <ExternalLink className="h-4 w-4" />
                </a>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Create organization"
        footer={
          <>
            <Button variant="secondary" onClick={() => setOpen(false)}>Cancel</Button>
            <Button loading={saving} onClick={create} disabled={!name || !adminEmail}>Create</Button>
          </>
        }
      >
        <div className="space-y-5">
          {formError && <Alert tone="error">{formError}</Alert>}
          <Field label="Name">{(id) => <Input id={id} value={name} onChange={(e) => { setName(e.target.value); setSlug(slugify(e.target.value)); }} />}</Field>
          <Field label="URL slug" hint={`/o/${slug || 'your-org'}`}>{(id) => <Input id={id} value={slug} onChange={(e) => setSlug(e.target.value.toLowerCase())} />}</Field>
          <Field label="Type">
            {(id) => (
              <Select id={id} value={type} onChange={(e) => setType(e.target.value)}>
                {Object.entries(typeLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
              </Select>
            )}
          </Field>
          <Field label="First Organization Admin (email)" hint="Must be an existing CommunityHub account.">
            {(id) => <Input id={id} type="email" value={adminEmail} onChange={(e) => setAdminEmail(e.target.value)} />}
          </Field>
        </div>
      </Modal>
    </>
  );
}
