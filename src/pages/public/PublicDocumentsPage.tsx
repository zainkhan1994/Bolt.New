import { useMemo, useState } from 'react';
import { Download, FileText, FolderOpen, Search } from 'lucide-react';
import { useQuery } from '@/lib/useQuery';
import { errorMessage, formatBytes, formatDate } from '@/lib/format';
import { usePublicOrg } from '@/layouts/PublicOrgLayout';
import { Alert, cn, EmptyState, Spinner } from '@/components/ui';
import { openDocument } from '@/lib/documents';
import { publicDocuments } from '@/pages/public/publicQueries';

export function PublicDocumentsPage() {
  const { organization } = usePublicOrg();
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { data, loading } = useQuery(() => publicDocuments(organization.id), [organization.id]);

  const categories = useMemo(() => Array.from(new Set((data ?? []).map((d) => d.category))).sort(), [data]);
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return (data ?? []).filter((d) => (!category || d.category === category) && (!q || `${d.title} ${d.description ?? ''}`.toLowerCase().includes(q)));
  }, [data, query, category]);

  return (
    <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6">
      <h1 className="text-3xl font-semibold tracking-tight text-slate-900">Document Center</h1>
      <p className="mt-2 text-slate-600">Policies, forms, meeting agendas and reports.</p>

      <div className="mt-8 relative">
        <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search documents" aria-label="Search documents" className="h-11 w-full rounded-xl border-0 bg-slate-100 pl-11 pr-4 text-sm focus:ring-2 focus:ring-[var(--org-color)]" />
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        {[null, ...categories].map((c) => (
          <button
            key={c ?? 'all'}
            type="button"
            onClick={() => setCategory(c)}
            className={cn('rounded-full px-3 py-1 text-sm font-medium', category === c ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200')}
          >
            {c ?? 'All'}
          </button>
        ))}
      </div>

      {error && <div className="mt-6"><Alert tone="error">{error}</Alert></div>}
      {loading && !data ? (
        <Spinner />
      ) : filtered.length === 0 ? (
        <EmptyState icon={FolderOpen} title="No documents found" />
      ) : (
        <ul className="mt-8 divide-y divide-slate-200 rounded-2xl border border-slate-200" data-testid="public-documents">
          {filtered.map((d) => (
            <li key={d.id} className="flex items-center gap-4 p-5">
              <FileText className="h-8 w-8 shrink-0 text-red-500" />
              <div className="min-w-0 flex-1">
                <p className="font-medium text-slate-900">{d.title}</p>
                {d.description && <p className="mt-0.5 text-sm text-slate-600">{d.description}</p>}
                <p className="mt-1 text-xs text-slate-400">{d.category} · {formatBytes(d.file_size)} · {formatDate(d.created_at)}</p>
              </div>
              <button
                type="button"
                onClick={() => openDocument(d).catch((e) => setError(errorMessage(e)))}
                className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium text-slate-700 ring-1 ring-slate-300 hover:bg-slate-50"
              >
                <Download className="h-4 w-4" /> PDF
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
