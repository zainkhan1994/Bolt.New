import { Link, useSearchParams } from 'react-router-dom';
import { FileText, Megaphone, Search } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { unwrap, useQuery } from '@/lib/useQuery';
import { usePublicOrg } from '@/layouts/PublicOrgLayout';
import { EmptyState, Spinner } from '@/components/ui';
import { activeAnnouncements } from '@/pages/public/publicQueries';

export function PublicSearchPage() {
  const { organization } = usePublicOrg();
  const [params] = useSearchParams();
  const q = (params.get('q') ?? '').trim();
  // Strip characters that have meaning in PostgREST filter syntax.
  const term = q.replace(/[%,()*\\]/g, ' ').trim();
  const base = `/o/${organization.slug}`;

  const { data, loading } = useQuery(async () => {
    if (!term) return { pages: [], announcements: [], documents: [] };
    const like = `%${term}%`;
    const [pages, documents, announcements] = await Promise.all([
      supabase.from('pages').select('id, title, slug, summary').eq('organization_id', organization.id).eq('status', 'published').or(`title.ilike.${like},summary.ilike.${like},body.ilike.${like}`).then(unwrap),
      supabase.from('documents').select('id, title, description, category').eq('organization_id', organization.id).eq('is_public', true).or(`title.ilike.${like},description.ilike.${like},category.ilike.${like}`).then(unwrap),
      activeAnnouncements(organization.id),
    ]);
    const lower = term.toLowerCase();
    return {
      pages,
      documents,
      announcements: announcements.filter((a) => `${a.title} ${a.message}`.toLowerCase().includes(lower)),
    };
  }, [organization.id, term]);

  const total = data ? data.pages.length + data.documents.length + data.announcements.length : 0;

  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
      <h1 className="text-3xl font-semibold tracking-tight text-slate-900">Search</h1>
      <p className="mt-2 text-slate-600">{q ? <>Results for “{q}”</> : 'Enter a search term above.'}</p>
      {loading && !data ? (
        <Spinner />
      ) : q && total === 0 ? (
        <EmptyState icon={Search} title="No results" description="Try a different word or browse the menu." />
      ) : data ? (
        <div className="mt-8 space-y-8">
          {data.pages.length > 0 && (
            <section>
              <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-500">Pages</h2>
              <ul className="mt-3 space-y-3">
                {data.pages.map((p) => (
                  <li key={p.id}><Link to={`${base}/pages/${p.slug}`} className="block rounded-xl border border-slate-200 p-4 hover:bg-slate-50"><p className="font-medium text-slate-900">{p.title}</p><p className="text-sm text-slate-600">{p.summary}</p></Link></li>
                ))}
              </ul>
            </section>
          )}
          {data.announcements.length > 0 && (
            <section>
              <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-500">Announcements</h2>
              <ul className="mt-3 space-y-3">
                {data.announcements.map((a) => (
                  <li key={a.id}><Link to={`${base}/announcements`} className="flex gap-3 rounded-xl border border-slate-200 p-4 hover:bg-slate-50"><Megaphone className="h-5 w-5 shrink-0 text-slate-400" /><span><span className="block font-medium text-slate-900">{a.title}</span><span className="block text-sm text-slate-600">{a.message}</span></span></Link></li>
                ))}
              </ul>
            </section>
          )}
          {data.documents.length > 0 && (
            <section>
              <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-500">Documents</h2>
              <ul className="mt-3 space-y-3">
                {data.documents.map((d) => (
                  <li key={d.id}><Link to={`${base}/documents`} className="flex gap-3 rounded-xl border border-slate-200 p-4 hover:bg-slate-50"><FileText className="h-5 w-5 shrink-0 text-red-500" /><span><span className="block font-medium text-slate-900">{d.title}</span><span className="block text-sm text-slate-600">{d.description}</span></span></Link></li>
                ))}
              </ul>
            </section>
          )}
        </div>
      ) : null}
    </div>
  );
}
