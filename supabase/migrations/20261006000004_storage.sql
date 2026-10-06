/*
  CommunityHub — document storage

  Private bucket "documents". Object keys are "<organization_id>/<uuid>-<filename>.pdf".
  - Upload:   editors/admins of the organization named by the first path segment.
  - Download: members of that organization, or anyone if the object backs a public
              document (enables signed URLs for the public portal).
  - Delete:   org admins only.
  Bucket-level limits reject non-PDF uploads and files over 20 MB.
*/

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('documents', 'documents', false, 20971520, array['application/pdf'])
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- Parse the organization id from an object key without throwing on garbage input.
create or replace function public.storage_object_org(object_name text)
returns uuid
language plpgsql
immutable
set search_path = ''
as $$
begin
  return (split_part(object_name, '/', 1))::uuid;
exception
  when invalid_text_representation then
    return null;
end;
$$;

create policy "Editors upload documents to their organization folder"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'documents'
    and public.can_edit_content(public.storage_object_org(name))
  );

create policy "Members and public readers download documents"
  on storage.objects for select
  to anon, authenticated
  using (
    bucket_id = 'documents'
    and (
      exists (
        select 1
        from public.documents d
        join public.organizations o on o.id = d.organization_id
        where d.file_path = storage.objects.name and d.is_public and o.is_public
      )
      or (auth.uid() is not null and public.is_org_member(public.storage_object_org(name)))
    )
  );

create policy "Org admins delete documents"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'documents'
    and public.is_org_admin(public.storage_object_org(name))
  );

-- The download policy applies to anon too; these helpers are safe for anon (they
-- return false/null when auth.uid() is null).
grant execute on function public.is_org_member(uuid) to anon;
grant execute on function public.storage_object_org(text) to anon, authenticated;
