# Riverside Academy — School/Community CMS

A production-quality school announcement CMS built with **React + TypeScript + Vite**, backed by **Supabase** (PostgreSQL, Auth, Row Level Security). Includes **Playwright** end-to-end tests that prove the security model works.

## Features

- **Public page** — anyone can view published school announcements. No login required.
- **Authentication** — Supabase email/password auth with two roles: **Admin** and **Viewer**.
- **Admin dashboard** — create, edit, publish, and delete announcements. Published announcements appear on the public page immediately.
- **Viewer dashboard** — log in and browse all announcements (including drafts) but **cannot** create, edit, publish, or delete. This is enforced by Supabase RLS, not just hidden UI.
- **Row Level Security** — all write operations are gated at the database level. Even if a Viewer bypasses the UI, the database rejects the operation.

## Architecture

### Roles

Roles are stored in Supabase Auth's `raw_app_meta_data` (user-immutable — users cannot change their own role) and accessed in RLS policies via `auth.jwt() ->> 'role'`.

| Role   | Public page | Dashboard | Create | Edit | Publish | Delete |
|--------|-------------|-----------|--------|------|---------|--------|
| Anon   | Published only | Redirected to login | No | No | No | No |
| Viewer | Published only | Read all | No | No | No | No |
| Admin  | Published only | Read all | Yes | Yes | Yes | Yes |

### Database Schema

```sql
announcements (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title       text NOT NULL,
  body        text NOT NULL,
  status      text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published')),
  author_id   uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at  timestamptz DEFAULT now(),
  updated_at  timestamptz DEFAULT now()
)
```

### RLS Policies

| Operation | Policy |
|-----------|--------|
| SELECT | Anyone (anon + authenticated) can read published. Authenticated users can read all (for dashboard). |
| INSERT | Authenticated users with `role = 'admin'` only. `author_id` must match `auth.uid()`. |
| UPDATE | Authenticated users with `role = 'admin'` only. |
| DELETE | Authenticated users with `role = 'admin'` only. |

## Supabase Setup

### 1. Environment Variables

The following are pre-configured in `.env`:

```
VITE_SUPABASE_URL=https://<your-project>.supabase.co
VITE_SUPABASE_ANON_KEY=<your-anon-key>
```

If you are setting up a new Supabase project, create a project at [supabase.com](https://supabase.com), then find your URL and anon key in **Project Settings → API** and add them to `.env`.

### 2. Database Migration

The schema and RLS policies are applied via the Supabase MCP migration tool. If you need to apply them manually in the Supabase SQL Editor, run the migration SQL from `supabase/migrations/create_announcements_table.sql`.

### 3. Create Test Users

Two test users are pre-configured with roles:

| Email             | Password           | Role   |
|-------------------|--------------------|--------|
| `admin@school.edu`  | `Sch00lAdm!n2025`  | Admin  |
| `viewer@school.edu` | `Sch00lV!ew2025`   | Viewer |

**To create users in your own Supabase project:**

1. Go to **Supabase Dashboard → Authentication → Users → Add user**.
2. Create `admin@school.edu` with password `Sch00lAdm!n2025`.
3. After creating, click the user, scroll to **App Metadata**, add key `role` with value `admin`.
4. Repeat for `viewer@school.edu` with `role` set to `viewer`.

The role must be in **App Metadata** (`raw_app_meta_data`), not **User Metadata** — User Metadata is editable by the user and would allow privilege escalation.

### 4. Email Confirmation

Email confirmation is **OFF** by default. Keep it off for this prototype so test users can sign in immediately.

## Running the App

```bash
npm install
npm run dev
```

The app runs at `http://localhost:5173`.

## Running Playwright Tests

### Prerequisites

Playwright requires a Chromium browser. Install it with:

```bash
npx playwright install chromium
```

On systems without a display (CI servers), you may also need system dependencies:

```bash
npx playwright install-deps chromium
```

If you have a system-installed Chromium (e.g. `/usr/bin/chromium`), the config already points to it via `executablePath`.

### Run Tests

```bash
# Run all tests (starts the dev server automatically)
npx playwright test

# Run with a visible browser
npx playwright test --headed

# Run a specific test file
npx playwright test tests/announcements.spec.ts

# View the HTML report after a run
npx playwright show-report
```

The Playwright config (`playwright.config.ts`) automatically starts the Vite dev server on port 5173 before running tests.

### Test Cases

1. **Admin can create and publish an announcement** — logs in as admin, creates a published announcement, verifies it appears on the public page.
2. **Published announcement appears publicly** — creates a published announcement, signs out, verifies it is visible without login.
3. **Viewer cannot modify announcements** — logs in as viewer, verifies no create/edit/delete buttons, and verifies that a direct database insert via the Supabase client is rejected by RLS.
4. **Unauthenticated users cannot access the dashboard** — navigates to `/dashboard` without login, verifies redirect to `/login`.
5. **Draft announcements are not visible on the public page** — creates a draft, verifies it appears in the dashboard but not on the public page.

## Project Structure

```
src/
├── App.tsx                      # Router + route definitions
├── main.tsx                     # React entry point
├── index.css                    # Tailwind base
├── lib/
│   ├── supabase.ts              # Supabase client singleton
│   └── auth.tsx                 # Auth context provider + useAuth hook
├── types/
│   └── index.ts                 # TypeScript types (Announcement, AppUser, etc.)
├── components/
│   └── ProtectedRoute.tsx       # Route guard for authenticated pages
└── pages/
    ├── PublicPage.tsx           # Public announcements page (/)
    ├── LoginPage.tsx            # Sign in / sign up (/login)
    └── DashboardPage.tsx        # Admin & Viewer dashboard (/dashboard)
tests/
└── announcements.spec.ts        # Playwright E2E tests
playwright.config.ts             # Playwright configuration
```

## Tech Stack

- **React 18** + **TypeScript** + **Vite**
- **Tailwind CSS** for styling
- **Supabase** (PostgreSQL, Auth, RLS)
- **React Router** for navigation
- **Lucide React** for icons
- **Playwright** for E2E testing

## Security Notes

- **No mocked auth or permissions.** All authentication goes through Supabase Auth. All authorization is enforced by PostgreSQL Row Level Security policies.
- **Roles are user-immutable.** Stored in `raw_app_meta_data`, not `raw_user_meta_data`. Users cannot elevate their own role.
- **Viewer restrictions are real.** Even if a Viewer opens the browser console and calls `supabase.from('announcements').insert(...)`, the database rejects it.
- **Drafts are protected.** Unauthenticated users can only see `status = 'published'` rows.
