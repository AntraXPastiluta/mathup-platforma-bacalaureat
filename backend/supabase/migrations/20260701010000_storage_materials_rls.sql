-- Storage RLS for bucket `materials` (DATABASE_REVIEW #16).
-- Public HTTP URLs remain available (bucket public = true); API listing is path-scoped.
-- Frontend paths:
--   adminService.js        → lesson-materials/{uuid}.{ext}
--   profilePhotoService.js → profile-photos/{user_id}/{uuid}.{ext}

insert into storage.buckets (id, name, public)
values ('materials', 'materials', true)
on conflict (id) do nothing;

-- Remove every existing policy on storage.objects that targets the materials bucket.
do $$
declare
  pol record;
begin
  for pol in
    select p.policyname
    from pg_policies p
    where p.schemaname = 'storage'
      and p.tablename = 'objects'
      and (
        coalesce(p.qual, '') like '%bucket_id = ''materials''%'
        or coalesce(p.with_check, '') like '%bucket_id = ''materials''%'
      )
  loop
    execute format('drop policy if exists %I on storage.objects', pol.policyname);
  end loop;
end $$;

-- Object read via Storage API: only known top-level prefixes (blocks unrestricted list).
create policy "materials_select_public_objects"
on storage.objects
for select
to anon, authenticated
using (
  bucket_id = 'materials'
  and (
    name like 'lesson-materials/%'
    or name like 'profile-photos/%'
  )
);

-- Users upload their own profile photo (profilePhotoService.js).
create policy "materials_insert_authenticated_own_avatar"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'materials'
  and name like 'profile-photos/' || auth.uid()::text || '/%'
);

-- Curriculum admins upload lesson attachments (adminService.js).
create policy "materials_insert_admin_lesson_materials"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'materials'
  and name like 'lesson-materials/%'
  and public.is_curriculum_admin()
);

-- profilePhotoService.js uses upsert: true on re-upload.
create policy "materials_update_authenticated_own_profile_photo"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'materials'
  and name like 'profile-photos/' || auth.uid()::text || '/%'
)
with check (
  bucket_id = 'materials'
  and name like 'profile-photos/' || auth.uid()::text || '/%'
);

create policy "materials_update_admin"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'materials'
  and public.is_curriculum_admin()
)
with check (
  bucket_id = 'materials'
  and public.is_curriculum_admin()
);

create policy "materials_delete_admin"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'materials'
  and public.is_curriculum_admin()
);
