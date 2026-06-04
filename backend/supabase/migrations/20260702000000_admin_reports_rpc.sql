-- Admin "Rapoarte": agregat unic (jsonb) pentru panoul de rapoarte.
-- Citește auth.users + tabele cu RLS strict (user_progress, gdpr_export_logs)
-- printr-o singură funcție security definer, protejată de is_curriculum_admin().
-- Toată agregarea se face în Postgres; clientul primește un singur jsonb compact.

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
  if not public.is_curriculum_admin() then
    raise exception 'Acces neautorizat.';
  end if;

  -- Whitelist strict pentru unitatea date_trunc / generate_series (fără interpolare brută).
  v_g := case lower(coalesce(p_granularity, 'month'))
           when 'day'   then 'day'
           when 'month' then 'month'
           else 'month'
         end;

  -- ── Serie temporală fără goluri (spină generate_series + left joins) ──
  -- Trunchiere în 'Europe/Bucharest', aplicată identic pe spină și pe metrici,
  -- ca să corespundă cheile de bucket.
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

  -- ── Totaluri (global + în interval) ──
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

  -- ── Tabele de defalcare ──
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

-- Doar utilizatorii autentificați pot apela RPC-ul; anon nu (deși gardă internă
-- ar respinge oricum). Revocăm grantul implicit PUBLIC ca anon să nu fie expus.
revoke all on function public.get_admin_reports(timestamptz, timestamptz, text) from public;
revoke all on function public.get_admin_reports(timestamptz, timestamptz, text) from anon;
grant execute on function public.get_admin_reports(timestamptz, timestamptz, text) to authenticated;
