-- Security consolidation: server-controlled enrollments, canonical RLS, admin model,
-- quiz integrity, RPC grant lockdown, and production drift remediation.
-- Runnable on baseline snapshot and after incremental migrations (idempotent where possible).

-- ---------------------------------------------------------------------------
-- 1. user_enrolled_profiles (server-controlled program enrollments)
-- ---------------------------------------------------------------------------

create table if not exists public.user_enrolled_profiles (
  user_id uuid not null references auth.users (id) on delete cascade,
  profile_key text not null,
  created_at timestamptz not null default now(),
  primary key (user_id, profile_key)
);

alter table public.user_enrolled_profiles enable row level security;

drop policy if exists user_enrolled_profiles_select_own on public.user_enrolled_profiles;
create policy user_enrolled_profiles_select_own
  on public.user_enrolled_profiles
  for select
  to authenticated
  using (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- 2. sync_user_enrolled_profiles RPC
-- ---------------------------------------------------------------------------

create or replace function public.sync_user_enrolled_profiles(p_profile_keys text[])
returns text[]
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_keys text[];
  v_key text;
  v_valid constant text[] := array['mate_info', 'tehnologic', 'stiintele_naturii', 'pedagogic'];
begin
  if v_user_id is null then
    raise exception 'Trebuie să fii autentificat.';
  end if;

  select coalesce(array_agg(distinct k order by k), array[]::text[])
  into v_keys
  from unnest(coalesce(p_profile_keys, array[]::text[])) as k
  where k = any (v_valid);

  if coalesce(array_length(v_keys, 1), 0) = 0 then
    v_keys := array['mate_info'];
  end if;

  delete from public.user_enrolled_profiles
  where user_id = v_user_id;

  foreach v_key in array v_keys
  loop
    insert into public.user_enrolled_profiles (user_id, profile_key)
    values (v_user_id, v_key)
    on conflict do nothing;
  end loop;

  return v_keys;
end;
$$;

revoke all on function public.sync_user_enrolled_profiles(text[]) from public;
grant execute on function public.sync_user_enrolled_profiles(text[]) to authenticated;

-- ---------------------------------------------------------------------------
-- 3. Backfill from auth.users metadata; default mate_info when empty
-- ---------------------------------------------------------------------------

insert into public.user_enrolled_profiles (user_id, profile_key)
select distinct u.id, profiles.key
from auth.users u
cross join lateral (
  select jsonb_array_elements_text(
    coalesce(u.raw_user_meta_data -> 'profiles', '[]'::jsonb)
  ) as key
  union
  select u.raw_user_meta_data ->> 'profile'
) profiles(key)
where profiles.key is not null
  and profiles.key <> ''
  and profiles.key in ('mate_info', 'tehnologic', 'stiintele_naturii', 'pedagogic')
on conflict do nothing;

insert into public.user_enrolled_profiles (user_id, profile_key)
select u.id, 'mate_info'
from auth.users u
where not exists (
  select 1
  from public.user_enrolled_profiles uep
  where uep.user_id = u.id
)
on conflict do nothing;

-- ---------------------------------------------------------------------------
-- 4. user_profile_keys — DB-only (never JWT user_metadata)
-- ---------------------------------------------------------------------------

create or replace function public.user_profile_keys()
returns text[]
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    array_agg(profile_key order by profile_key),
    array[]::text[]
  )
  from public.user_enrolled_profiles
  where user_id = auth.uid();
$$;

-- ---------------------------------------------------------------------------
-- 5. user_has_active_premium (auth.uid() scoped)
-- ---------------------------------------------------------------------------

create or replace function public.user_has_active_premium()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    public.is_curriculum_admin()
    or exists (
      select 1
      from public.premium_entitlements pe
      where pe.user_id = auth.uid()
        and pe.status = 'active'
        and pe.expires_at > now()
    );
$$;

-- ---------------------------------------------------------------------------
-- 6. Lesson access helpers (enrolled profiles, not JWT)
-- ---------------------------------------------------------------------------

create or replace function public.user_has_lesson_full_access(p_lesson_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.lessons l
    where l.id = p_lesson_id
      and (
        public.is_curriculum_admin()
        or public.user_has_active_premium()
        or coalesce(l.subject_part, 0) = 3
        or l.profile = any (public.user_profile_keys())
      )
  );
$$;

create or replace function public.user_may_read_lesson_quiz(p_lesson_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.user_has_lesson_full_access(p_lesson_id);
$$;

-- ---------------------------------------------------------------------------
-- 8. Drop orphan admin artifacts
-- ---------------------------------------------------------------------------

drop table if exists public.platform_admins cascade;

drop function if exists public.is_primary_platform_admin() cascade;
drop function if exists public.is_primary_curriculum_admin() cascade;
drop function if exists public.get_first_curriculum_admin_email() cascade;
drop function if exists public.get_primary_admin_email_value() cascade;

-- ---------------------------------------------------------------------------
-- 9. Consolidated admin helpers
-- ---------------------------------------------------------------------------

create or replace function public.normalize_db_email(p_email text)
returns text
language sql
immutable
as $$
  select lower(trim(coalesce(p_email, '')));
$$;

create or replace function public.is_curriculum_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.curriculum_admin_emails cae
    where public.normalize_db_email(cae.email) = public.normalize_db_email(auth.jwt() ->> 'email')
  );
$$;

create or replace function public.get_primary_admin_email()
returns text
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not public.is_curriculum_admin() then
    raise exception 'Acces neautorizat.';
  end if;

  return (
    select public.normalize_db_email(ps.primary_admin_email)
    from public.platform_settings ps
    where ps.id = 1
    limit 1
  );
end;
$$;

create or replace function public.is_primary_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    public.normalize_db_email(auth.jwt() ->> 'email') = (
      select public.normalize_db_email(ps.primary_admin_email)
      from public.platform_settings ps
      where ps.id = 1
      limit 1
    ),
    false
  );
$$;

-- ---------------------------------------------------------------------------
-- 10. auth_user_email_exists — primary admin only
-- ---------------------------------------------------------------------------

create or replace function public.auth_user_email_exists(p_email text)
returns boolean
language plpgsql
stable
security definer
set search_path = public, auth
as $$
begin
  if not public.is_primary_admin() then
    raise exception 'Acces neautorizat.';
  end if;

  return exists (
    select 1
    from auth.users u
    where public.normalize_db_email(u.email) = public.normalize_db_email(p_email)
  );
end;
$$;

-- ---------------------------------------------------------------------------
-- 11. Public platform flags RPC (no admin email leak)
-- ---------------------------------------------------------------------------

create or replace function public.get_public_platform_flags()
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (
      select jsonb_build_object(
        'maintenance_enabled', coalesce(ps.maintenance_enabled, false),
        'bac_exam_date', ps.bac_exam_date
      )
      from public.platform_settings ps
      where ps.id = 1
      limit 1
    ),
    jsonb_build_object(
      'maintenance_enabled', false,
      'bac_exam_date', public.default_bac_exam_date()
    )
  );
$$;

-- ---------------------------------------------------------------------------
-- 12. platform_settings — no direct client SELECT; primary admin UPDATE only
-- ---------------------------------------------------------------------------

do $$
declare
  r record;
begin
  for r in
    select policyname
    from pg_policies
    where schemaname = 'public'
      and tablename = 'platform_settings'
  loop
    execute format('drop policy if exists %I on public.platform_settings', r.policyname);
  end loop;
end;
$$;

alter table if exists public.platform_settings enable row level security;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'platform_settings_singleton'
      and conrelid = 'public.platform_settings'::regclass
  ) then
    alter table public.platform_settings
      add constraint platform_settings_singleton check (id = 1);
  end if;
end;
$$;

drop policy if exists platform_settings_write_primary on public.platform_settings;
create policy platform_settings_write_primary
  on public.platform_settings
  for update
  to authenticated
  using (public.is_primary_admin())
  with check (public.is_primary_admin());

-- Maintenance / BAC RPCs (unchanged semantics; redefined for search_path consistency)
create or replace function public.get_maintenance_mode()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (select ps.maintenance_enabled from public.platform_settings ps where ps.id = 1 limit 1),
    false
  );
$$;

create or replace function public.set_maintenance_mode(p_enabled boolean)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_primary_admin() then
    raise exception 'Doar administratorul principal poate modifica modul de mentenanță.';
  end if;

  insert into public.platform_settings (id, maintenance_enabled, updated_at, updated_by)
  values (
    1,
    coalesce(p_enabled, false),
    now(),
    public.normalize_db_email(auth.jwt() ->> 'email')
  )
  on conflict (id) do update
  set
    maintenance_enabled = excluded.maintenance_enabled,
    updated_at = excluded.updated_at,
    updated_by = excluded.updated_by;

  return coalesce(p_enabled, false);
end;
$$;

create or replace function public.set_bac_exam_date(p_date date)
returns date
language plpgsql
security definer
set search_path = public
as $$
declare
  v_date date;
begin
  if not public.is_primary_admin() then
    raise exception 'Doar administratorul principal poate modifica data examenului.';
  end if;

  if p_date is null then
    raise exception 'Data examenului este obligatorie.';
  end if;

  v_date := p_date;

  insert into public.platform_settings (id, bac_exam_date, updated_at, updated_by)
  values (
    1,
    v_date,
    now(),
    public.normalize_db_email(auth.jwt() ->> 'email')
  )
  on conflict (id) do update
  set
    bac_exam_date = excluded.bac_exam_date,
    updated_at = excluded.updated_at,
    updated_by = excluded.updated_by;

  return v_date;
end;
$$;

-- ---------------------------------------------------------------------------
-- 13. GDPR export slot — advisory lock + atomic count/insert
-- ---------------------------------------------------------------------------

create or replace function public.reserve_gdpr_export_slot(p_user_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count integer;
begin
  if p_user_id is null then
    return false;
  end if;

  perform pg_advisory_xact_lock(hashtext(p_user_id::text));

  select count(*)::integer
  into v_count
  from public.gdpr_export_logs gel
  where gel.user_id = p_user_id
    and gel.created_at >= now() - interval '24 hours';

  if v_count >= 3 then
    return false;
  end if;

  insert into public.gdpr_export_logs (user_id) values (p_user_id);
  return true;
end;
$$;

-- ---------------------------------------------------------------------------
-- 14. Quiz integrity — RPC-only writes for is_correct
-- ---------------------------------------------------------------------------

create or replace function public.submit_quiz_answer(
  p_question_id uuid,
  p_selected_index integer
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_lesson_id uuid;
  v_correct_index integer;
  v_is_correct boolean;
begin
  if v_user_id is null then
    raise exception 'Trebuie să fii autentificat.';
  end if;

  select q.lesson_id, q.correct_option_index
  into v_lesson_id, v_correct_index
  from public.quiz_questions q
  where q.id = p_question_id;

  if v_lesson_id is null then
    raise exception 'Întrebarea nu există.';
  end if;

  if not public.user_may_read_lesson_quiz(v_lesson_id) then
    raise exception 'Acces neautorizat la quiz.';
  end if;

  v_is_correct := (p_selected_index = v_correct_index);

  perform set_config('app.quiz_trusted_write', 'on', true);

  insert into public.user_quiz_attempts (user_id, question_id, lesson_id, is_correct)
  values (v_user_id, p_question_id, v_lesson_id, v_is_correct)
  on conflict (user_id, question_id) do update
  set
    lesson_id = excluded.lesson_id,
    is_correct = excluded.is_correct;

  return jsonb_build_object('correct', v_is_correct);
end;
$$;

create or replace function public.guard_quiz_attempt_is_correct()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.is_correct is true
     and coalesce(current_setting('app.quiz_trusted_write', true), '') is distinct from 'on' then
    raise exception 'is_correct poate fi setat doar prin submit_quiz_answer.';
  end if;
  return new;
end;
$$;

drop trigger if exists user_quiz_attempts_guard_is_correct on public.user_quiz_attempts;
create trigger user_quiz_attempts_guard_is_correct
  before insert or update on public.user_quiz_attempts
  for each row
  execute function public.guard_quiz_attempt_is_correct();

create unique index if not exists user_quiz_attempts_user_question_uidx
  on public.user_quiz_attempts (user_id, question_id);

-- ---------------------------------------------------------------------------
-- 15. Student-safe quiz view (hides correct_option_index)
-- ---------------------------------------------------------------------------

create or replace view public.quiz_questions_student
with (security_invoker = true)
as
select
  q.id,
  q.lesson_id,
  q.question_text,
  q.options,
  q.image_url,
  q.created_at
from public.quiz_questions q
where public.user_may_read_lesson_quiz(q.lesson_id);

grant select on public.quiz_questions_student to authenticated;

-- Admin Premium RPCs (canonical definitions)
create or replace function public.list_premium_entitlements_for_admin()
returns table (
  user_id uuid,
  email text,
  status text,
  expires_at timestamptz,
  purchased_at timestamptz,
  stripe_subscription_id text
)
language sql
stable
security definer
set search_path = public, auth
as $$
  select
    pe.user_id,
    u.email::text,
    pe.status,
    pe.expires_at,
    pe.purchased_at,
    pe.stripe_subscription_id
  from public.premium_entitlements pe
  join auth.users u on u.id = pe.user_id
  where public.is_curriculum_admin()
    and pe.status = 'active'
    and pe.expires_at > now()
  order by pe.expires_at desc;
$$;

create or replace function public.revoke_premium_entitlement(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_primary_admin() then
    raise exception 'Doar administratorul principal poate revoca Premium.';
  end if;

  update public.premium_entitlements
  set
    status = 'refunded',
    updated_at = now()
  where user_id = p_user_id;
end;
$$;

-- ---------------------------------------------------------------------------
-- 16. Policy purge — drop every policy on target tables
-- ---------------------------------------------------------------------------

do $$
declare
  t text;
  r record;
begin
  foreach t in array array[
    'lessons',
    'lesson_parts',
    'lesson_files',
    'quiz_questions',
    'curriculum_admin_emails',
    'user_study_roadmaps',
    'user_study_roadmap_subjects',
    'user_progress',
    'user_quiz_attempts',
    'premium_entitlements',
    'premium_orders',
    'program_solved_variants',
    'study_roadmaps',
    'study_roadmap_steps',
    'platform_settings'
  ]
  loop
    for r in
      select policyname
      from pg_policies
      where schemaname = 'public'
        and tablename = t
    loop
      execute format('drop policy if exists %I on public.%I', r.policyname, t);
    end loop;
  end loop;
end;
$$;

-- Drop legacy IDOR premium helper (after policies that referenced it are purged)
drop function if exists public.has_active_premium(uuid);
drop function if exists public.has_active_premium();

-- ---------------------------------------------------------------------------
-- 17. Canonical RLS policies
-- ---------------------------------------------------------------------------

-- lessons
alter table if exists public.lessons enable row level security;

create policy lessons_select_authenticated
  on public.lessons
  for select
  to authenticated
  using (true);

create policy lessons_write_admin
  on public.lessons
  for all
  to authenticated
  using (public.is_curriculum_admin())
  with check (public.is_curriculum_admin());

-- lesson_parts
alter table if exists public.lesson_parts enable row level security;

create policy lesson_parts_select
  on public.lesson_parts
  for select
  to authenticated
  using (
    public.is_curriculum_admin()
    or public.user_has_lesson_full_access(lesson_id)
    or exists (
      select 1
      from public.lessons l
      where l.id = lesson_parts.lesson_id
        and lesson_parts.order_index < greatest(coalesce(l.preview_part_count, 1), 1)
        and l.profile = any (public.user_profile_keys())
    )
  );

create policy lesson_parts_write_admin
  on public.lesson_parts
  for all
  to authenticated
  using (public.is_curriculum_admin())
  with check (public.is_curriculum_admin());

-- lesson_files
alter table if exists public.lesson_files enable row level security;

create policy lesson_files_select
  on public.lesson_files
  for select
  to authenticated
  using (
    public.is_curriculum_admin()
    or (
      not coalesce(is_solved_content, false)
      and public.user_has_lesson_full_access(lesson_id)
    )
  );

create policy lesson_files_write_admin
  on public.lesson_files
  for all
  to authenticated
  using (public.is_curriculum_admin())
  with check (public.is_curriculum_admin());

-- quiz_questions — admins on base table; students use view only
alter table if exists public.quiz_questions enable row level security;

create policy quiz_questions_select_admin
  on public.quiz_questions
  for select
  to authenticated
  using (public.is_curriculum_admin());

create policy quiz_questions_write_admin
  on public.quiz_questions
  for all
  to authenticated
  using (public.is_curriculum_admin())
  with check (public.is_curriculum_admin());

revoke select on public.quiz_questions from authenticated;
grant select on public.quiz_questions to service_role;

-- user_study_roadmaps / subjects
alter table if exists public.user_study_roadmaps enable row level security;

create policy user_study_roadmaps_own
  on public.user_study_roadmaps
  for all
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

alter table if exists public.user_study_roadmap_subjects enable row level security;

create policy user_study_roadmap_subjects_own
  on public.user_study_roadmap_subjects
  for all
  to authenticated
  using (
    exists (
      select 1
      from public.user_study_roadmaps r
      where r.id = roadmap_id
        and r.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1
      from public.user_study_roadmaps r
      where r.id = roadmap_id
        and r.user_id = auth.uid()
    )
  );

-- curriculum_admin_emails
alter table if exists public.curriculum_admin_emails enable row level security;

create policy curriculum_admin_emails_select
  on public.curriculum_admin_emails
  for select
  to authenticated
  using (public.is_curriculum_admin());

create policy curriculum_admin_emails_insert_primary
  on public.curriculum_admin_emails
  for insert
  to authenticated
  with check (public.is_primary_admin());

create policy curriculum_admin_emails_delete_primary
  on public.curriculum_admin_emails
  for delete
  to authenticated
  using (public.is_primary_admin());

-- user_quiz_attempts — SELECT own only; writes via submit_quiz_answer RPC
alter table if exists public.user_quiz_attempts enable row level security;

create policy user_quiz_attempts_select_own
  on public.user_quiz_attempts
  for select
  to authenticated
  using (auth.uid() = user_id);

-- premium_entitlements
alter table if exists public.premium_entitlements enable row level security;

create policy premium_entitlements_select_own
  on public.premium_entitlements
  for select
  to authenticated
  using (auth.uid() = user_id);

create policy premium_entitlements_select_admin
  on public.premium_entitlements
  for select
  to authenticated
  using (
    public.is_curriculum_admin()
    and status = 'active'
    and expires_at > now()
  );

-- premium_orders
alter table if exists public.premium_orders enable row level security;

create policy premium_orders_select_own
  on public.premium_orders
  for select
  to authenticated
  using (auth.uid() = user_id);

-- program_solved_variants
alter table if exists public.program_solved_variants enable row level security;

create policy program_solved_variants_select
  on public.program_solved_variants
  for select
  to authenticated
  using (public.is_curriculum_admin() or public.user_has_active_premium());

create policy program_solved_variants_write_admin
  on public.program_solved_variants
  for all
  to authenticated
  using (public.is_curriculum_admin())
  with check (public.is_curriculum_admin());

-- study_roadmaps
alter table if exists public.study_roadmaps enable row level security;

create policy study_roadmaps_select
  on public.study_roadmaps
  for select
  to authenticated
  using (true);

create policy study_roadmaps_write_admin
  on public.study_roadmaps
  for all
  to authenticated
  using (public.is_curriculum_admin())
  with check (public.is_curriculum_admin());

-- study_roadmap_steps
alter table if exists public.study_roadmap_steps enable row level security;

create policy study_roadmap_steps_select
  on public.study_roadmap_steps
  for select
  to authenticated
  using (
    public.is_curriculum_admin()
    or not coalesce(requires_premium, false)
    or public.user_has_active_premium()
  );

create policy study_roadmap_steps_write_admin
  on public.study_roadmap_steps
  for all
  to authenticated
  using (public.is_curriculum_admin())
  with check (public.is_curriculum_admin());

-- user_progress
alter table if exists public.user_progress enable row level security;

create policy user_progress_select_own
  on public.user_progress
  for select
  to authenticated
  using (auth.uid() = user_id);

create policy user_progress_insert_own
  on public.user_progress
  for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy user_progress_update_own
  on public.user_progress
  for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy user_progress_delete_own
  on public.user_progress
  for delete
  to authenticated
  using (auth.uid() = user_id);

-- platform_settings (re-apply after purge; no SELECT for clients)
create policy platform_settings_write_primary
  on public.platform_settings
  for update
  to authenticated
  using (public.is_primary_admin())
  with check (public.is_primary_admin());

-- ---------------------------------------------------------------------------
-- 18. RPC grant lockdown
-- ---------------------------------------------------------------------------

revoke execute on all functions in schema public from public;
revoke execute on all functions in schema public from anon;
revoke execute on all functions in schema public from authenticated;

-- anon + authenticated: public read-only flags
grant execute on function public.get_maintenance_mode() to anon, authenticated;
grant execute on function public.get_bac_exam_date() to anon, authenticated;
grant execute on function public.get_public_platform_flags() to anon, authenticated;

-- authenticated: admin / write RPCs
grant execute on function public.is_curriculum_admin() to authenticated;
grant execute on function public.is_primary_admin() to authenticated;
grant execute on function public.get_primary_admin_email() to authenticated;
grant execute on function public.sync_user_enrolled_profiles(text[]) to authenticated;
grant execute on function public.submit_quiz_answer(uuid, integer) to authenticated;
grant execute on function public.set_maintenance_mode(boolean) to authenticated;
grant execute on function public.set_bac_exam_date(date) to authenticated;
grant execute on function public.list_premium_entitlements_for_admin() to authenticated;
grant execute on function public.revoke_premium_entitlement(uuid) to authenticated;
grant execute on function public.auth_user_email_exists(text) to authenticated;

-- RLS policy helpers (required for authenticated queries after PUBLIC revoke)
grant execute on function public.user_has_active_premium() to authenticated;
grant execute on function public.user_has_lesson_full_access(uuid) to authenticated;
grant execute on function public.user_may_read_lesson_quiz(uuid) to authenticated;

-- service_role: privileged edge-only RPCs
grant execute on function public.reserve_gdpr_export_slot(uuid) to service_role;

-- ---------------------------------------------------------------------------
-- 19. Account deletion token lockout columns
-- ---------------------------------------------------------------------------

alter table if exists public.account_deletion_tokens
  add column if not exists failed_attempts integer not null default 0;

alter table if exists public.account_deletion_tokens
  add column if not exists locked_until timestamptz;

-- ---------------------------------------------------------------------------
-- 20. Performance index
-- ---------------------------------------------------------------------------

create index if not exists lesson_files_lesson_solved_idx
  on public.lesson_files (lesson_id, is_solved_content);

-- ---------------------------------------------------------------------------
-- 21. Deprecated lessons.content column
-- ---------------------------------------------------------------------------

comment on column public.lessons.content is
  'Deprecated: normalized lesson body lives in lesson_parts; do not use for new content.';
