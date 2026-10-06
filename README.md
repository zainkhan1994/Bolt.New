# CommunityHub

A multi-tenant SaaS platform where school districts, municipalities and community organizations run their public website and community communication from one admin dashboard.

**Stack:** React 18 + TypeScript (strict) + Vite · Tailwind CSS · Supabase (Postgres, Auth, Storage, Row Level Security) · Playwright · GitHub Actions

The app has two sides:

| | URL | Who |
|---|---|---|
| **Public community portal** | `/o/:orgSlug` | Anyone. Shows published pages, active announcements and public documents, with search. |
| **Admin dashboard** | `/app/:orgSlug` | Signed-in members of that organization, with role-based permissions. |

---

## Contents

1. [Quick start](#quick-start)
2. [Demo accounts](#demo-accounts)
3. [Architecture](#architecture)
4. [Security model](#security-model)
5. [Environment variables](#environment-variables)
6. [Database & migrations](#database--migrations)
7. [Authentication configuration](#authentication-configuration)
8. [Testing with Playwright](#testing-with-playwright)
9. [Continuous integration](#continuous-integration)
10. [Production deployment](#production-deployment)
11. [Project structure](#project-structure)

---

## Quick start

Prerequisites: **Node 20+** and **Docker**, which runs the local Supabase stack.

```bash
git clone <repo-url> communityhub && cd communityhub
npm install

# 1. Start local Supabase. This applies every migration and supabase/seed.sql.
npm run db:start

# 2. Create .env from the values printed by `npx supabase status`
cp .env.example .env
#    VITE_SUPABASE_URL          = API_URL
#    VITE_SUPABASE_ANON_KEY     = PUBLISHABLE_KEY (or ANON_KEY)
#    SUPABASE_SERVICE_ROLE_KEY  = SECRET_KEY (or SERVICE_ROLE_KEY), used only by the seed script

# 3. Upload the PDFs behind the seeded documents
npm run db:seed:storage

# 4. Run the app
npm run dev            # http://localhost:5173
```

Local services: Supabase Studio at http://127.0.0.1:55423, and the email inbox (Mailpit) for verification and reset emails at http://127.0.0.1:55424.

> These ports are 554xx rather than Supabase's default 543xx, so CommunityHub can run alongside other local Supabase projects. You can change them in `supabase/config.toml`.

To reset everything back to the seed data (useful before a demo), run `npm run db:reset`.

## Demo accounts

All accounts are created by `supabase/seed.sql` for **local development only**. They share the password `CommunityHub!2026`. In dev mode, the sign-in page has one-click buttons to fill them in.

| Email | Organization | Role |
|---|---|---|
| `super@communityhub.test` | all | Super Admin |
| `admin@northstar.test` | Northstar School District | Organization Admin |
| `editor@northstar.test` | Northstar School District | Editor |
| `viewer@northstar.test` | Northstar School District | Viewer |
| `admin@riverside.test` | Riverside Community Services | Organization Admin |
| `editor@riverside.test` | Riverside Community Services | Editor |
| `viewer@riverside.test` | Riverside Community Services | Viewer |

Each organization has published pages, a private draft page, emergency, important and normal announcements, and public and internal PDFs. That lets you show tenant isolation with realistic private data.

## Architecture

```
Browser (React SPA)
  │  supabase-js, with the user's JWT on every request
  ▼
Supabase
  ├─ Auth ............ email + password, email verification, password reset (PKCE)
  ├─ PostgREST ....... auto-generated REST API over the `public` schema
  │     └─ Postgres RLS ← every request is authorized here
  ├─ Storage ......... private "documents" bucket, also protected by RLS
  └─ Postgres
        ├─ tables, constraints, indexes
        ├─ SECURITY DEFINER helpers (has_org_role, is_org_admin, …)
        ├─ triggers: audit log, published_at, profile bootstrap, last-admin guard
        └─ RPCs: add_member_by_email, create_organization, record_login
```

There is no custom backend server. Authorization lives in the database, so it applies to every client the same way: this UI, a script using the anon key, or a future mobile app.

### Data model

```
organizations ─┬─< organization_members >── profiles (1:1 auth.users) ──── notification_preferences
               ├─< pages
               ├─< announcements
               ├─< documents ───────── Storage: documents/<organization_id>/<file>.pdf
               └─< audit_logs
```

- Every table uses UUID primary keys and `created_at` / `updated_at` timestamps. `updated_at` is maintained by a trigger.
- Every organization-owned row carries `organization_id`, with `ON DELETE CASCADE`.
- `(organization_id, slug)` is unique for pages, so two organizations can both have `/about`.
- `documents.file_path` must start with its own `organization_id/`, enforced by a CHECK constraint. A metadata row can't point at another tenant's file.
- Enums: `org_role` (`org_admin`, `editor`, `viewer`), `content_status`, `announcement_priority`.

## Security model

> Hiding a button is never the security boundary. The UI uses `src/lib/permissions.ts` only to decide what to *show*. Every rule is enforced again in Postgres.

### Roles

| Capability | Viewer | Editor | Org Admin | Super Admin |
|---|:-:|:-:|:-:|:-:|
| View dashboard, drafts, internal documents | ✓ | ✓ | ✓ | ✓ (all orgs) |
| Create / edit / publish pages & announcements | | ✓ | ✓ | ✓ |
| Upload documents | | ✓ | ✓ | ✓ |
| Delete content and documents | | | ✓ | ✓ |
| Manage members and roles | | | ✓ | ✓ |
| Edit organization settings | | | ✓ | ✓ |
| Read audit log | | | ✓ | ✓ |
| Create organizations | | | | ✓ |

Roles are **rows in `organization_members`**. They are not stored in the JWT or in user metadata. A user can have a different role in each organization, and a role change takes effect on the next request with no re-login. The Super Admin flag is `profiles.is_super_admin`.

### How it is enforced

| Layer | What it does | Where |
|---|---|---|
| **RLS policies** | Every table has RLS enabled. Policies call `is_org_member()`, `can_edit_content()` and `is_org_admin()`, which check `organization_members` for `auth.uid()`. | `supabase/migrations/…_rls.sql` |
| **Column privileges** | Users can update only `full_name` and `avatar_url` on their profile, so they can't set `is_super_admin`. On memberships, only `role` is updatable, so a membership can't be moved to another org or user. Document `file_path` and `organization_id` are immutable. | same file |
| **WITH CHECK** | Updates are checked against the new row, so moving a page into another organization is rejected. | same file |
| **Last-admin guard** | A trigger prevents demoting or removing an organization's final Org Admin. | same file |
| **Storage policies** | Upload requires editor rights on the organization named in the first path segment. Download requires membership, or that the file backs a public document. Delete requires Org Admin. The bucket accepts only `application/pdf` up to 20 MB. | `…_storage.sql` |
| **Audit log** | Database triggers write audit rows. Clients have no INSERT, UPDATE or DELETE privilege on `audit_logs`, so entries can't be forged or erased, even by an Org Admin. | `…_audit_and_rpc.sql` |
| **RPCs** | `SECURITY DEFINER` functions check authorization in their first statement and use `search_path = ''`. | same file |
| **Route guards** | `ProtectedRoute` redirects anonymous users to `/login?redirect=…`. `OrgLayout` refuses org slugs the user isn't a member of. These guards are for UX only. | `src/components`, `src/layouts` |

### What is logged

`user.login`, `page.created|edited|published|unpublished|deleted`, `announcement.*`, `document.uploaded|edited|deleted`, `member.added|role_changed|removed`, `organization.created|settings_updated`. Each row stores actor, action, resource, timestamp, organization and JSON metadata, such as `{from: "viewer", to: "editor"}` for a role change.

### Review checklist (done for this prototype)

- [x] Every table has RLS enabled and at least one policy per operation it should allow.
- [x] No policy trusts client-editable data (`user_metadata`, request body org IDs without a membership check).
- [x] Role escalation: a viewer can't update their own membership, set `is_super_admin`, call `add_member_by_email`, or insert memberships in other organizations. All of these are covered by tests.
- [x] Cross-tenant reads and writes, including Storage, are rejected. Covered by tests.
- [x] Anonymous users see only published content of public organizations.
- [x] The service-role key is used only by a local Node script, never in the browser bundle.

## Environment variables

| Variable | Used by | Notes |
|---|---|---|
| `VITE_SUPABASE_URL` | app, tests | Supabase API URL |
| `VITE_SUPABASE_ANON_KEY` | app, tests | Public anon / publishable key. Safe in the browser; RLS protects data. |
| `SUPABASE_SERVICE_ROLE_KEY` | `scripts/seed-storage.mjs` only | **Secret.** Never prefix with `VITE_`. The script refuses non-local URLs unless `ALLOW_REMOTE_SEED=true`. |
| `VITE_SHOW_DEMO_ACCOUNTS` | app | Optional. Shows demo-account buttons outside dev mode. |
| `E2E_BASE_URL`, `E2E_PASSWORD` | Playwright | Optional. Run the suite against a deployed environment. |

See `.env.example`. Nothing secret is hardcoded in the source.

## Database & migrations

Migrations live in `supabase/migrations/` and run in timestamp order:

| File | Contents |
|---|---|
| `20261006000001_core_schema.sql` | Enums, tables, indexes, `updated_at` and `published_at` triggers, new-user → profile trigger |
| `20261006000002_rls.sql` | Helper functions, RLS policies, column privileges, last-admin guard |
| `20261006000003_audit_and_rpc.sql` | Audit triggers and RPCs (`record_login`, `add_member_by_email`, `create_organization`) |
| `20261006000004_storage.sql` | `documents` bucket and Storage policies |

Common commands:

```bash
npm run db:reset                                   # rebuild local DB from migrations + seed, upload seed PDFs
npx supabase migration new add_something           # create a new migration
npm run db:types                                   # regenerate src/types/database.ts from the local schema
```

After any schema change, run `npm run db:types` and commit the regenerated types. The frontend is type-checked against them.

## Authentication configuration

Supported flows: sign up → email verification → sign in, forgot password → emailed link → `/reset-password`, sign out, and persistent sessions with automatic refresh. Supabase Auth issues sessions. The app never stores roles or authorization state in `localStorage`.

Local settings are in `supabase/config.toml`:

- `site_url = "http://localhost:5173"`, with redirect URLs for `/auth/callback` and `/reset-password`
- `[auth.email] enable_confirmations = true`, so new accounts must verify their email. Local emails go to Mailpit at http://127.0.0.1:55424.

For a **hosted Supabase project**, open Dashboard → Authentication and do the following:

1. **URL Configuration:** set *Site URL* to your production domain. Add `https://your-domain/auth/callback` and `https://your-domain/reset-password` to *Redirect URLs*.
2. **Providers → Email:** turn on *Confirm email*. Set a minimum password length of at least 8.
3. **SMTP:** configure a real SMTP provider, such as Postmark, SES or Resend. The built-in sender is heavily rate-limited.
4. Optional: customize the confirmation and reset email templates.

New sign-ups get a profile and notification preferences automatically, through the `on_auth_user_created` trigger. They have **no organization access** until an Org Admin adds them from **Users → Add member**.

## Testing with Playwright

```bash
npx playwright install chromium        # first time only
npm run db:reset                       # optional: start from clean seed data
npm run test:e2e                       # starts Vite automatically
npm run test:e2e:ui                    # interactive UI mode
npm run test:e2e:report                # open the HTML report from the last run
```

`playwright.config.ts` loads `.env`, starts `npm run dev`, and runs a `setup` project. That project signs in once per role and saves the session to `playwright/.auth/`, which is git-ignored.

The suite tests the UI **and** calls the Supabase REST API directly as each user, through `tests/support/api.ts`. This proves the rules hold even when someone bypasses the frontend.

| # | Requirement | Spec |
|---|---|---|
| 1 | User login | `auth.spec.ts` |
| 2 | Invalid login | `auth.spec.ts` |
| 3 | Protected route redirect, including return-to-page after login | `auth.spec.ts` |
| 4 | Admin creates and publishes a page, and the audit entry is recorded | `content.spec.ts` |
| 5 | Editor edits a page, but cannot delete it (UI + API) | `content.spec.ts` |
| 6 | Viewer cannot edit content (UI + direct API insert and update) | `content.spec.ts` |
| 7 | Published page appears publicly; a draft does not, even via `?preview=1` | `content.spec.ts` |
| 8 | Org A cannot read or write Org B's data (UI, REST, RPC, Storage) | `isolation.spec.ts` |
| 9 | Document upload (UI → Storage → public portal), plus rejection of non-PDF and viewer uploads | `documents.spec.ts` |
| 10 | Logout clears the session and re-protects routes | `auth.spec.ts` |
| + | Role escalation and audit-log tampering are blocked | `isolation.spec.ts` |
| + | Sign-up → email verification → password reset, using real emails from local Mailpit | `account-lifecycle.spec.ts` |

Tests create uniquely named content and don't depend on each other's data. Run `npm run db:reset` to clear their records before a demo.

## Continuous integration

`.github/workflows/ci.yml` runs on every push to `main` and on every pull request:

1. **checks:** `npm ci`, typecheck, lint, production build
2. **e2e:** starts a real Supabase stack in the runner with `supabase start`, which applies migrations and seed data. It then uploads the seed PDFs, runs the full Playwright suite, and uploads the HTML report as an artifact.

Suggested branch protection on `main`: require both jobs to pass, and require pull-request review.

## Production deployment

**Database (Supabase Cloud)**

```bash
npx supabase login
npx supabase link --project-ref <your-project-ref>
npx supabase db push            # applies supabase/migrations — NOT seed.sql
```

Then apply the [authentication configuration](#authentication-configuration) above. Create the first Super Admin by signing up through the app, then running this once in the SQL editor:

```sql
update public.profiles set is_super_admin = true where email = 'you@your-org.org';
```

That user can then create organizations and appoint each organization's first admin from **All Organizations**.

**Frontend (any static host: Vercel, Netlify, Cloudflare Pages)**

- Build command `npm run build`, output directory `dist`
- Environment: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`. Never set the service-role key on the frontend host.
- SPA fallback: every path should serve `index.html`. `vercel.json` and `public/_redirects` (Netlify) are included.

## Project structure

```
src/
├── App.tsx                    # Route table (public, auth, dashboard)
├── lib/
│   ├── supabase.ts            # Typed Supabase client (PKCE)
│   ├── auth.tsx               # Session, profile, memberships, auth actions
│   ├── org.tsx                # Current organization + role context
│   ├── permissions.ts         # UI mirror of the RLS permission matrix
│   ├── audit.ts, documents.ts, format.ts, useQuery.ts
├── layouts/                   # AppLayout (dashboard shell), PublicOrgLayout, AuthLayout
├── components/                # UI kit, ProtectedRoute, RequirePermission, Markdown
├── pages/
│   ├── auth/                  # Sign in / up, forgot + reset password, email callback
│   ├── admin/                 # Overview, Pages, Page editor, Announcements, Documents,
│   │                          # Users, Settings, Audit log, Organizations, Account
│   └── public/                # Landing, org home, page view, announcements, documents, search
└── types/                     # database.ts (generated) + friendly aliases
supabase/
├── config.toml                # Local stack configuration
├── migrations/                # Schema, RLS, audit, storage
└── seed.sql                   # Demo organizations, users and content (local only)
scripts/seed-storage.mjs       # Uploads seed PDFs (local only)
tests/                         # Playwright specs + support helpers
.github/workflows/ci.yml       # CI: checks + e2e against real Supabase
```

### Known limitations / next steps

- Notification preferences are stored and editable, but sending email is not implemented yet. The next step is an Edge Function, or a database webhook to an email provider.
- Members must already have an account before they can be added. Email invitations would use `auth.admin.inviteUserByEmail` from an Edge Function.
- Public search uses `ILIKE`. For larger sites, add a Postgres full-text index (`tsvector`).
- Page bodies use a small, safe Markdown subset. A rich-text editor could be added later.
