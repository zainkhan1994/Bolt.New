import type { Database } from './database';

type PublicSchema = Database['public'];
export type Row<T extends keyof PublicSchema['Tables']> = PublicSchema['Tables'][T]['Row'];
export type Insert<T extends keyof PublicSchema['Tables']> = PublicSchema['Tables'][T]['Insert'];
export type Update<T extends keyof PublicSchema['Tables']> = PublicSchema['Tables'][T]['Update'];

export type Organization = Row<'organizations'>;
export type Profile = Row<'profiles'>;
export type OrganizationMember = Row<'organization_members'>;
export type Page = Row<'pages'>;
export type Announcement = Row<'announcements'>;
export type DocumentRecord = Row<'documents'>;
export type NotificationPreferences = Row<'notification_preferences'>;
export type AuditLog = Row<'audit_logs'>;

export type OrgRole = PublicSchema['Enums']['org_role'];
export type ContentStatus = PublicSchema['Enums']['content_status'];
export type AnnouncementPriority = PublicSchema['Enums']['announcement_priority'];

/** Effective role inside the dashboard. Super admins act as org admins in every org. */
export type EffectiveRole = OrgRole | 'super_admin';

export interface Membership {
  organization: Organization;
  role: EffectiveRole;
}

export type { Database };
