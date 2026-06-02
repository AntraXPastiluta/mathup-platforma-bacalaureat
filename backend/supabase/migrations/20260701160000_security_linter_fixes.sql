-- Supabase Security Advisor remediation (erros.md):
-- search_path on helpers, revoke anon table access, server-only table lockdown,
-- RPC EXECUTE lockdown, trigger-only functions, pg_graphql removal (REST-only app).

-- ---------------------------------------------------------------------------
-- 1. Function search_path (lint 0011)
-- ---------------------------------------------------------------------------

create or replace function public.normalize_db_email(p_email text)
returns text
language sql
immutable
set search_path = public
as $$
  select lower(trim(coalesce(p_email, '')));
$$;

create or replace function public.default_bac_exam_date()
returns date
language sql
immutable
set search_path = public
as $$
  select case
    when make_date(extract(year from current_date)::int, 6, 30) >= current_date
      then make_date(extract(year from current_date)::int, 6, 30)
    else make_date(extract(year from current_date)::int + 1, 6, 30)
  end;
$$;

-- ---------------------------------------------------------------------------
-- 2. Public platform flags — column grants + SECURITY INVOKER (lint 0028/0029)
-- ---------------------------------------------------------------------------

revoke all on table public.platform_settings from anon, authenticated;

grant select (maintenance_enabled, bac_exam_date)
  on table public.platform_settings
  to anon, authenticated;

create or replace function public.get_maintenance_mode()
returns boolean
language sql
stable
security invoker
set search_path = public
as $$
  select coalesce(
    (select ps.maintenance_enabled from public.platform_settings ps where ps.id = 1 limit 1),
    false
  );
$$;

create or replace function public.get_bac_exam_date()
returns date
language sql
stable
security invoker
set search_path = public
as $$
  select coalesce(
    (select ps.bac_exam_date from public.platform_settings ps where ps.id = 1 limit 1),
    public.default_bac_exam_date()
  );
$$;

create or replace function public.get_public_platform_flags()
returns jsonb
language sql
stable
security invoker
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
-- 3. RLS helpers — SECURITY INVOKER where definer escalation is unnecessary
-- ---------------------------------------------------------------------------

create or replace function public.user_profile_keys()
returns text[]
language sql
stable
security invoker
set search_path = public
as $$
  select coalesce(
    array_agg(profile_key order by profile_key),
    array[]::text[]
  )
  from public.user_enrolled_profiles
  where user_id = auth.uid();
$$;

create or replace function public.user_has_active_premium()
returns boolean
language sql
stable
security invoker
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

create or replace function public.user_has_lesson_full_access(p_lesson_id uuid)
returns boolean
language sql
stable
security invoker
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
security invoker
set search_path = public
as $$
  select public.user_has_lesson_full_access(p_lesson_id);
$$;

-- ---------------------------------------------------------------------------
-- 4. Table / view grants (lint 0026 / 0027) — REST-only; GraphQL not used
-- ---------------------------------------------------------------------------

revoke all on all tables in schema public from anon;

revoke all on table public.account_deletion_tokens from anon, authenticated;
revoke all on table public.gdpr_export_logs from anon, authenticated;

revoke select on table public.quiz_questions from anon;

alter default privileges for role postgres in schema public
  revoke all on tables from anon;

alter default privileges for role postgres in schema public
  revoke execute on functions from public, anon;

-- ---------------------------------------------------------------------------
-- 5. pg_graphql — app uses PostgREST only (lint 0026 / 0027)
-- ---------------------------------------------------------------------------

drop extension if exists pg_graphql;

-- ---------------------------------------------------------------------------
-- 6. RPC EXECUTE lockdown (lint 0028 / 0029)
-- ---------------------------------------------------------------------------

revoke execute on all functions in schema public from public;
revoke execute on all functions in schema public from anon;
revoke execute on all functions in schema public from authenticated;

-- anon + authenticated: public read-only flags (now SECURITY INVOKER)
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
grant execute on function public.claim_support_ticket(uuid) to authenticated;

-- RLS policy helpers (SECURITY INVOKER; required for authenticated queries)
grant execute on function public.user_profile_keys() to authenticated;
grant execute on function public.user_has_active_premium() to authenticated;
grant execute on function public.user_has_lesson_full_access(uuid) to authenticated;
grant execute on function public.user_may_read_lesson_quiz(uuid) to authenticated;

-- service_role: privileged edge-only RPCs
grant execute on function public.reserve_gdpr_export_slot(uuid) to service_role;

-- Trigger / internal helpers: never callable via PostgREST RPC
revoke execute on function public.notify_support_new_ticket() from public, anon, authenticated;
revoke execute on function public.notify_support_message() from public, anon, authenticated;
revoke execute on function public.guard_quiz_attempt_is_correct() from public, anon, authenticated;
revoke execute on function public.normalize_db_email(text) from public, anon, authenticated;
revoke execute on function public.default_bac_exam_date() from public, anon, authenticated;
