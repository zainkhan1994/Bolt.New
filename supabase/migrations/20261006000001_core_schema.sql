/*
  CommunityHub — core schema

  Multi-tenant model:
    organizations ─┬─ organization_members ── profiles (1:1 auth.users)
                   ├─ pages
                   ├─ announcements
                   ├─ documents  (files live in Storage bucket "documents" under <organization_id>/...)
                   └─ audit_logs
    profiles ── notification_preferences

  Every organization-owned row carries organization_id. Authorization is enforced by
  RLS (see 20261006000002_rls.sql), never by the frontend alone.
*/

create extension if not exists pgcrypto with schema extensions;

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------
create type public.org_role as enum ('org_admin', 'editor', 'viewer');
create type public.content_status as enum ('draft', 'published');
create type public.announcement_priority as enum ('normal', 'important', 'emergency');

-- ---------------------------------------------------------------------------
-- Shared trigger: updated_at
-- ---------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- organizations
-- ---------------------------------------------------------------------------
create table public.organizations (
  id            uuid primary key default gen_random_uuid(),
  name          text not null check (char_length(name) between 2 and 120),
  slug          text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  type          text not null default 'community' check (type in ('school_district', 'municipality', 'community')),
  tagline       text,
  description   text,
  primary_color text not null default '#1d4ed8' check (primary_color ~ '^#[0-9a-fA-F]{6}$'),
  contact_email text,
  contact_phone text,
  address       text,
  is_public     boolean not null default true,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create trigger organizations_updated_at before update on public.organizations
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- profiles (1:1 with auth.users, created by trigger on sign-up)
-- ---------------------------------------------------------------------------
create table public.profiles (
  id             uuid primary key references auth.users (id) on delete cascade,
  email          text not null,
  full_name      text,
  avatar_url     text,
  is_super_admin boolean not null default false,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

create index profiles_email_idx on public.profiles (lower(email));

create trigger profiles_updated_at before update on public.profiles
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- organization_members
-- ---------------------------------------------------------------------------
create table public.organization_members (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  user_id         uuid not null references public.profiles (id) on delete cascade,
  role            public.org_role not null default 'viewer',
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  unique (organization_id, user_id)
);

create index organization_members_user_idx on public.organization_members (user_id);

create trigger organization_members_updated_at before update on public.organization_members
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- pages
-- ---------------------------------------------------------------------------
create table public.pages (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  title           text not null check (char_length(title) between 1 and 200),
  slug            text not null check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  summary         text,
  body            text not null default '',
  status          public.content_status not null default 'draft',
  show_in_nav     boolean not null default false,
  nav_order       integer not null default 0,
  author_id       uuid references public.profiles (id) on delete set null default auth.uid(),
  published_at    timestamptz,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  unique (organization_id, slug)
);

create index pages_org_status_idx on public.pages (organization_id, status);

create trigger pages_updated_at before update on public.pages
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- announcements
-- ---------------------------------------------------------------------------
create table public.announcements (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  title           text not null check (char_length(title) between 1 and 200),
  message         text not null,
  priority        public.announcement_priority not null default 'normal',
  audience        text not null default 'everyone'
                    check (audience in ('everyone', 'families', 'students', 'staff', 'residents', 'volunteers')),
  status          public.content_status not null default 'draft',
  publish_at      timestamptz not null default now(),
  expires_at      timestamptz,
  author_id       uuid references public.profiles (id) on delete set null default auth.uid(),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  check (expires_at is null or expires_at > publish_at)
);

create index announcements_org_status_idx on public.announcements (organization_id, status, publish_at desc);

create trigger announcements_updated_at before update on public.announcements
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- documents (metadata; the PDF itself is in Storage)
-- ---------------------------------------------------------------------------
create table public.documents (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  title           text not null check (char_length(title) between 1 and 200),
  description     text,
  category        text not null default 'General',
  file_path       text not null unique,
  file_size       bigint,
  mime_type       text not null default 'application/pdf',
  is_public       boolean not null default true,
  uploaded_by     uuid references public.profiles (id) on delete set null default auth.uid(),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  -- A document row may only point at a file inside its own organization's folder.
  check (file_path like organization_id::text || '/%')
);

create index documents_org_idx on public.documents (organization_id, created_at desc);
create index documents_category_idx on public.documents (organization_id, category);

create trigger documents_updated_at before update on public.documents
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- notification_preferences (one row per user)
-- ---------------------------------------------------------------------------
create table public.notification_preferences (
  id                  uuid primary key default gen_random_uuid(),
  user_id             uuid not null unique references public.profiles (id) on delete cascade,
  email_announcements boolean not null default true,
  emergency_alerts    boolean not null default true,
  weekly_digest       boolean not null default false,
  document_updates    boolean not null default false,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

create trigger notification_preferences_updated_at before update on public.notification_preferences
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- audit_logs (append-only; written only by SECURITY DEFINER functions)
-- ---------------------------------------------------------------------------
create table public.audit_logs (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations (id) on delete cascade,
  actor_id        uuid references public.profiles (id) on delete set null,
  actor_email     text,
  action          text not null,
  resource_type   text not null,
  resource_id     uuid,
  resource_label  text,
  metadata        jsonb not null default '{}'::jsonb,
  created_at      timestamptz not null default now()
);

create index audit_logs_org_created_idx on public.audit_logs (organization_id, created_at desc);
create index audit_logs_actor_idx on public.audit_logs (actor_id);

-- ---------------------------------------------------------------------------
-- New auth user -> profile + notification preferences
-- ---------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, email, full_name)
  values (new.id, new.email, nullif(new.raw_user_meta_data ->> 'full_name', ''));

  insert into public.notification_preferences (user_id) values (new.id);
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Keep profiles.email in sync when a user changes their address.
create or replace function public.handle_user_email_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.profiles set email = new.email where id = new.id;
  return new;
end;
$$;

create trigger on_auth_user_email_changed
  after update of email on auth.users
  for each row when (old.email is distinct from new.email)
  execute function public.handle_user_email_change();

-- ---------------------------------------------------------------------------
-- Content lifecycle: maintain published_at
-- ---------------------------------------------------------------------------
create or replace function public.set_published_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.status = 'published' and (tg_op = 'INSERT' or old.status <> 'published' or new.published_at is null) then
    new.published_at = coalesce(new.published_at, now());
    if tg_op = 'UPDATE' and old.status <> 'published' then
      new.published_at = now();
    end if;
  elsif new.status = 'draft' then
    new.published_at = null;
  end if;
  return new;
end;
$$;

create trigger pages_published_at before insert or update on public.pages
  for each row execute function public.set_published_at();
