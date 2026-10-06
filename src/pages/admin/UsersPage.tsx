import { useState } from 'react';
import { Lock, Trash2, UserPlus, Users } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useOrg } from '@/lib/org';
import { useAuth } from '@/lib/auth';
import { unwrap, useQuery } from '@/lib/useQuery';
import { errorMessage, formatDate } from '@/lib/format';
import { roleDescriptions, roleLabels } from '@/lib/permissions';
import { useToast } from '@/components/ui/toast';
import { Alert, Badge, Button, Card, ConfirmDialog, EmptyState, Field, Input, Modal, PageHeader, Select, Spinner } from '@/components/ui';
import type { OrgRole } from '@/types';

const roles: OrgRole[] = ['org_admin', 'editor', 'viewer'];

export function UsersPage() {
  const { organization, can } = useOrg();
  const { session, refreshMemberships } = useAuth();
  const toast = useToast();
  const canManage = can('members.manage');

  const [inviteOpen, setInviteOpen] = useState(false);
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<OrgRole>('viewer');
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [inviting, setInviting] = useState(false);
  const [removing, setRemoving] = useState<{ id: string; label: string } | null>(null);
  const [removeBusy, setRemoveBusy] = useState(false);
  const [busyRow, setBusyRow] = useState<string | null>(null);

  const { data, error, loading, reload } = useQuery(
    () =>
      supabase
        .from('organization_members')
        .select('id, role, created_at, user_id, profile:profiles(full_name, email)')
        .eq('organization_id', organization.id)
        .order('created_at')
        .then(unwrap),
    [organization.id],
  );

  const addMember = async () => {
    setInviteError(null);
    setInviting(true);
    const { error: rpcError } = await supabase.rpc('add_member_by_email', { p_organization_id: organization.id, p_email: email.trim(), p_role: role });
    setInviting(false);
    if (rpcError) return setInviteError(errorMessage(rpcError));
    toast.success(`${email} was added as ${roleLabels[role]}.`);
    setInviteOpen(false);
    setEmail('');
    setRole('viewer');
    await reload();
  };

  const changeRole = async (memberId: string, userId: string, next: OrgRole) => {
    setBusyRow(memberId);
    const { error: updateError } = await supabase.from('organization_members').update({ role: next }).eq('id', memberId);
    setBusyRow(null);
    if (updateError) return toast.error(errorMessage(updateError));
    toast.success(`Role changed to ${roleLabels[next]}.`);
    if (userId === session?.user.id) await refreshMemberships();
    await reload();
  };

  const remove = async () => {
    if (!removing) return;
    setRemoveBusy(true);
    const { error: deleteError } = await supabase.from('organization_members').delete().eq('id', removing.id);
    setRemoveBusy(false);
    setRemoving(null);
    if (deleteError) return toast.error(errorMessage(deleteError));
    toast.success(`${removing.label} was removed.`);
    await reload();
  };

  return (
    <>
      <PageHeader
        title="Users"
        description="People who can sign in to this organization's dashboard."
        actions={
          canManage ? (
            <Button icon={UserPlus} onClick={() => setInviteOpen(true)} data-testid="add-member">Add member</Button>
          ) : (
            <span className="inline-flex items-center gap-1.5 text-sm text-slate-500"><Lock className="h-4 w-4" />Only Organization Admins can manage users</span>
          )
        }
      />

      {error && <Alert tone="error">{error}</Alert>}
      <Card>
        {loading && !data ? (
          <Spinner />
        ) : !data?.length ? (
          <EmptyState icon={Users} title="No members" />
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-100 text-sm">
              <thead className="bg-slate-50 text-left text-xs font-medium uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-5 py-3">Member</th>
                  <th className="px-5 py-3">Role</th>
                  <th className="hidden px-5 py-3 sm:table-cell">Joined</th>
                  {canManage && <th className="px-5 py-3"><span className="sr-only">Actions</span></th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {data.map((m) => {
                  const label = m.profile?.full_name ?? m.profile?.email ?? 'Unknown';
                  return (
                    <tr key={m.id} data-testid="member-row">
                      <td className="px-5 py-3.5">
                        <p className="font-medium text-slate-900">
                          {label} {m.user_id === session?.user.id && <span className="text-xs font-normal text-slate-400">(you)</span>}
                        </p>
                        <p className="text-xs text-slate-500">{m.profile?.email}</p>
                      </td>
                      <td className="px-5 py-3.5">
                        {canManage ? (
                          <Select
                            value={m.role}
                            disabled={busyRow === m.id}
                            onChange={(e) => changeRole(m.id, m.user_id, e.target.value as OrgRole)}
                            className="h-9 w-48"
                            aria-label={`Role for ${label}`}
                          >
                            {roles.map((r) => <option key={r} value={r}>{roleLabels[r]}</option>)}
                          </Select>
                        ) : (
                          <Badge tone={m.role === 'org_admin' ? 'violet' : m.role === 'editor' ? 'blue' : 'slate'}>{roleLabels[m.role]}</Badge>
                        )}
                      </td>
                      <td className="hidden px-5 py-3.5 text-slate-500 sm:table-cell">{formatDate(m.created_at)}</td>
                      {canManage && (
                        <td className="px-5 py-3.5 text-right">
                          <Button variant="ghost" size="sm" icon={Trash2} onClick={() => setRemoving({ id: m.id, label })} aria-label={`Remove ${label}`} />
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        {roles.map((r) => (
          <Card key={r} className="p-4">
            <p className="text-sm font-semibold text-slate-900">{roleLabels[r]}</p>
            <p className="mt-1 text-sm text-slate-500">{roleDescriptions[r]}</p>
          </Card>
        ))}
      </div>

      <Modal
        open={inviteOpen}
        onClose={() => setInviteOpen(false)}
        title="Add a member"
        description="The person must already have a verified CommunityHub account."
        footer={
          <>
            <Button variant="secondary" onClick={() => setInviteOpen(false)}>Cancel</Button>
            <Button loading={inviting} disabled={!email} onClick={addMember}>Add member</Button>
          </>
        }
      >
        <div className="space-y-5">
          {inviteError && <Alert tone="error">{inviteError}</Alert>}
          <Field label="Email address">{(id) => <Input id={id} type="email" value={email} onChange={(e) => setEmail(e.target.value)} />}</Field>
          <Field label="Role" hint={roleDescriptions[role]}>
            {(id) => (
              <Select id={id} value={role} onChange={(e) => setRole(e.target.value as OrgRole)}>
                {roles.map((r) => <option key={r} value={r}>{roleLabels[r]}</option>)}
              </Select>
            )}
          </Field>
        </div>
      </Modal>

      <ConfirmDialog
        open={removing !== null}
        title="Remove member?"
        message={<>{removing?.label} will immediately lose access to {organization.name}.</>}
        confirmLabel="Remove"
        loading={removeBusy}
        onConfirm={remove}
        onClose={() => setRemoving(null)}
      />
    </>
  );
}
