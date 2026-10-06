/*
# Create announcements table with role-based RLS

1. New Tables
- `announcements`
  - `id` (uuid, primary key)
  - `title` (text, not null)
  - `body` (text, not null)
  - `status` (text, not null, default 'draft') — values: 'draft' or 'published'
  - `author_id` (uuid, not null, references auth.users, defaults to auth.uid())
  - `created_at` (timestamptz, default now())
  - `updated_at` (timestamptz, default now())

2. Security
- Enable RLS on `announcements`.
- SELECT: anyone can read published announcements; authenticated admins can read all (including drafts); authenticated viewers can read all (including drafts, for the dashboard).
  - Public page reads as anon → sees only published.
  - Dashboard reads as authenticated → sees all.
- INSERT: only authenticated users whose JWT app_metadata role is 'admin'.
- UPDATE: only authenticated admins.
- DELETE: only authenticated admins.
- Role is stored in auth.users raw_app_meta_data (set via the Supabase dashboard or auth.admin API), accessed via (auth.jwt() ->> 'role').

3. Important Notes
- The frontend talks to Supabase with the anon key. Unauthenticated requests run as the `anon` role and can only see published announcements.
- Authenticated requests run as the `authenticated` role and can see all announcements (both draft and published) — this is for the dashboard.
- Write operations (INSERT/UPDATE/DELETE) are restricted to admins via JWT app_metadata role check. Viewers and unauthenticated users cannot write.
- `updated_at` is automatically maintained via a trigger.
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

-- SELECT: anon can read published; authenticated can read all (dashboard view)
DROP POLICY IF EXISTS "Public can read published announcements" ON announcements;
CREATE POLICY "Public can read published announcements"
ON announcements FOR SELECT
TO anon, authenticated
USING (status = 'published' OR (auth.jwt() ->> 'role') = 'admin' OR auth.uid() IS NOT NULL);

-- INSERT: admin only
DROP POLICY IF EXISTS "Admins can create announcements" ON announcements;
CREATE POLICY "Admins can create announcements"
ON announcements FOR INSERT
TO authenticated
WITH CHECK ((auth.jwt() ->> 'role') = 'admin' AND author_id = auth.uid());

-- UPDATE: admin only
DROP POLICY IF EXISTS "Admins can update announcements" ON announcements;
CREATE POLICY "Admins can update announcements"
ON announcements FOR UPDATE
TO authenticated
USING ((auth.jwt() ->> 'role') = 'admin')
WITH CHECK ((auth.jwt() ->> 'role') = 'admin');

-- DELETE: admin only
DROP POLICY IF EXISTS "Admins can delete announcements" ON announcements;
CREATE POLICY "Admins can delete announcements"
ON announcements FOR DELETE
TO authenticated
USING ((auth.jwt() ->> 'role') = 'admin');

-- updated_at trigger
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
