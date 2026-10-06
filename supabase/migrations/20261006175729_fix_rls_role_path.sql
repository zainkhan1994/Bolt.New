/*
# Fix RLS policies to use correct JWT path for role

## Problem
The previous policies used `auth.jwt() ->> 'role'` which returns the PostgreSQL role
('authenticated' or 'anon'), not the custom app-level role ('admin' or 'viewer').

The custom role is stored in `raw_app_meta_data` and appears in the JWT under
`app_metadata.role`. The correct path is:
  `auth.jwt() -> 'app_metadata' ->> 'role'`

## Changes
- Drop and recreate all policies on `announcements` that reference role
- SELECT: published visible to all; all visible to authenticated users
- INSERT/UPDATE/DELETE: admin role only (via correct JWT path)
- The SELECT policy no longer needs the role check since all authenticated
  users can read all announcements (drafts are only shown in the dashboard)
*/

DROP POLICY IF EXISTS "Public can read published announcements" ON announcements;
CREATE POLICY "Public can read published announcements"
ON announcements FOR SELECT
TO anon, authenticated
USING (
  status = 'published'
  OR auth.uid() IS NOT NULL
);

DROP POLICY IF EXISTS "Admins can create announcements" ON announcements;
CREATE POLICY "Admins can create announcements"
ON announcements FOR INSERT
TO authenticated
WITH CHECK (
  (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
  AND author_id = auth.uid()
);

DROP POLICY IF EXISTS "Admins can update announcements" ON announcements;
CREATE POLICY "Admins can update announcements"
ON announcements FOR UPDATE
TO authenticated
USING ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin')
WITH CHECK ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

DROP POLICY IF EXISTS "Admins can delete announcements" ON announcements;
CREATE POLICY "Admins can delete announcements"
ON announcements FOR DELETE
TO authenticated
USING ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');
