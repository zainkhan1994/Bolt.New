import type { EffectiveRole } from '@/types';

/**
 * UI-side mirror of the RLS policies in supabase/migrations/20261006000002_rls.sql.
 *
 * These checks only decide what to *show*. Every write is re-checked by Postgres;
 * hiding a button is never the security boundary.
 */
const matrix = {
  'content.edit': ['super_admin', 'org_admin', 'editor'],
  'content.delete': ['super_admin', 'org_admin'],
  'documents.upload': ['super_admin', 'org_admin', 'editor'],
  'documents.delete': ['super_admin', 'org_admin'],
  'members.manage': ['super_admin', 'org_admin'],
  'settings.manage': ['super_admin', 'org_admin'],
  'audit.view': ['super_admin', 'org_admin'],
  'organizations.manage': ['super_admin'],
} as const satisfies Record<string, readonly EffectiveRole[]>;

export type Permission = keyof typeof matrix;

export function can(role: EffectiveRole | null | undefined, permission: Permission): boolean {
  if (!role) return false;
  return (matrix[permission] as readonly EffectiveRole[]).includes(role);
}

export const roleLabels: Record<EffectiveRole, string> = {
  super_admin: 'Super Admin',
  org_admin: 'Organization Admin',
  editor: 'Editor',
  viewer: 'Viewer',
};

export const roleDescriptions: Record<EffectiveRole, string> = {
  super_admin: 'Manages every organization on the platform.',
  org_admin: 'Manages users, content, documents and settings.',
  editor: 'Creates and edits content. Cannot manage users or settings.',
  viewer: 'Read-only access to the dashboard.',
};
