create or replace function public.is_primary_curriculum_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select lower(coalesce(auth.jwt() ->> 'email', '')) = 'cruceanu.cristian3004@gmail.com';
$$;

create or replace function public.list_premium_entitlements_for_admin()
returns table (
  user_id uuid,
  email text,
  status text,
  expires_at timestamptz,
  purchased_at timestamptz,
  cancel_at_period_end boolean,
  stripe_subscription_id text
)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if auth.uid() is null or not public.is_curriculum_admin() then
    raise exception 'Neautorizat';
  end if;

  return query
  select
    pe.user_id,
    au.email::text,
    pe.status,
    pe.expires_at,
    pe.purchased_at,
    coalesce(pe.cancel_at_period_end, false),
    pe.stripe_subscription_id
  from public.premium_entitlements pe
  join auth.users au on au.id = pe.user_id
  where pe.status = 'active'
    and pe.expires_at > now()
  order by pe.expires_at desc, au.email asc;
end;
$$;

create or replace function public.revoke_premium_entitlement(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null or not public.is_curriculum_admin() then
    raise exception 'Neautorizat';
  end if;

  if not public.is_primary_curriculum_admin() then
    raise exception 'Doar administratorul principal poate elimina statusul Premium.';
  end if;

  update public.premium_entitlements
  set
    status = 'refunded',
    expires_at = now(),
    cancel_at_period_end = false,
    updated_at = now()
  where user_id = p_user_id
    and status = 'active';

  if not found then
    raise exception 'Utilizatorul nu are un abonament Premium activ.';
  end if;
end;
$$;

grant execute on function public.is_primary_curriculum_admin() to authenticated;
grant execute on function public.list_premium_entitlements_for_admin() to authenticated;
grant execute on function public.revoke_premium_entitlement(uuid) to authenticated;
