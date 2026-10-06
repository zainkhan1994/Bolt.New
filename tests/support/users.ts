/**
 * Demo accounts created by supabase/seed.sql. The password is the published local
 * demo password; override with E2E_PASSWORD when testing another environment.
 */
export const PASSWORD = process.env.E2E_PASSWORD ?? 'CommunityHub!2026';

export const users = {
  northstarAdmin: { email: 'admin@northstar.test', org: 'northstar-sd', role: 'Organization Admin' },
  northstarEditor: { email: 'editor@northstar.test', org: 'northstar-sd', role: 'Editor' },
  northstarViewer: { email: 'viewer@northstar.test', org: 'northstar-sd', role: 'Viewer' },
  riversideAdmin: { email: 'admin@riverside.test', org: 'riverside-community', role: 'Organization Admin' },
} as const;

export type UserKey = keyof typeof users;

export const orgs = {
  northstar: { id: '11111111-1111-4111-8111-111111111111', slug: 'northstar-sd', name: 'Northstar School District' },
  riverside: { id: '22222222-2222-4222-8222-222222222222', slug: 'riverside-community', name: 'Riverside Community Services' },
} as const;

export const storageStatePath = (key: UserKey) => `playwright/.auth/${key}.json`;
