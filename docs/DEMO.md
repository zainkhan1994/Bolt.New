# Demo walkthrough (about 10 minutes)

Before you start:

```bash
npm run db:start      # if it's not already running
npm run db:reset      # clean seed data + seed PDFs
npm run dev           # http://localhost:5173
```

Open Supabase Studio at http://127.0.0.1:55423 in a second tab.

## 1. Admin publishes, and the change goes live publicly (3 min)

1. Go to http://localhost:5173 and open **Northstar School District**. Point out the red emergency banner, the announcements, the pages and the document center. All of it comes from Postgres.
2. Click **Staff sign in**, then the **Northstar · Admin** demo button.
3. **Overview:** published and draft counts, documents, team members, recent activity.
4. **Pages → New page.** Type a title (the slug fills in automatically) and a body, then **Save draft**. Click **Preview** to see the draft rendered as the public page, with a "draft" banner.
5. Click **Publish**, then **View public site**. The page is now live and appears in **Explore**.
6. **Audit Log:** `page.created` and `page.published`, attributed to the admin. These rows are written by a database trigger, not by the frontend.

## 2. A Viewer cannot edit (1 min)

1. Sign out and sign in as **Northstar · Viewer**.
2. Open **Pages**: there is no "New page" button, and you see "Read-only access". Open a page: the fields are disabled. **Audit Log** is not in the menu.
3. Talking point: *"Hiding buttons isn't security. The next step proves the database enforces this."*

## 3. Playwright proves it (2 min)

```bash
npx playwright test tests/content.spec.ts -g "viewer" --headed
```

- The test checks the read-only UI, **then signs in as the viewer through the REST API**. It tries an insert, an update and a fake emergency announcement, and asserts that Postgres rejects each one with a row-level security error.
- Then run the full suite with `npm run test:e2e` (21 tests, including 3 sign-in setup steps), or open `npx playwright show-report`.

## 4. Organization A cannot see Organization B (2 min)

1. Still signed in as a Northstar user, change the URL to `/app/riverside-community`. You'll see *"You are not a member of this organization."*
2. Run the isolation spec:

   ```bash
   npx playwright test tests/isolation.spec.ts --reporter=list
   ```

   A Northstar **Org Admin** queries Riverside's draft pages, internal documents, roster and audit log, and gets `[]`. Inserting into Riverside, moving a page there, adding themselves as a member, or downloading Riverside's confidential PDF from Storage are all rejected.
3. The sanity check in the same test shows Riverside's own admin **does** see that data.

## 5. RLS policies in Supabase (2 min)

1. In Studio, open **Authentication → Policies**. Every table shows RLS enabled with named policies, such as *"Editors and admins update pages"* and *"Org admins delete pages"*.
2. Open `supabase/migrations/20261006000002_rls.sql`. The permission matrix at the top of the file matches the policies below it.
3. Point out the extra layers:
   - Column privileges: users can't set `is_super_admin` or change a membership's organization.
   - `WITH CHECK` stops a page from being moved into another tenant.
   - The last-admin guard trigger.
   - Storage policies keyed on the `<organization_id>/` folder.
   - `audit_logs` has no client write privilege at all.

## 6. GitHub (1 min)

`.github/workflows/ci.yml` runs typecheck, lint and build, then starts a **real Supabase stack inside GitHub Actions**, applies the migrations and seed data, and runs the whole Playwright suite on every pull request.
