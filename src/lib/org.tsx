import { createContext, useContext, type ReactNode } from 'react';
import type { EffectiveRole, Organization } from '@/types';
import { can, type Permission } from '@/lib/permissions';

interface OrgContextValue {
  organization: Organization;
  role: EffectiveRole;
  can: (permission: Permission) => boolean;
  /** Prefix for dashboard links inside this organization, e.g. /app/northstar-sd */
  basePath: string;
}

const OrgContext = createContext<OrgContextValue | undefined>(undefined);

export function OrgProvider({ organization, role, children }: { organization: Organization; role: EffectiveRole; children: ReactNode }) {
  const value: OrgContextValue = {
    organization,
    role,
    can: (permission) => can(role, permission),
    basePath: `/app/${organization.slug}`,
  };
  return <OrgContext.Provider value={value}>{children}</OrgContext.Provider>;
}

export function useOrg(): OrgContextValue {
  const ctx = useContext(OrgContext);
  if (!ctx) throw new Error('useOrg must be used inside an organization route');
  return ctx;
}
