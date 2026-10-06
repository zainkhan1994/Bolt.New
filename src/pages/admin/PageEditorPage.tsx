import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Eye, Lock, Trash2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useOrg } from '@/lib/org';
import { useAuth } from '@/lib/auth';
import { useQuery } from '@/lib/useQuery';
import { errorMessage, formatDateTime, slugify } from '@/lib/format';
import { useToast } from '@/components/ui/toast';
import { Alert, Button, Card, ConfirmDialog, Field, Input, Spinner, StatusBadge, Textarea, Toggle } from '@/components/ui';
import type { ContentStatus, Page } from '@/types';

interface FormState {
  title: string;
  slug: string;
  summary: string;
  body: string;
  show_in_nav: boolean;
}

const empty: FormState = { title: '', slug: '', summary: '', body: '', show_in_nav: false };

export function PageEditorPage() {
  const { pageId } = useParams();
  const isNew = !pageId || pageId === 'new';
  const { organization, basePath, can } = useOrg();
  const { session } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();

  const [form, setForm] = useState<FormState>(empty);
  const [slugTouched, setSlugTouched] = useState(false);
  const [saving, setSaving] = useState<ContentStatus | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const { data: page, error: loadError, loading, reload } = useQuery<Page | null>(async () => {
    if (isNew) return null;
    const { data, error } = await supabase.from('pages').select('*').eq('id', pageId).eq('organization_id', organization.id).maybeSingle();
    if (error) throw new Error(error.message);
    return data;
  }, [pageId, organization.id]);

  useEffect(() => {
    if (page) {
      setForm({ title: page.title, slug: page.slug, summary: page.summary ?? '', body: page.body, show_in_nav: page.show_in_nav });
      setSlugTouched(true);
    }
  }, [page]);

  const canEdit = can('content.edit');
  const canDelete = can('content.delete');
  const readOnly = !canEdit;

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) => setForm((f) => ({ ...f, [key]: value }));

  const save = async (status: ContentStatus) => {
    setError(null);
    if (!form.title.trim()) return setError('Title is required.');
    const slug = slugify(form.slug || form.title);
    if (!slug) return setError('Slug must contain letters or numbers.');

    setSaving(status);
    const values = {
      title: form.title.trim(),
      slug,
      summary: form.summary.trim() || null,
      body: form.body,
      show_in_nav: form.show_in_nav,
      status,
    };

    const result = isNew
      ? await supabase.from('pages').insert({ ...values, organization_id: organization.id, author_id: session?.user.id }).select().single()
      : await supabase.from('pages').update(values).eq('id', pageId).select().single();
    setSaving(null);

    if (result.error) {
      setError(
        result.error.code === '23505' ? `Another page already uses the URL "/${slug}".` : errorMessage(result.error),
      );
      return;
    }
    toast.success(status === 'published' ? 'Page published.' : 'Draft saved.');
    if (isNew) navigate(`${basePath}/pages/${result.data.id}`, { replace: true });
    else await reload();
  };

  const remove = async () => {
    setDeleting(true);
    const { error: deleteError, count } = await supabase.from('pages').delete({ count: 'exact' }).eq('id', pageId!);
    setDeleting(false);
    setConfirmDelete(false);
    if (deleteError || count === 0) {
      toast.error(deleteError ? errorMessage(deleteError) : 'You do not have permission to delete this page.');
      return;
    }
    toast.success('Page deleted.');
    navigate(`${basePath}/pages`, { replace: true });
  };

  if (loading && !isNew) return <Spinner />;
  if (loadError) return <Alert tone="error">{loadError}</Alert>;
  if (!isNew && !page) return <Alert tone="error" title="Page not found">It may have been deleted, or it belongs to another organization.</Alert>;

  const previewUrl = page ? `/o/${organization.slug}/pages/${page.slug}?preview=1` : null;

  return (
    <>
      <Link to={`${basePath}/pages`} className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-slate-800">
        <ArrowLeft className="h-4 w-4" /> All pages
      </Link>

      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">{isNew ? 'New page' : readOnly ? page?.title : 'Edit page'}</h1>
          {page && <StatusBadge status={page.status} />}
        </div>
        <div className="flex flex-wrap gap-2">
          {previewUrl && (
            <a href={previewUrl} target="_blank" rel="noreferrer">
              <Button variant="secondary" icon={Eye} data-testid="preview-page">Preview</Button>
            </a>
          )}
          {canEdit && (
            <>
              {page?.status === 'published' ? (
                <Button variant="secondary" loading={saving === 'draft'} onClick={() => save('draft')} data-testid="unpublish-page">Unpublish</Button>
              ) : (
                <Button variant="secondary" loading={saving === 'draft'} onClick={() => save('draft')} data-testid="save-draft">Save draft</Button>
              )}
              <Button loading={saving === 'published'} onClick={() => save('published')} data-testid="publish-page">
                {page?.status === 'published' ? 'Update' : 'Publish'}
              </Button>
            </>
          )}
        </div>
      </div>

      {readOnly && (
        <div className="mb-4">
          <Alert tone="info" title="Read-only access">
            <span data-testid="read-only-notice">Your role can view pages but not change them.</span>
          </Alert>
        </div>
      )}
      {error && <div className="mb-4"><Alert tone="error">{error}</Alert></div>}

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="space-y-5 p-6 lg:col-span-2">
          <Field label="Title">
            {(id) => (
              <Input
                id={id}
                value={form.title}
                disabled={readOnly}
                data-testid="page-title"
                onChange={(e) => {
                  set('title', e.target.value);
                  if (!slugTouched) set('slug', slugify(e.target.value));
                }}
              />
            )}
          </Field>
          <Field label="Summary" hint="Shown in navigation cards and search results.">
            {(id) => <Textarea id={id} rows={2} className="min-h-0" value={form.summary} disabled={readOnly} onChange={(e) => set('summary', e.target.value)} data-testid="page-summary" />}
          </Field>
          <Field label="Body" hint="Separate paragraphs with a blank line. Use “## ” for headings and “- ” for bullet points.">
            {(id) => <Textarea id={id} rows={16} className="font-mono text-[13px]" value={form.body} disabled={readOnly} onChange={(e) => set('body', e.target.value)} data-testid="page-body" />}
          </Field>
        </Card>

        <div className="space-y-6">
          <Card className="space-y-5 p-6">
            <Field label="URL slug" hint={`/o/${organization.slug}/pages/${form.slug || 'your-page'}`}>
              {(id) => (
                <Input
                  id={id}
                  value={form.slug}
                  disabled={readOnly}
                  data-testid="page-slug"
                  onChange={(e) => {
                    setSlugTouched(true);
                    set('slug', e.target.value.toLowerCase());
                  }}
                />
              )}
            </Field>
            <Toggle label="Show in site navigation" description="Adds this page to the public site's top menu." checked={form.show_in_nav} disabled={readOnly} onChange={(v) => set('show_in_nav', v)} />
          </Card>

          {page && (
            <Card className="space-y-2 p-6 text-sm">
              <p className="flex justify-between"><span className="text-slate-500">Published</span><span className="text-slate-900">{formatDateTime(page.published_at)}</span></p>
              <p className="flex justify-between"><span className="text-slate-500">Last updated</span><span className="text-slate-900">{formatDateTime(page.updated_at)}</span></p>
              <p className="flex justify-between"><span className="text-slate-500">Created</span><span className="text-slate-900">{formatDateTime(page.created_at)}</span></p>
            </Card>
          )}

          {page && canDelete && (
            <Card className="p-6">
              <h3 className="text-sm font-semibold text-slate-900">Danger zone</h3>
              <p className="mt-1 text-sm text-slate-500">Deleting a page removes it from the public site immediately.</p>
              <Button variant="danger" size="sm" icon={Trash2} className="mt-4" onClick={() => setConfirmDelete(true)} data-testid="delete-page">Delete page</Button>
            </Card>
          )}
          {page && canEdit && !canDelete && (
            <p className="flex items-center gap-1.5 text-xs text-slate-500"><Lock className="h-3.5 w-3.5" />Only Organization Admins can delete pages.</p>
          )}
        </div>
      </div>

      <ConfirmDialog
        open={confirmDelete}
        title="Delete this page?"
        message={<>“{page?.title}” will be permanently deleted. This can't be undone.</>}
        loading={deleting}
        onConfirm={remove}
        onClose={() => setConfirmDelete(false)}
      />
    </>
  );
}
