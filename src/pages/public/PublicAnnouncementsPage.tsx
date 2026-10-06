import { Megaphone } from 'lucide-react';
import { useQuery } from '@/lib/useQuery';
import { formatDateTime } from '@/lib/format';
import { usePublicOrg } from '@/layouts/PublicOrgLayout';
import { EmptyState, PriorityBadge, Spinner } from '@/components/ui';
import { activeAnnouncements } from '@/pages/public/publicQueries';

export function PublicAnnouncementsPage() {
  const { organization } = usePublicOrg();
  const { data, loading } = useQuery(() => activeAnnouncements(organization.id), [organization.id]);

  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
      <h1 className="text-3xl font-semibold tracking-tight text-slate-900">Announcements</h1>
      {loading && !data ? (
        <Spinner />
      ) : !data?.length ? (
        <EmptyState icon={Megaphone} title="No active announcements" />
      ) : (
        <ul className="mt-8 space-y-4" data-testid="public-announcements">
          {data.map((a) => (
            <li key={a.id} className={a.priority === 'emergency' ? 'rounded-2xl border border-red-200 bg-red-50/50 p-6' : 'rounded-2xl border border-slate-200 p-6'}>
              <div className="flex flex-wrap items-center gap-2">
                <PriorityBadge priority={a.priority} />
                <span className="text-xs capitalize text-slate-500">For {a.audience}</span>
                <span className="text-xs text-slate-400">· {formatDateTime(a.publish_at)}</span>
              </div>
              <h2 className="mt-3 text-lg font-semibold text-slate-900">{a.title}</h2>
              <p className="mt-2 text-slate-600">{a.message}</p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
