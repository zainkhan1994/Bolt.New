export type AnnouncementStatus = 'draft' | 'published';

export interface Announcement {
  id: string;
  title: string;
  body: string;
  status: AnnouncementStatus;
  author_id: string;
  created_at: string;
  updated_at: string;
}

export type UserRole = 'admin' | 'viewer';

export interface AppUser {
  id: string;
  email: string;
  role: UserRole;
}
