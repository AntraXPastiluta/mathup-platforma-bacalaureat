-- Allow authenticated users to read their own Premium entitlement (Stripe webhook writes via service role).
alter table if exists public.premium_entitlements enable row level security;

drop policy if exists premium_entitlements_select_own on public.premium_entitlements;

create policy premium_entitlements_select_own
  on public.premium_entitlements
  for select
  to authenticated
  using (auth.uid() = user_id);

-- Orders are written by Edge Functions; users read via GDPR export or admin RPC only.
alter table if exists public.premium_orders enable row level security;
