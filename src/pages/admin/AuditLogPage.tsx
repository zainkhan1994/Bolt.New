import { useMemo, useState } from 'react';
import { Download, History } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useOrg } from '@/lib/org';
import { unwrap, useQuery } from '@/lib/useQuery';
import { formatDateTime } from '@/lib/format';
import { RequirePermission } from '@/components/RequirePermission';
import { Alert, Badge, Button, Card, EmptyState, PageHeader, Select, Spinner } from '@/components/ui';
import type { AuditLog } from '@/types';

function tone(action: string): 'green' | 'red' | 'blue' | 'violet' | 'slate' | 'amber' {
  if (action.endsWith('.deleted') || action.endsWith('.removed')) return 'red';
  if (action.endsWith('.published') || action.endsWith('.uploaded')) return 'green';
  if (action.startsWith('member.')) return 'violet';
  if (action === 'user.login') return 'slate';
  if (action.endsWith('.unpublished')) return 'amber';
  return 'blue';
}

function metadataSummary(log: AuditLog): string {
  const m = log.metadata as Record<string, unknown> | null;
  if (!m) return '';
  if (log.action === 'member.role_changed') return `${m.from} → ${m.to}`;
  if (typeof m.role === 'string') return `role: ${m.role}`;
  return '';
}

function toCsv(rows: AuditLog[]): string {
  const esc = (v: unknown) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const header = ['timestamp', 'user', 'action', 'resource_type', 'resource', 'details'];
  return [header.join(','), ...rows.map((r) => [r.created_at, r.actor_email, r.action, r.resource_type, r.resource_label, metadataSummary(r)].map(esc).join(','))].join('\n');
}

function AuditLogInner() {
  const { organization } = useOrg();
  const [resource, setResource] = useState('all');

  const { data, error, loading } = useQuery(
    () => supabase.from('audit_logs').select('*').eq('organization_id', organization.id).order('created_at', { ascending: false }).limit(500).then(unwrap),
    [organization.id],
  );

  const rows = useMemo(() => (data ?? []).filter((r) => resource === 'all' || r.resource_type === resource), [data, resource]);

  const exportCsv = () => {
    const blob = new Blob([toCsv(rows)], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${organization.slug}-audit-log.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <>
      <PageHeader
        title="Audit Log"
        description="Every administrative action, recorded by the database. Entries cannot be edited or deleted."
        actions={<Button variant="secondary" icon={Download} onClick={exportCsv} disabled={!rows.length}>Export CSV</Button>}
      />
      <Card>
        <div className="border-b border-slate-100 p-4">
          <Select value={resource} onChange={(e) => setResource(e.target.value)} className="sm:w-56" aria-label="Filter by resource">
            <option value="all">All activity</option>
            <option value="user">Sign-ins</option>
            <option value="page">Pages</option>
            <option value="announcement">Announcements</option>
            <option value="document">Documents</option>
            <option value="member">Members & roles</option>
            <option value="organization">Organization</option>
          </Select>
        </div>
        {error && <div className="p-4"><Alert tone="error">{error}</Alert></div>}
        {loading && !data ? (
          <Spinner />
        ) : rows.length === 0 ? (
          <EmptyState icon={History} title="No activity recorded" />
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-100 text-sm" data-testid="audit-table">
              <thead className="bg-slate-50 text-left text-xs font-medium uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-5 py-3">When</th>
                  <th className="px-5 py-3">User</th>
                  <th className="px-5 py-3">Action</th>
                  <th className="px-5 py-3">Resource</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rows.map((log) => (
                  <tr key={log.id}>
                    <td className="whitespace-nowrap px-5 py-3 text-slate-500">{formatDateTime(log.created_at)}</td>
                    <td className="px-5 py-3 text-slate-700">{log.actor_email ?? 'System'}</td>
                    <td className="px-5 py-3"><Badge tone={tone(log.action)}>{log.action}</Badge></td>
                    <td className="px-5 py-3 text-slate-700">
                      {log.resource_label}
                      {metadataSummary(log) && <span className="ml-2 text-xs text-slate-400">{metadataSummary(log)}</span>}
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

export function AuditLogPage() {
  return (
    <RequirePermission permission="audit.view">
      <AuditLogInner />
    </RequirePermission>
  );
}
