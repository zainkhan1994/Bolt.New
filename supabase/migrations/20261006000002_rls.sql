/*
  CommunityHub — Row Level Security

  Permission matrix (enforced here, mirrored in the UI only for usability):

  | Resource               | anon             | viewer | editor          | org_admin | super_admin |
  |------------------------|------------------|--------|-----------------|-----------|-------------|
  | organizations (read)   | public orgs      | own    | own             | own       | all         |
  | organizations (update) | -                | -      | -               | own       | all         |
  | organizations (create) | -                | -      | -               | -         | yes         |
  | members (read)         | -                | own org| own org         | own org   | all         |
  | members (write)        | -                | -      | -               | own org   | all         |
  | pages/announcements    | published only   | read   | create/edit     | all       | all         |
  |   delete               | -                | -      | -               | yes       | yes         |
  | documents              | public only      | read   | upload/edit     | all       | all         |
  | audit_logs (read)      | -                | -      | -               | own org   | all         |
  | audit_logs (write)     | never — only SECURITY DEFINER triggers / RPCs        |

  Helper functions are SECURITY DEFINER so they can read organization_members without
  recursing into its own RLS policies. They only ever answer questions about auth.uid().
*/

-- ---------------------------------------------------------------------------
-- Helper functions
-- ---------------------------------------------------------------------------
create or replace function public.is_super_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(
    (select p.is_super_admin from public.profiles p where p.id = (select auth.uid())),
    false
  );
$$;

create or replace function public.has_org_role(org_id uuid, roles public.org_role[])
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select public.is_super_admin()
      or exists (
        select 1
        from public.organization_members m
        where m.organization_id = org_id
          and m.user_id = (select auth.uid())
          and m.role = any (roles)
      );
$$;

create or replace function public.is_org_member(org_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select public.has_org_role(org_id, array['org_admin', 'editor', 'viewer']::public.org_role[]);
$$;

create or replace function public.can_edit_content(org_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select public.has_org_role(org_id, array['org_admin', 'editor']::public.org_role[]);
$$;

create or replace function public.is_org_admin(org_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select public.has_org_role(org_id, array['org_admin']::public.org_role[]);
$$;

-- Do the current user and `other` share at least one organization?
create or replace function public.shares_org_with(other uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.organization_members mine
    join public.organization_members theirs on theirs.organization_id = mine.organization_id
    where mine.user_id = (select auth.uid()) and theirs.user_id = other
  );
$$;

revoke execute on function public.is_super_admin() from public, anon;
revoke execute on function public.has_org_role(uuid, public.org_role[]) from public, anon;
revoke execute on function public.is_org_member(uuid) from public, anon;
revoke execute on function public.can_edit_content(uuid) from public, anon;
revoke execute on function public.is_org_admin(uuid) from public, anon;
revoke execute on function public.shares_org_with(uuid) from public, anon;
grant execute on function public.is_super_admin() to authenticated;
grant execute on function public.has_org_role(uuid, public.org_role[]) to authenticated;
grant execute on function public.is_org_member(uuid) to authenticated;
grant execute on function public.can_edit_content(uuid) to authenticated;
grant execute on function public.is_org_admin(uuid) to authenticated;
grant execute on function public.shares_org_with(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- Enable RLS everywhere
-- ---------------------------------------------------------------------------
alter table public.organizations            enable row level security;
alter table public.profiles                 enable row level security;
alter table public.organization_members     enable row level security;
alter table public.pages                    enable row level security;
alter table public.announcements            enable row level security;
alter table public.documents                enable row level security;
alter table public.notification_preferences enable row level security;
alter table public.audit_logs               enable row level security;

-- ---------------------------------------------------------------------------
-- Column-level privileges: block privilege escalation through "harmless" updates
-- ---------------------------------------------------------------------------
-- profiles: a user may edit their name/avatar, never is_super_admin / email / id.
revoke insert, update, delete on public.profiles from anon, authenticated;
grant update (full_name, avatar_url) on public.profiles to authenticated;

-- organization_members: only `role` is mutable; a membership can't be moved to another org/user.
revoke update on public.organization_members from anon, authenticated;
grant update (role) on public.organization_members to authenticated;

-- audit_logs: read-only for clients.
revoke insert, update, delete on public.audit_logs from anon, authenticated;

-- anon never writes anything.
revoke insert, update, delete on all tables in schema public from anon;

-- ---------------------------------------------------------------------------
-- organizations
-- ---------------------------------------------------------------------------
create policy "Public organizations are readable by everyone"
  on public.organizations for select
  to anon, authenticated
  using (is_public or (select public.is_org_member(id)));

create policy "Super admins create organizations"
  on public.organizations for insert
  to authenticated
  with check ((select public.is_super_admin()));

create policy "Org admins update their organization"
  on public.organizations for update
  to authenticated
  using ((select public.is_org_admin(id)))
  with check ((select public.is_org_admin(id)));

create policy "Super admins delete organizations"
  on public.organizations for delete
  to authenticated
  using ((select public.is_super_admin()));

-- ---------------------------------------------------------------------------
-- profiles
-- ---------------------------------------------------------------------------
create policy "Users read own profile and teammates"
  on public.profiles for select
  to authenticated
  using (
    id = (select auth.uid())
    or (select public.is_super_admin())
    or public.shares_org_with(id)
  );

create policy "Users update own profile"
  on public.profiles for update
  to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

-- ---------------------------------------------------------------------------
-- organization_members
-- ---------------------------------------------------------------------------
create policy "Members read their organization's roster"
  on public.organization_members for select
  to authenticated
  using ((select public.is_org_member(organization_id)));

create policy "Org admins add members"
  on public.organization_members for insert
  to authenticated
  with check ((select public.is_org_admin(organization_id)));

create policy "Org admins change roles"
  on public.organization_members for update
  to authenticated
  using ((select public.is_org_admin(organization_id)))
  with check ((select public.is_org_admin(organization_id)));

create policy "Org admins remove members; users may leave"
  on public.organization_members for delete
  to authenticated
  using ((select public.is_org_admin(organization_id)) or user_id = (select auth.uid()));

-- Never leave an organization without an admin (prevents accidental lock-out and
-- "demote the other admin then yourself" races).
create or replace function public.ensure_org_keeps_admin()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  org uuid := coalesce(old.organization_id, new.organization_id);
begin
  if old.role = 'org_admin'
     and (tg_op = 'DELETE' or new.role <> 'org_admin')
     and exists (select 1 from public.organizations o where o.id = org)
     and not exists (
       select 1 from public.organization_members m
       where m.organization_id = org and m.role = 'org_admin' and m.id <> old.id
     ) then
    raise exception 'An organization must keep at least one Organization Admin'
      using errcode = 'check_violation';
  end if;
  return coalesce(new, old);
end;
$$;

create trigger organization_members_keep_admin
  before update or delete on public.organization_members
  for each row execute function public.ensure_org_keeps_admin();

-- ---------------------------------------------------------------------------
-- pages
-- ---------------------------------------------------------------------------
create policy "Published pages of public orgs are readable by everyone"
  on public.pages for select
  to anon, authenticated
  using (
    status = 'published'
    and exists (select 1 from public.organizations o where o.id = organization_id and o.is_public)
  );

create policy "Members read all pages in their organization"
  on public.pages for select
  to authenticated
  using ((select public.is_org_member(organization_id)));

create policy "Editors and admins create pages"
  on public.pages for insert
  to authenticated
  with check ((select public.can_edit_content(organization_id)) and author_id = (select auth.uid()));

create policy "Editors and admins update pages"
  on public.pages for update
  to authenticated
  using ((select public.can_edit_content(organization_id)))
  with check ((select public.can_edit_content(organization_id)));

create policy "Org admins delete pages"
  on public.pages for delete
  to authenticated
  using ((select public.is_org_admin(organization_id)));

-- ---------------------------------------------------------------------------
-- announcements
-- ---------------------------------------------------------------------------
create policy "Active announcements of public orgs are readable by everyone"
  on public.announcements for select
  to anon, authenticated
  using (
    status = 'published'
    and publish_at <= now()
    and (expires_at is null or expires_at > now())
    and exists (select 1 from public.organizations o where o.id = organization_id and o.is_public)
  );

create policy "Members read all announcements in their organization"
  on public.announcements for select
  to authenticated
  using ((select public.is_org_member(organization_id)));

create policy "Editors and admins create announcements"
  on public.announcements for insert
  to authenticated
  with check ((select public.can_edit_content(organization_id)) and author_id = (select auth.uid()));

create policy "Editors and admins update announcements"
  on public.announcements for update
  to authenticated
  using ((select public.can_edit_content(organization_id)))
  with check ((select public.can_edit_content(organization_id)));

create policy "Org admins delete announcements"
  on public.announcements for delete
  to authenticated
  using ((select public.is_org_admin(organization_id)));

-- ---------------------------------------------------------------------------
-- documents
-- ---------------------------------------------------------------------------
create policy "Public documents of public orgs are readable by everyone"
  on public.documents for select
  to anon, authenticated
  using (
    is_public
    and exists (select 1 from public.organizations o where o.id = organization_id and o.is_public)
  );

create policy "Members read all documents in their organization"
  on public.documents for select
  to authenticated
  using ((select public.is_org_member(organization_id)));

create policy "Editors and admins register documents"
  on public.documents for insert
  to authenticated
  with check ((select public.can_edit_content(organization_id)) and uploaded_by = (select auth.uid()));

create policy "Editors and admins update documents"
  on public.documents for update
  to authenticated
  using ((select public.can_edit_content(organization_id)))
  with check ((select public.can_edit_content(organization_id)));

create policy "Org admins delete documents"
  on public.documents for delete
  to authenticated
  using ((select public.is_org_admin(organization_id)));

-- file_path / organization_id are fixed once a document is registered.
revoke update on public.documents from authenticated;
grant update (title, description, category, is_public) on public.documents to authenticated;

-- ---------------------------------------------------------------------------
-- notification_preferences (strictly per-user)
-- ---------------------------------------------------------------------------
create policy "Users read own notification preferences"
  on public.notification_preferences for select
  to authenticated
  using (user_id = (select auth.uid()));

create policy "Users update own notification preferences"
  on public.notification_preferences for update
  to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

revoke insert, delete on public.notification_preferences from authenticated;
revoke update on public.notification_preferences from authenticated;
grant update (email_announcements, emergency_alerts, weekly_digest, document_updates)
  on public.notification_preferences to authenticated;

-- ---------------------------------------------------------------------------
-- audit_logs
-- ---------------------------------------------------------------------------
create policy "Org admins read their organization's audit log"
  on public.audit_logs for select
  to authenticated
  using (
    (organization_id is not null and (select public.is_org_admin(organization_id)))
    or (select public.is_super_admin())
  );
