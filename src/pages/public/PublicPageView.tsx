import { Link, useParams, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Eye, FileQuestion } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useQuery } from '@/lib/useQuery';
import { formatDate } from '@/lib/format';
import { usePublicOrg } from '@/layouts/PublicOrgLayout';
import { Markdown } from '@/components/Markdown';
import { EmptyState, Spinner } from '@/components/ui';

export function PublicPageView() {
  const { organization } = usePublicOrg();
  const { pageSlug } = useParams();
  const [params] = useSearchParams();
  // Preview drops the published filter. RLS still decides: only org members get drafts back.
  const preview = params.get('preview') === '1';

  const { data: page, loading } = useQuery(async () => {
    let query = supabase.from('pages').select('*').eq('organization_id', organization.id).eq('slug', pageSlug!);
    if (!preview) query = query.eq('status', 'published');
    const { data, error } = await query.maybeSingle();
    if (error) throw error;
    return data;
  }, [organization.id, pageSlug, preview]);

  if (loading && !page) return <Spinner />;
  if (!page) {
    return <EmptyState icon={FileQuestion} title="Page not found" description="This page doesn't exist or isn't published." action={<Link to={`/o/${organization.slug}`} className="text-sm font-medium text-slate-700 underline">Back to home</Link>} />;
  }

  return (
    <article className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
      {page.status !== 'published' && (
        <div className="mb-6 flex items-center gap-2 rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-800 ring-1 ring-amber-200" data-testid="preview-banner">
          <Eye className="h-4 w-4" /> Preview — this page is a draft and is not visible to the public.
        </div>
      )}
      <Link to={`/o/${organization.slug}`} className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-800">
        <ArrowLeft className="h-4 w-4" /> {organization.name}
      </Link>
      <h1 className="mt-4 text-4xl font-semibold tracking-tight text-slate-900" data-testid="public-page-title">{page.title}</h1>
      {page.summary && <p className="mt-4 text-lg text-slate-600">{page.summary}</p>}
      <p className="mt-4 text-sm text-slate-400">Updated {formatDate(page.updated_at)}</p>
      <div className="mt-8 border-t border-slate-200 pt-8" data-testid="public-page-body">
        <Markdown source={page.body} />
      </div>
    </article>
  );
}
