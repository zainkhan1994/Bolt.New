import { Link } from 'react-router-dom';
import { ArrowRight, FileText } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { unwrap, useQuery } from '@/lib/useQuery';
import { formatDate } from '@/lib/format';
import { usePublicOrg } from '@/layouts/PublicOrgLayout';
import { PriorityBadge, Spinner } from '@/components/ui';
import { activeAnnouncements, publicDocuments } from '@/pages/public/publicQueries';

export function OrgHomePage() {
  const { organization } = usePublicOrg();
  const base = `/o/${organization.slug}`;

  const { data, loading } = useQuery(async () => {
    const [pages, announcements, documents] = await Promise.all([
      supabase.from('pages').select('id, title, slug, summary').eq('organization_id', organization.id).eq('status', 'published').order('nav_order').then(unwrap),
      activeAnnouncements(organization.id),
      publicDocuments(organization.id),
    ]);
    return { pages, announcements, documents };
  }, [organization.id]);

  return (
    <>
      <section className="relative overflow-hidden text-white" style={{ backgroundColor: organization.primary_color }}>
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_0%,rgba(255,255,255,0.18),transparent_50%)]" />
        <div className="relative mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20">
          <h1 className="max-w-3xl text-4xl font-semibold tracking-tight sm:text-5xl">{organization.tagline ?? organization.name}</h1>
          {organization.description && <p className="mt-5 max-w-2xl text-lg text-white/85">{organization.description}</p>}
        </div>
      </section>

      {loading && !data ? (
        <Spinner />
      ) : data ? (
        <div className="mx-auto grid max-w-6xl gap-12 px-4 py-12 sm:px-6 lg:grid-cols-3">
          <section className="lg:col-span-2">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold text-slate-900">Announcements</h2>
              <Link to={`${base}/announcements`} className="text-sm font-medium text-slate-600 hover:text-slate-900">View all</Link>
            </div>
            {data.announcements.length === 0 ? (
              <p className="mt-6 text-sm text-slate-500">There are no active announcements right now.</p>
            ) : (
              <ul className="mt-6 space-y-4" data-testid="public-announcements">
                {data.announcements.slice(0, 4).map((a) => (
                  <li key={a.id} className="rounded-2xl border border-slate-200 p-5">
                    <div className="flex items-center gap-2"><PriorityBadge priority={a.priority} /><span className="text-xs text-slate-400">{formatDate(a.publish_at)}</span></div>
                    <h3 className="mt-2 font-semibold text-slate-900">{a.title}</h3>
                    <p className="mt-1 text-sm text-slate-600">{a.message}</p>
                  </li>
                ))}
              </ul>
            )}

            <h2 className="mt-12 text-xl font-semibold text-slate-900">Explore</h2>
            <div className="mt-6 grid gap-4 sm:grid-cols-2" data-testid="public-pages">
              {data.pages.map((p) => (
                <Link key={p.id} to={`${base}/pages/${p.slug}`} className="group rounded-2xl border border-slate-200 p-5 transition hover:border-slate-300 hover:shadow-sm">
                  <h3 className="flex items-center justify-between font-semibold text-slate-900">
                    {p.title}
                    <ArrowRight className="h-4 w-4 text-slate-300 transition group-hover:translate-x-0.5 group-hover:text-slate-600" />
                  </h3>
                  {p.summary && <p className="mt-1 text-sm text-slate-600">{p.summary}</p>}
                </Link>
              ))}
            </div>
          </section>

          <aside>
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold text-slate-900">Documents</h2>
              <Link to={`${base}/documents`} className="text-sm font-medium text-slate-600 hover:text-slate-900">All</Link>
            </div>
            <ul className="mt-6 space-y-3">
              {data.documents.slice(0, 5).map((d) => (
                <li key={d.id}>
                  <Link to={`${base}/documents`} className="flex gap-3 rounded-xl p-2 hover:bg-slate-50">
                    <FileText className="mt-0.5 h-5 w-5 shrink-0 text-red-500" />
                    <span>
                      <span className="block text-sm font-medium text-slate-900">{d.title}</span>
                      <span className="block text-xs text-slate-500">{d.category}</span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </aside>
        </div>
      ) : null}
    </>
  );
}
