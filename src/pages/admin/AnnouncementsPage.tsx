import { useState } from 'react';
import { CalendarClock, Lock, Megaphone, Pencil, Plus, Trash2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useOrg } from '@/lib/org';
import { useAuth } from '@/lib/auth';
import { unwrap, useQuery } from '@/lib/useQuery';
import { errorMessage, formatDateTime, fromLocalInput, toLocalInput } from '@/lib/format';
import { useToast } from '@/components/ui/toast';
import { Alert, Badge, Button, Card, ConfirmDialog, EmptyState, Field, Input, Modal, PageHeader, PriorityBadge, Select, Spinner, Textarea } from '@/components/ui';
import type { Announcement, AnnouncementPriority, ContentStatus } from '@/types';

const audiences = ['everyone', 'families', 'students', 'staff', 'residents', 'volunteers'] as const;

interface FormState {
  title: string;
  message: string;
  priority: AnnouncementPriority;
  audience: (typeof audiences)[number];
  status: ContentStatus;
  publish_at: string;
  expires_at: string;
}

function lifecycle(a: Announcement): { label: string; tone: 'green' | 'slate' | 'amber' | 'blue' } {
  const now = Date.now();
  if (a.status === 'draft') return { label: 'Draft', tone: 'slate' };
  if (new Date(a.publish_at).getTime() > now) return { label: 'Scheduled', tone: 'blue' };
  if (a.expires_at && new Date(a.expires_at).getTime() <= now) return { label: 'Expired', tone: 'amber' };
  return { label: 'Active', tone: 'green' };
}

function toForm(a?: Announcement): FormState {
  return {
    title: a?.title ?? '',
    message: a?.message ?? '',
    priority: a?.priority ?? 'normal',
    audience: (a?.audience as FormState['audience']) ?? 'everyone',
    status: a?.status ?? 'published',
    publish_at: toLocalInput(a?.publish_at ?? new Date().toISOString()),
    expires_at: toLocalInput(a?.expires_at),
  };
}

export function AnnouncementsPage() {
  const { organization, can } = useOrg();
  const { session } = useAuth();
  const toast = useToast();
  const [editing, setEditing] = useState<Announcement | 'new' | null>(null);
  const [form, setForm] = useState<FormState>(toForm());
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<Announcement | null>(null);
  const [deleteBusy, setDeleteBusy] = useState(false);

  const { data, error, loading, reload } = useQuery(
    () => supabase.from('announcements').select('*').eq('organization_id', organization.id).order('publish_at', { ascending: false }).then(unwrap),
    [organization.id],
  );

  const canEdit = can('content.edit');
  const canDelete = can('content.delete');

  const open = (a: Announcement | 'new') => {
    setEditing(a);
    setForm(toForm(a === 'new' ? undefined : a));
    setFormError(null);
  };

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) => setForm((f) => ({ ...f, [key]: value }));

  const save = async () => {
    setFormError(null);
    if (!form.title.trim() || !form.message.trim()) return setFormError('Title and message are required.');
    const publishAt = fromLocalInput(form.publish_at) ?? new Date().toISOString();
    const expiresAt = fromLocalInput(form.expires_at);
    if (expiresAt && new Date(expiresAt) <= new Date(publishAt)) return setFormError('Expiration must be after the publish date.');

    const values = {
      title: form.title.trim(),
      message: form.message.trim(),
      priority: form.priority,
      audience: form.audience,
      status: form.status,
      publish_at: publishAt,
      expires_at: expiresAt,
    };

    setSaving(true);
    const { error: saveError } =
      editing === 'new'
        ? await supabase.from('announcements').insert({ ...values, organization_id: organization.id, author_id: session?.user.id })
        : await supabase.from('announcements').update(values).eq('id', (editing as Announcement).id);
    setSaving(false);
    if (saveError) return setFormError(errorMessage(saveError));
    toast.success(editing === 'new' ? 'Announcement created.' : 'Announcement updated.');
    setEditing(null);
    await reload();
  };

  const remove = async () => {
    if (!deleting) return;
    setDeleteBusy(true);
    const { error: deleteError } = await supabase.from('announcements').delete().eq('id', deleting.id);
    setDeleteBusy(false);
    setDeleting(null);
    if (deleteError) return toast.error(errorMessage(deleteError));
    toast.success('Announcement deleted.');
    await reload();
  };

  return (
    <>
      <PageHeader
        title="Announcements"
        description="Time-sensitive messages shown on your public site."
        actions={
          canEdit ? (
            <Button icon={Plus} onClick={() => open('new')} data-testid="new-announcement">New announcement</Button>
          ) : (
            <span className="inline-flex items-center gap-1.5 text-sm text-slate-500"><Lock className="h-4 w-4" />Read-only access</span>
          )
        }
      />

      {error && <Alert tone="error">{error}</Alert>}
      {loading && !data ? (
        <Spinner />
      ) : !data?.length ? (
        <Card>
          <EmptyState icon={Megaphone} title="No announcements yet" description="Emergency and important announcements appear as banners on your public site." />
        </Card>
      ) : (
        <div className="space-y-3">
          {data.map((a) => {
            const state = lifecycle(a);
            return (
              <Card key={a.id} className="p-5">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-semibold text-slate-900">{a.title}</h3>
                      <PriorityBadge priority={a.priority} />
                      <Badge tone={state.tone}>{state.label}</Badge>
                    </div>
                    <p className="mt-1.5 text-sm text-slate-600">{a.message}</p>
                    <p className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500">
                      <span className="capitalize">Audience: {a.audience}</span>
                      <span className="inline-flex items-center gap-1"><CalendarClock className="h-3.5 w-3.5" />{formatDateTime(a.publish_at)}</span>
                      {a.expires_at && <span>Expires {formatDateTime(a.expires_at)}</span>}
                    </p>
                  </div>
                  {(canEdit || canDelete) && (
                    <div className="flex shrink-0 gap-1">
                      {canEdit && <Button variant="ghost" size="sm" icon={Pencil} onClick={() => open(a)}>Edit</Button>}
                      {canDelete && <Button variant="ghost" size="sm" icon={Trash2} onClick={() => setDeleting(a)} aria-label={`Delete ${a.title}`} />}
                    </div>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}

      <Modal
        open={editing !== null}
        onClose={() => setEditing(null)}
        title={editing === 'new' ? 'New announcement' : 'Edit announcement'}
        size="lg"
        footer={
          <>
            <Button variant="secondary" onClick={() => setEditing(null)}>Cancel</Button>
            <Button loading={saving} onClick={save} data-testid="save-announcement">Save</Button>
          </>
        }
      >
        <div className="space-y-5">
          {formError && <Alert tone="error">{formError}</Alert>}
          <Field label="Title">{(id) => <Input id={id} value={form.title} onChange={(e) => set('title', e.target.value)} data-testid="announcement-title" />}</Field>
          <Field label="Message">{(id) => <Textarea id={id} rows={4} value={form.message} onChange={(e) => set('message', e.target.value)} data-testid="announcement-message" />}</Field>
          <div className="grid gap-5 sm:grid-cols-3">
            <Field label="Priority">
              {(id) => (
                <Select id={id} value={form.priority} onChange={(e) => set('priority', e.target.value as AnnouncementPriority)} data-testid="announcement-priority">
                  <option value="normal">Normal</option>
                  <option value="important">Important</option>
                  <option value="emergency">Emergency</option>
                </Select>
              )}
            </Field>
            <Field label="Audience">
              {(id) => (
                <Select id={id} value={form.audience} onChange={(e) => set('audience', e.target.value as FormState['audience'])}>
                  {audiences.map((a) => <option key={a} value={a}>{a[0].toUpperCase() + a.slice(1)}</option>)}
                </Select>
              )}
            </Field>
            <Field label="Status">
              {(id) => (
                <Select id={id} value={form.status} onChange={(e) => set('status', e.target.value as ContentStatus)} data-testid="announcement-status">
                  <option value="published">Published</option>
                  <option value="draft">Draft</option>
                </Select>
              )}
            </Field>
          </div>
          <div className="grid gap-5 sm:grid-cols-2">
            <Field label="Publish date">{(id) => <Input id={id} type="datetime-local" value={form.publish_at} onChange={(e) => set('publish_at', e.target.value)} />}</Field>
            <Field label="Expiration date" hint="Optional. Hidden from the public site after this time.">
              {(id) => <Input id={id} type="datetime-local" value={form.expires_at} onChange={(e) => set('expires_at', e.target.value)} />}
            </Field>
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        open={deleting !== null}
        title="Delete announcement?"
        message={<>“{deleting?.title}” will be removed from the public site immediately.</>}
        loading={deleteBusy}
        onConfirm={remove}
        onClose={() => setDeleting(null)}
      />
    </>
  );
}
