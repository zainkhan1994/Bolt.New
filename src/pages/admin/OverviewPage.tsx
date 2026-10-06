import { Link } from 'react-router-dom';
import { FileCheck2, FilePen, FolderOpen, History, Megaphone, Users, type LucideIcon } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useOrg } from '@/lib/org';
import { unwrap, useQuery } from '@/lib/useQuery';
import { timeAgo } from '@/lib/format';
import { Alert, Card, EmptyState, PageHeader, PriorityBadge, Spinner, StatusBadge } from '@/components/ui';
import { describeAudit } from '@/lib/audit';

function Stat({ label, value, icon: Icon, to, testId }: { label: string; value: number; icon: LucideIcon; to: string; testId: string }) {
  return (
    <Link to={to} className="group rounded-xl bg-white p-5 shadow-sm ring-1 ring-slate-200 transition hover:ring-brand-300">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-slate-500">{label}</p>
        <Icon className="h-5 w-5 text-slate-400 group-hover:text-brand-600" />
      </div>
      <p className="mt-3 text-3xl font-semibold tracking-tight text-slate-900" data-testid={testId}>{value}</p>
    </Link>
  );
}

export function OverviewPage() {
  const { organization, basePath, can } = useOrg();
  const orgId = organization.id;
  const canSeeAudit = can('audit.view');

  const { data, error, loading } = useQuery(async () => {
    const count = (q: PromiseLike<{ count: number | null; error: { message: string } | null }>) =>
      Promise.resolve(q).then((r) => {
        if (r.error) throw new Error(r.error.message);
        return r.count ?? 0;
      });

    const [published, drafts, documents, members, announcements, recentPages, activity] = await Promise.all([
      count(supabase.from('pages').select('id', { count: 'exact', head: true }).eq('organization_id', orgId).eq('status', 'published')),
      count(supabase.from('pages').select('id', { count: 'exact', head: true }).eq('organization_id', orgId).eq('status', 'draft')),
      count(supabase.from('documents').select('id', { count: 'exact', head: true }).eq('organization_id', orgId)),
      count(supabase.from('organization_members').select('id', { count: 'exact', head: true }).eq('organization_id', orgId)),
      supabase.from('announcements').select('*').eq('organization_id', orgId).order('created_at', { ascending: false }).limit(5).then(unwrap),
      supabase.from('pages').select('id, title, status, updated_at').eq('organization_id', orgId).order('updated_at', { ascending: false }).limit(5).then(unwrap),
      canSeeAudit
        ? supabase.from('audit_logs').select('*').eq('organization_id', orgId).order('created_at', { ascending: false }).limit(8).then(unwrap)
        : Promise.resolve(null),
    ]);
    return { published, drafts, documents, members, announcements, recentPages, activity };
  }, [orgId, canSeeAudit]);

  return (
    <>
      <PageHeader title="Overview" description={`What's happening at ${organization.name}.`} />
      {error && <Alert tone="error" title="Could not load the overview">{error}</Alert>}
      {loading && !data ? (
        <Spinner />
      ) : data ? (
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <Stat label="Published pages" value={data.published} icon={FileCheck2} to={`${basePath}/pages`} testId="stat-published" />
            <Stat label="Draft pages" value={data.drafts} icon={FilePen} to={`${basePath}/pages`} testId="stat-drafts" />
            <Stat label="Documents" value={data.documents} icon={FolderOpen} to={`${basePath}/documents`} testId="stat-documents" />
            <Stat label="Team members" value={data.members} icon={Users} to={`${basePath}/users`} testId="stat-members" />
          </div>

          <div className="grid gap-6 lg:grid-cols-5">
            <Card className="lg:col-span-3">
              <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
                <h2 className="text-sm font-semibold text-slate-900">Recent announcements</h2>
                <Link to={`${basePath}/announcements`} className="text-sm font-medium text-brand-700">View all</Link>
              </div>
              {data.announcements.length === 0 ? (
                <EmptyState icon={Megaphone} title="No announcements yet" />
              ) : (
                <ul className="divide-y divide-slate-100">
                  {data.announcements.map((a) => (
                    <li key={a.id} className="flex items-start gap-3 px-5 py-3.5">
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-slate-900">{a.title}</p>
                        <p className="mt-0.5 line-clamp-1 text-sm text-slate-500">{a.message}</p>
                      </div>
                      <div className="flex shrink-0 flex-col items-end gap-1">
                        <PriorityBadge priority={a.priority} />
                        <span className="text-xs text-slate-400">{timeAgo(a.created_at)}</span>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </Card>

            <Card className="lg:col-span-2">
              <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
                <h2 className="text-sm font-semibold text-slate-900">Recent activity</h2>
                {canSeeAudit && <Link to={`${basePath}/audit`} className="text-sm font-medium text-brand-700">Audit log</Link>}
              </div>
              {data.activity ? (
                data.activity.length === 0 ? (
                  <EmptyState icon={History} title="No activity yet" />
                ) : (
                  <ul className="divide-y divide-slate-100" data-testid="recent-activity">
                    {data.activity.map((log) => (
                      <li key={log.id} className="px-5 py-3 text-sm">
                        <p className="text-slate-700">
                          <span className="font-medium text-slate-900">{log.actor_email ?? 'System'}</span> {describeAudit(log.action)}{' '}
                          {log.resource_label && log.action !== 'user.login' && <span className="font-medium text-slate-900">{log.resource_label}</span>}
                        </p>
                        <p className="mt-0.5 text-xs text-slate-400">{timeAgo(log.created_at)}</p>
                      </li>
                    ))}
                  </ul>
                )
              ) : (
                <ul className="divide-y divide-slate-100">
                  {data.recentPages.map((p) => (
                    <li key={p.id} className="flex items-center justify-between gap-3 px-5 py-3 text-sm">
                      <span className="truncate text-slate-700">{p.title}</span>
                      <span className="flex shrink-0 items-center gap-2">
                        <StatusBadge status={p.status} />
                        <span className="text-xs text-slate-400">{timeAgo(p.updated_at)}</span>
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          </div>
        </div>
      ) : null}
    </>
  );
}
