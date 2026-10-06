import type { ReactNode } from 'react';
import { ShieldAlert } from 'lucide-react';
import { useOrg } from '@/lib/org';
import { roleLabels, type Permission } from '@/lib/permissions';
import { Card, EmptyState } from '@/components/ui';

/** UX guard for whole screens. The database enforces the same rule independently. */
export function RequirePermission({ permission, children }: { permission: Permission; children: ReactNode }) {
  const { can, role } = useOrg();
  if (can(permission)) return <>{children}</>;
  return (
    <Card>
      <EmptyState
        icon={ShieldAlert}
        title="You don't have access to this area"
        description={`Your role (${roleLabels[role]}) doesn't include this permission. Ask an Organization Admin if you need access.`}
      />
    </Card>
  );
}
