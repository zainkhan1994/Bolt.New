/*
# Create announcements table with role-based RLS

## Overview
Creates the `announcements` table and configures Row Level Security policies
that enforce role-based access control for a school/community CMS.

## New Tables
- `announcements`
  - `id` (uuid, primary key, auto-generated)
  - `title` (text, not null) — announcement headline
  - `body` (text, not null) — announcement content
  - `status` (text, not null, default 'draft') — 'draft' or 'published'
  - `author_id` (uuid, not null, references auth.users, defaults to auth.uid())
  - `created_at` (timestamptz, default now())
  - `updated_at` (timestamptz, default now(), auto-updated via trigger)

## Security (RLS)
- SELECT: anon can read published only; authenticated users can read all
- INSERT: admin role only (via auth.jwt() -> 'app_metadata' ->> 'role'), author_id must match auth.uid()
- UPDATE: admin role only
- DELETE: admin role only
- Role is stored in raw_app_meta_data and accessed via auth.jwt() -> 'app_metadata' ->> 'role'

## Notes
1. auth.jwt() ->> 'role' returns the PostgreSQL role ('authenticated'/'anon'),
   NOT the custom app role. The custom role lives at app_metadata.role.
2. The frontend uses the anon key. Unauthenticated requests see only published.
3. Authenticated requests (dashboard) see all announcements including drafts.
4. Write operations check (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin' at the DB level.
5. Viewers cannot write even if they bypass the UI — RLS blocks them.
*/

CREATE TABLE IF NOT EXISTS announcements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  body text NOT NULL,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published')),
  author_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE announcements ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can read published announcements" ON announcements;
CREATE POLICY "Public can read published announcements"
ON announcements FOR SELECT
TO anon, authenticated
USING (status = 'published' OR auth.uid() IS NOT NULL);

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

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS announcements_updated_at ON announcements;
CREATE TRIGGER announcements_updated_at
BEFORE UPDATE ON announcements
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();
