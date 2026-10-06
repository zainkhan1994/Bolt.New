/*
  CommunityHub — audit logging and RPCs

  Audit rows are written by database triggers, so every change is recorded no matter
  which client made it (dashboard, REST API, SQL editor). Clients cannot insert,
  update or delete audit rows (see grants in 20261006000002_rls.sql).
*/

-- ---------------------------------------------------------------------------
-- Core writer
-- ---------------------------------------------------------------------------
create or replace function public.write_audit_log(
  p_organization_id uuid,
  p_action text,
  p_resource_type text,
  p_resource_id uuid,
  p_resource_label text,
  p_metadata jsonb default '{}'::jsonb
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid := auth.uid();
  v_org uuid := p_organization_id;
begin
  -- During an organization cascade-delete the parent row is already gone.
  if v_org is not null and not exists (select 1 from public.organizations where id = v_org) then
    return;
  end if;

  insert into public.audit_logs (organization_id, actor_id, actor_email, action, resource_type, resource_id, resource_label, metadata)
  values (
    v_org,
    v_actor,
    (select email from public.profiles where id = v_actor),
    p_action,
    p_resource_type,
    p_resource_id,
    p_resource_label,
    coalesce(p_metadata, '{}'::jsonb)
  );
end;
$$;

revoke execute on function public.write_audit_log(uuid, text, text, uuid, text, jsonb) from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- pages / announcements
-- ---------------------------------------------------------------------------
create or replace function public.audit_content_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  kind text := case tg_table_name when 'pages' then 'page' else 'announcement' end;
begin
  if tg_op = 'INSERT' then
    perform public.write_audit_log(new.organization_id, kind || '.created', kind, new.id, new.title,
      jsonb_build_object('status', new.status));
    if new.status = 'published' then
      perform public.write_audit_log(new.organization_id, kind || '.published', kind, new.id, new.title);
    end if;
    return new;
  elsif tg_op = 'UPDATE' then
    if old.status <> 'published' and new.status = 'published' then
      perform public.write_audit_log(new.organization_id, kind || '.published', kind, new.id, new.title);
    elsif old.status = 'published' and new.status <> 'published' then
      perform public.write_audit_log(new.organization_id, kind || '.unpublished', kind, new.id, new.title);
    end if;
    if (to_jsonb(old) - array['status', 'updated_at', 'published_at']) is distinct from
       (to_jsonb(new) - array['status', 'updated_at', 'published_at']) then
      perform public.write_audit_log(new.organization_id, kind || '.edited', kind, new.id, new.title);
    end if;
    return new;
  else
    perform public.write_audit_log(old.organization_id, kind || '.deleted', kind, old.id, old.title);
    return old;
  end if;
end;
$$;

create trigger pages_audit after insert or update or delete on public.pages
  for each row execute function public.audit_content_change();

create trigger announcements_audit after insert or update or delete on public.announcements
  for each row execute function public.audit_content_change();

-- ---------------------------------------------------------------------------
-- documents
-- ---------------------------------------------------------------------------
create or replace function public.audit_document_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    perform public.write_audit_log(new.organization_id, 'document.uploaded', 'document', new.id, new.title,
      jsonb_build_object('category', new.category, 'file_size', new.file_size));
    return new;
  elsif tg_op = 'UPDATE' then
    perform public.write_audit_log(new.organization_id, 'document.edited', 'document', new.id, new.title);
    return new;
  else
    perform public.write_audit_log(old.organization_id, 'document.deleted', 'document', old.id, old.title);
    return old;
  end if;
end;
$$;

create trigger documents_audit after insert or update or delete on public.documents
  for each row execute function public.audit_document_change();

-- ---------------------------------------------------------------------------
-- organization_members
-- ---------------------------------------------------------------------------
create or replace function public.audit_member_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  member_email text := (select email from public.profiles where id = coalesce(new.user_id, old.user_id));
begin
  if tg_op = 'INSERT' then
    perform public.write_audit_log(new.organization_id, 'member.added', 'member', new.user_id, member_email,
      jsonb_build_object('role', new.role));
    return new;
  elsif tg_op = 'UPDATE' then
    if old.role is distinct from new.role then
      perform public.write_audit_log(new.organization_id, 'member.role_changed', 'member', new.user_id, member_email,
        jsonb_build_object('from', old.role, 'to', new.role));
    end if;
    return new;
  else
    perform public.write_audit_log(old.organization_id, 'member.removed', 'member', old.user_id, member_email,
      jsonb_build_object('role', old.role));
    return old;
  end if;
end;
$$;

create trigger organization_members_audit after insert or update or delete on public.organization_members
  for each row execute function public.audit_member_change();

-- ---------------------------------------------------------------------------
-- organizations
-- ---------------------------------------------------------------------------
create or replace function public.audit_organization_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    perform public.write_audit_log(new.id, 'organization.created', 'organization', new.id, new.name);
  else
    perform public.write_audit_log(new.id, 'organization.settings_updated', 'organization', new.id, new.name);
  end if;
  return new;
end;
$$;

create trigger organizations_audit after insert or update on public.organizations
  for each row execute function public.audit_organization_change();

-- ---------------------------------------------------------------------------
-- RPC: record a sign-in (called by the client right after SIGNED_IN).
-- Writes one row per organization the caller belongs to; a user can only log
-- their own sign-in, never someone else's.
-- ---------------------------------------------------------------------------
create or replace function public.record_login()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  m record;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated' using errcode = '28000';
  end if;

  -- Throttle: at most one login entry per user per minute.
  if exists (
    select 1 from public.audit_logs
    where actor_id = auth.uid() and action = 'user.login' and created_at > now() - interval '1 minute'
  ) then
    return;
  end if;

  for m in select organization_id from public.organization_members where user_id = auth.uid() loop
    perform public.write_audit_log(m.organization_id, 'user.login', 'user', auth.uid(),
      (select email from public.profiles where id = auth.uid()));
  end loop;
end;
$$;

revoke execute on function public.record_login() from public, anon;
grant execute on function public.record_login() to authenticated;

-- ---------------------------------------------------------------------------
-- RPC: org admins add an existing user to their organization by email.
-- SECURITY DEFINER because looking up arbitrary profiles by email is not
-- otherwise allowed by RLS; the authorization check is the first statement.
-- ---------------------------------------------------------------------------
create or replace function public.add_member_by_email(p_organization_id uuid, p_email text, p_role public.org_role)
returns public.organization_members
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid;
  v_row public.organization_members;
begin
  if not public.is_org_admin(p_organization_id) then
    raise exception 'Only organization admins can add members' using errcode = '42501';
  end if;

  select id into v_user from public.profiles where lower(email) = lower(trim(p_email));
  if v_user is null then
    raise exception 'No CommunityHub account exists for %. Ask them to sign up first.', p_email
      using errcode = 'P0002';
  end if;

  insert into public.organization_members (organization_id, user_id, role)
  values (p_organization_id, v_user, p_role)
  returning * into v_row;

  return v_row;
exception
  when unique_violation then
    raise exception '% is already a member of this organization', p_email using errcode = '23505';
end;
$$;

revoke execute on function public.add_member_by_email(uuid, text, public.org_role) from public, anon;
grant execute on function public.add_member_by_email(uuid, text, public.org_role) to authenticated;

-- ---------------------------------------------------------------------------
-- RPC: super admins create an organization and appoint its first admin.
-- ---------------------------------------------------------------------------
create or replace function public.create_organization(
  p_name text,
  p_slug text,
  p_type text,
  p_admin_email text
)
returns public.organizations
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_org public.organizations;
  v_admin uuid;
begin
  if not public.is_super_admin() then
    raise exception 'Only super admins can create organizations' using errcode = '42501';
  end if;

  select id into v_admin from public.profiles where lower(email) = lower(trim(p_admin_email));
  if v_admin is null then
    raise exception 'No CommunityHub account exists for %', p_admin_email using errcode = 'P0002';
  end if;

  insert into public.organizations (name, slug, type) values (p_name, p_slug, p_type) returning * into v_org;
  insert into public.organization_members (organization_id, user_id, role) values (v_org.id, v_admin, 'org_admin');
  return v_org;
end;
$$;

revoke execute on function public.create_organization(text, text, text, text) from public, anon;
grant execute on function public.create_organization(text, text, text, text) to authenticated;
