import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ExternalLink, FileText, Lock, Plus, Search } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useOrg } from '@/lib/org';
import { unwrap, useQuery } from '@/lib/useQuery';
import { formatDate } from '@/lib/format';
import { Alert, Button, Card, EmptyState, Input, PageHeader, Select, Spinner, StatusBadge } from '@/components/ui';

export function PagesPage() {
  const { organization, basePath, can } = useOrg();
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState<'all' | 'published' | 'draft'>('all');

  const { data, error, loading } = useQuery(
    () =>
      supabase
        .from('pages')
        .select('id, title, slug, summary, status, updated_at, published_at, author:profiles(full_name, email)')
        .eq('organization_id', organization.id)
        .order('updated_at', { ascending: false })
        .then(unwrap),
    [organization.id],
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return (data ?? []).filter(
      (p) => (status === 'all' || p.status === status) && (!q || p.title.toLowerCase().includes(q) || p.slug.includes(q)),
    );
  }, [data, query, status]);

  const canEdit = can('content.edit');

  return (
    <>
      <PageHeader
        title="Pages"
        description="Content for your public website."
        actions={
          canEdit ? (
            <Button icon={Plus} onClick={() => navigate(`${basePath}/pages/new`)} data-testid="new-page">New page</Button>
          ) : (
            <span className="inline-flex items-center gap-1.5 text-sm text-slate-500" data-testid="read-only-notice"><Lock className="h-4 w-4" />Read-only access</span>
          )
        }
      />

      <Card>
        <div className="flex flex-col gap-3 border-b border-slate-100 p-4 sm:flex-row">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input placeholder="Search pages…" value={query} onChange={(e) => setQuery(e.target.value)} className="pl-9" aria-label="Search pages" />
          </div>
          <Select value={status} onChange={(e) => setStatus(e.target.value as typeof status)} className="sm:w-44" aria-label="Filter by status">
            <option value="all">All statuses</option>
            <option value="published">Published</option>
            <option value="draft">Drafts</option>
          </Select>
        </div>

        {error && <div className="p-4"><Alert tone="error">{error}</Alert></div>}
        {loading && !data ? (
          <Spinner />
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={FileText}
            title={data?.length ? 'No pages match your filters' : 'No pages yet'}
            description={data?.length ? undefined : 'Pages you create will appear on your public site once published.'}
            action={canEdit && !data?.length ? <Button icon={Plus} onClick={() => navigate(`${basePath}/pages/new`)}>Create your first page</Button> : undefined}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-100 text-sm" data-testid="pages-table">
              <thead className="bg-slate-50 text-left text-xs font-medium uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-5 py-3">Title</th>
                  <th className="px-5 py-3">Status</th>
                  <th className="hidden px-5 py-3 md:table-cell">Author</th>
                  <th className="hidden px-5 py-3 sm:table-cell">Updated</th>
                  <th className="px-5 py-3 text-right"><span className="sr-only">Actions</span></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((page) => (
                  <tr key={page.id} className="hover:bg-slate-50/60" data-testid="page-row">
                    <td className="px-5 py-3.5">
                      <Link to={`${basePath}/pages/${page.id}`} className="font-medium text-slate-900 hover:text-brand-700">{page.title}</Link>
                      <p className="text-xs text-slate-400">/{page.slug}</p>
                    </td>
                    <td className="px-5 py-3.5"><StatusBadge status={page.status} /></td>
                    <td className="hidden px-5 py-3.5 text-slate-600 md:table-cell">{page.author?.full_name ?? page.author?.email ?? '—'}</td>
                    <td className="hidden px-5 py-3.5 text-slate-500 sm:table-cell">{formatDate(page.updated_at)}</td>
                    <td className="px-5 py-3.5 text-right">
                      <div className="flex items-center justify-end gap-1">
                        {page.status === 'published' && (
                          <a href={`/o/${organization.slug}/pages/${page.slug}`} target="_blank" rel="noreferrer" className="rounded-md p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700" aria-label="View on public site">
                            <ExternalLink className="h-4 w-4" />
                          </a>
                        )}
                        <Link to={`${basePath}/pages/${page.id}`} className="rounded-md px-2.5 py-1 text-sm font-medium text-brand-700 hover:bg-brand-50">
                          {canEdit ? 'Edit' : 'View'}
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </>
  );
}
