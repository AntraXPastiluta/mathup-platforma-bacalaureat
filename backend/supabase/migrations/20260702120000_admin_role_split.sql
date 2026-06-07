-- Separare roluri admin: profesor (doar continut) vs administrator tehnic (superset).
-- Profesorul are acces doar la Curriculum/Roadmaps/Variante; tehnicul (si principalul)
-- au in plus Rapoarte, Acces (admini) si Platforma. Enforcement la nivel de RLS/RPC.
--
-- Aplicata pe remote prin Supabase MCP (apply_migration) din cauza driftului de istoric
-- de migrari; acest fisier exista pentru paritate cu repo-ul.

-- 1. Coloana de rol pe lista de admini. Default 'technical' => adminii existenti
--    (inclusiv principalul) pastreaza accesul complet, fara regresie.
alter table public.curriculum_admin_emails
  add column if not exists role text not null default 'technical';

alter table public.curriculum_admin_emails
  drop constraint if exists curriculum_admin_emails_role_check;
alter table public.curriculum_admin_emails
  add constraint curriculum_admin_emails_role_check check (role in ('profesor','technical'));

-- 2. Garda noua: administrator tehnic = principalul SAU rol 'technical'.
create or replace function public.is_technical_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.is_primary_admin()
    or exists (
      select 1
      from public.curriculum_admin_emails cae
      where public.normalize_db_email(cae.email) = public.normalize_db_email(auth.jwt() ->> 'email')
        and cae.role = 'technical'
    );
$$;

revoke all on function public.is_technical_admin() from public;
revoke all on function public.is_technical_admin() from anon;
grant execute on function public.is_technical_admin() to authenticated;

-- 3. Rapoarte: doar administrator tehnic (era orice admin de curriculum).
create or replace function public.get_admin_reports(
  p_from        timestamptz default (now() - interval '12 months'),
  p_to          timestamptz default now(),
  p_granularity text        default 'month'
)
returns jsonb
language plpgsql
stable
security definer
set search_path = public, auth
as $$
declare
  v_g    text;
  v_from timestamptz := least(p_from, p_to);
  v_to   timestamptz := greatest(p_from, p_to);
  v_tz   text := 'Europe/Bucharest';
  v_series    jsonb;
  v_summary   jsonb;
  v_breakdown jsonb;
begin
  if not public.is_technical_admin() then
    raise exception 'Acces neautorizat.';
  end if;

  v_g := case lower(coalesce(p_granularity, 'month'))
           when 'day'   then 'day'
           when 'month' then 'month'
           else 'month'
         end;

  with spine as (
    select gs as bucket
    from generate_series(
      date_trunc(v_g, (v_from at time zone v_tz)),
      date_trunc(v_g, (v_to   at time zone v_tz)),
      ('1 ' || v_g)::interval
    ) as gs
  ),
  reg as (
    select date_trunc(v_g, (u.created_at at time zone v_tz)) as bucket, count(*) as n
    from auth.users u
    where u.created_at >= v_from and u.created_at < v_to
    group by 1
  ),
  prem as (
    select date_trunc(v_g, (pe.purchased_at at time zone v_tz)) as bucket, count(*) as n
    from public.premium_entitlements pe
    where pe.purchased_at is not null
      and pe.purchased_at >= v_from and pe.purchased_at < v_to
    group by 1
  ),
  comp as (
    select date_trunc(v_g, (up.updated_at at time zone v_tz)) as bucket, count(*) as n
    from public.user_progress up
    where up.completed = true
      and up.updated_at >= v_from and up.updated_at < v_to
    group by 1
  ),
  gdpr as (
    select date_trunc(v_g, (g.created_at at time zone v_tz)) as bucket, count(*) as n
    from public.gdpr_export_logs g
    where g.created_at >= v_from and g.created_at < v_to
    group by 1
  )
  select coalesce(jsonb_agg(
           jsonb_build_object(
             'bucket',            to_char(s.bucket, 'YYYY-MM-DD'),
             'registrations',     coalesce(reg.n, 0),
             'premium_purchases', coalesce(prem.n, 0),
             'lessons_completed', coalesce(comp.n, 0),
             'gdpr_exports',      coalesce(gdpr.n, 0)
           ) order by s.bucket
         ), '[]'::jsonb)
    into v_series
  from spine s
  left join reg  on reg.bucket  = s.bucket
  left join prem on prem.bucket = s.bucket
  left join comp on comp.bucket = s.bucket
  left join gdpr on gdpr.bucket = s.bucket;

  select jsonb_build_object(
    'total_users',             (select count(*) from auth.users),
    'total_premium_purchases', (select count(*) from public.premium_entitlements where purchased_at is not null),
    'active_premium_now',      (select count(*) from public.premium_entitlements where status = 'active' and expires_at > now()),
    'total_lessons_completed', (select count(*) from public.user_progress where completed = true),
    'total_gdpr_exports',      (select count(*) from public.gdpr_export_logs),
    'premium_revenue_total',   (select coalesce(sum(amount_paid), 0) from public.premium_entitlements where status = 'active'),
    'range', jsonb_build_object(
      'registrations',     (select count(*) from auth.users where created_at >= v_from and created_at < v_to),
      'premium_purchases', (select count(*) from public.premium_entitlements where purchased_at >= v_from and purchased_at < v_to),
      'lessons_completed', (select count(*) from public.user_progress where completed = true and updated_at >= v_from and updated_at < v_to),
      'gdpr_exports',      (select count(*) from public.gdpr_export_logs where created_at >= v_from and created_at < v_to)
    )
  ) into v_summary;

  select jsonb_build_object(
    'premium_by_status', coalesce((
      select jsonb_agg(jsonb_build_object('status', status, 'count', n) order by n desc)
      from (select status, count(*) as n from public.premium_entitlements group by status) t
    ), '[]'::jsonb),
    'completions_by_profile', coalesce((
      select jsonb_agg(jsonb_build_object('profile', profile, 'count', n) order by n desc)
      from (
        select l.profile, count(*) as n
        from public.user_progress up
        join public.lessons l on l.id = up.lesson_id
        where up.completed = true
        group by l.profile
      ) t
    ), '[]'::jsonb),
    'top_gdpr_users', coalesce((
      select jsonb_agg(jsonb_build_object('email', email, 'count', n) order by n desc)
      from (
        select u.email::text as email, count(*) as n
        from public.gdpr_export_logs g
        join auth.users u on u.id = g.user_id
        group by u.email
        order by n desc
        limit 5
      ) t
    ), '[]'::jsonb)
  ) into v_breakdown;

  return jsonb_build_object(
    'granularity', v_g,
    'from', v_from,
    'to',   v_to,
    'summary',   v_summary,
    'series',    v_series,
    'breakdown', v_breakdown
  );
end;
$$;

revoke all on function public.get_admin_reports(timestamptz, timestamptz, text) from public;
revoke all on function public.get_admin_reports(timestamptz, timestamptz, text) from anon;
grant execute on function public.get_admin_reports(timestamptz, timestamptz, text) to authenticated;

-- 4. Platforma: mentenanta + data examenului => administrator tehnic (erau primary-only).
--    Politica RLS de UPDATE pe platform_settings ramane primary-only (protejeaza
--    primary_admin_email de auto-promovare); tehnicii scriu doar prin aceste RPC.
create or replace function public.set_maintenance_mode(p_enabled boolean)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_technical_admin() then
    raise exception 'Doar administratorii tehnici pot modifica modul de mentenanta.';
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
  if not public.is_technical_admin() then
    raise exception 'Doar administratorii tehnici pot modifica data examenului.';
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

-- 5. Lista Premium (operatiuni) => administrator tehnic.
create or replace function public.list_premium_entitlements_for_admin()
returns table(user_id uuid, email text, status text, expires_at timestamptz, purchased_at timestamptz, stripe_subscription_id text)
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
  where public.is_technical_admin()
    and pe.status = 'active'
    and pe.expires_at > now()
  order by pe.expires_at desc;
$$;

-- 6. Principalul poate schimba rolul unui admin existent (UPDATE pe coloana role).
drop policy if exists curriculum_admin_emails_update_primary on public.curriculum_admin_emails;
create policy curriculum_admin_emails_update_primary
  on public.curriculum_admin_emails
  for update
  to authenticated
  using (public.is_primary_admin())
  with check (public.is_primary_admin());
