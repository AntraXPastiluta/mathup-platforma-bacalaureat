-- Core authorization: admin helpers, GDPR export reservation, quiz integrity,
-- and RLS policies for curriculum / progress tables (versioned in git).

-- ---------------------------------------------------------------------------
-- Shared helpers
-- ---------------------------------------------------------------------------

create or replace function public.normalize_db_email(p_email text)
returns text
language sql
immutable
as $$
  select lower(trim(coalesce(p_email, '')));
$$;

create table if not exists public.curriculum_admin_emails (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  created_at timestamptz not null default now()
);

alter table public.curriculum_admin_emails enable row level security;

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
language sql
stable
security definer
set search_path = public
as $$
  select public.normalize_db_email(ps.primary_admin_email)
  from public.platform_settings ps
  where ps.id = 1
  limit 1;
$$;

create or replace function public.is_primary_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    public.normalize_db_email(auth.jwt() ->> 'email') = public.get_primary_admin_email(),
    false
  );
$$;

create or replace function public.auth_user_email_exists(p_email text)
returns boolean
language sql
stable
security definer
set search_path = public, auth
as $$
  select exists (
    select 1
    from auth.users u
    where public.normalize_db_email(u.email) = public.normalize_db_email(p_email)
  );
$$;

grant execute on function public.is_curriculum_admin() to authenticated, anon;
grant execute on function public.is_primary_admin() to authenticated, anon;
grant execute on function public.get_primary_admin_email() to authenticated;
grant execute on function public.auth_user_email_exists(text) to authenticated;

-- ---------------------------------------------------------------------------
-- Platform settings RPCs (maintenance)
-- ---------------------------------------------------------------------------

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

grant execute on function public.get_maintenance_mode() to anon, authenticated;
grant execute on function public.set_maintenance_mode(boolean) to authenticated;

alter table if exists public.platform_settings enable row level security;

drop policy if exists platform_settings_select_public on public.platform_settings;
create policy platform_settings_select_public
  on public.platform_settings
  for select
  to authenticated, anon
  using (id = 1);

drop policy if exists platform_settings_write_primary on public.platform_settings;
create policy platform_settings_write_primary
  on public.platform_settings
  for update
  to authenticated
  using (public.is_primary_admin())
  with check (public.is_primary_admin());

-- ---------------------------------------------------------------------------
-- Premium access helpers
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

create or replace function public.user_profile_keys()
returns text[]
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (
      select array_agg(distinct key)
      from (
        select jsonb_array_elements_text(
          coalesce(auth.jwt() -> 'user_metadata' -> 'profiles', '[]'::jsonb)
        ) as key
        union
        select auth.jwt() -> 'user_metadata' ->> 'profile'
      ) profiles(key)
      where key is not null and key <> ''
    ),
    array[]::text[]
  );
$$;

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
-- GDPR export: atomic rate-limit reservation (service role / edge only)
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

revoke all on function public.reserve_gdpr_export_slot(uuid) from public;
grant execute on function public.reserve_gdpr_export_slot(uuid) to service_role;

-- ---------------------------------------------------------------------------
-- Quiz: server-side answer check + block client forging is_correct
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

grant execute on function public.submit_quiz_answer(uuid, integer) to authenticated;

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

-- Remove duplicate attempts before enforcing one row per (user_id, question_id)
delete from public.user_quiz_attempts ua
where ua.ctid not in (
  select distinct on (user_id, question_id) ctid
  from public.user_quiz_attempts
  order by user_id, question_id, created_at desc
);

create unique index if not exists user_quiz_attempts_user_question_uidx
  on public.user_quiz_attempts (user_id, question_id);

-- Student-safe quiz view (hides correct_option_index from PostgREST)
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

-- ---------------------------------------------------------------------------
-- Curriculum admin email list RLS
-- ---------------------------------------------------------------------------

drop policy if exists curriculum_admin_emails_select on public.curriculum_admin_emails;
create policy curriculum_admin_emails_select
  on public.curriculum_admin_emails
  for select
  to authenticated
  using (public.is_curriculum_admin());

drop policy if exists curriculum_admin_emails_insert_primary on public.curriculum_admin_emails;
create policy curriculum_admin_emails_insert_primary
  on public.curriculum_admin_emails
  for insert
  to authenticated
  with check (public.is_primary_admin());

drop policy if exists curriculum_admin_emails_delete_primary on public.curriculum_admin_emails;
create policy curriculum_admin_emails_delete_primary
  on public.curriculum_admin_emails
  for delete
  to authenticated
  using (public.is_primary_admin());

-- ---------------------------------------------------------------------------
-- Premium entitlements: admins may read all rows (student self-read unchanged)
drop policy if exists premium_entitlements_select_admin on public.premium_entitlements;
create policy premium_entitlements_select_admin
  on public.premium_entitlements
  for select
  to authenticated
  using (public.is_curriculum_admin());

-- Premium orders: own rows only (writes via service role)
-- ---------------------------------------------------------------------------

drop policy if exists premium_orders_select_own on public.premium_orders;
create policy premium_orders_select_own
  on public.premium_orders
  for select
  to authenticated
  using (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- User progress / quiz attempts
-- ---------------------------------------------------------------------------

alter table if exists public.user_progress enable row level security;

drop policy if exists user_progress_select_own on public.user_progress;
create policy user_progress_select_own
  on public.user_progress
  for select
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists user_progress_insert_own on public.user_progress;
create policy user_progress_insert_own
  on public.user_progress
  for insert
  to authenticated
  with check (auth.uid() = user_id);

drop policy if exists user_progress_update_own on public.user_progress;
create policy user_progress_update_own
  on public.user_progress
  for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists user_progress_delete_own on public.user_progress;
create policy user_progress_delete_own
  on public.user_progress
  for delete
  to authenticated
  using (auth.uid() = user_id);

alter table if exists public.user_quiz_attempts enable row level security;

drop policy if exists user_quiz_attempts_select_own on public.user_quiz_attempts;
create policy user_quiz_attempts_select_own
  on public.user_quiz_attempts
  for select
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists user_quiz_attempts_insert_own on public.user_quiz_attempts;
create policy user_quiz_attempts_insert_own
  on public.user_quiz_attempts
  for insert
  to authenticated
  with check (auth.uid() = user_id);

drop policy if exists user_quiz_attempts_update_own on public.user_quiz_attempts;
create policy user_quiz_attempts_update_own
  on public.user_quiz_attempts
  for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- Lessons & related content
-- ---------------------------------------------------------------------------

alter table if exists public.lessons enable row level security;

drop policy if exists lessons_select_authenticated on public.lessons;
create policy lessons_select_authenticated
  on public.lessons
  for select
  to authenticated
  using (true);

drop policy if exists lessons_write_admin on public.lessons;
create policy lessons_write_admin
  on public.lessons
  for all
  to authenticated
  using (public.is_curriculum_admin())
  with check (public.is_curriculum_admin());

alter table if exists public.lesson_parts enable row level security;

drop policy if exists lesson_parts_select on public.lesson_parts;
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

drop policy if exists lesson_parts_write_admin on public.lesson_parts;
create policy lesson_parts_write_admin
  on public.lesson_parts
  for all
  to authenticated
  using (public.is_curriculum_admin())
  with check (public.is_curriculum_admin());

alter table if exists public.lesson_files enable row level security;

drop policy if exists lesson_files_select on public.lesson_files;
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

drop policy if exists lesson_files_write_admin on public.lesson_files;
create policy lesson_files_write_admin
  on public.lesson_files
  for all
  to authenticated
  using (public.is_curriculum_admin())
  with check (public.is_curriculum_admin());

alter table if exists public.quiz_questions enable row level security;

drop policy if exists quiz_questions_select on public.quiz_questions;
create policy quiz_questions_select_admin
  on public.quiz_questions
  for select
  to authenticated
  using (public.is_curriculum_admin());

drop policy if exists quiz_questions_write_admin on public.quiz_questions;
create policy quiz_questions_write_admin
  on public.quiz_questions
  for all
  to authenticated
  using (public.is_curriculum_admin())
  with check (public.is_curriculum_admin());

-- Solved variants & premium study roadmaps (read requires Premium)
alter table if exists public.program_solved_variants enable row level security;

drop policy if exists program_solved_variants_select on public.program_solved_variants;
create policy program_solved_variants_select
  on public.program_solved_variants
  for select
  to authenticated
  using (public.is_curriculum_admin() or public.user_has_active_premium());

drop policy if exists program_solved_variants_write_admin on public.program_solved_variants;
create policy program_solved_variants_write_admin
  on public.program_solved_variants
  for all
  to authenticated
  using (public.is_curriculum_admin())
  with check (public.is_curriculum_admin());

-- User study roadmaps (own rows)
alter table if exists public.user_study_roadmaps enable row level security;

drop policy if exists user_study_roadmaps_own on public.user_study_roadmaps;
create policy user_study_roadmaps_own
  on public.user_study_roadmaps
  for all
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

alter table if exists public.user_study_roadmap_subjects enable row level security;

drop policy if exists user_study_roadmap_subjects_own on public.user_study_roadmap_subjects;
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

-- Official study roadmaps: readable by authenticated; writes admin-only
alter table if exists public.study_roadmaps enable row level security;

drop policy if exists study_roadmaps_select on public.study_roadmaps;
create policy study_roadmaps_select
  on public.study_roadmaps
  for select
  to authenticated
  using (true);

drop policy if exists study_roadmaps_write_admin on public.study_roadmaps;
create policy study_roadmaps_write_admin
  on public.study_roadmaps
  for all
  to authenticated
  using (public.is_curriculum_admin())
  with check (public.is_curriculum_admin());

alter table if exists public.study_roadmap_steps enable row level security;

drop policy if exists study_roadmap_steps_select on public.study_roadmap_steps;
create policy study_roadmap_steps_select
  on public.study_roadmap_steps
  for select
  to authenticated
  using (
    public.is_curriculum_admin()
    or not coalesce(requires_premium, false)
    or public.user_has_active_premium()
  );

drop policy if exists study_roadmap_steps_write_admin on public.study_roadmap_steps;
create policy study_roadmap_steps_write_admin
  on public.study_roadmap_steps
  for all
  to authenticated
  using (public.is_curriculum_admin())
  with check (public.is_curriculum_admin());

-- ---------------------------------------------------------------------------
-- Admin Premium RPCs
-- ---------------------------------------------------------------------------

drop function if exists public.list_premium_entitlements_for_admin();

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

grant execute on function public.list_premium_entitlements_for_admin() to authenticated;
grant execute on function public.revoke_premium_entitlement(uuid) to authenticated;
