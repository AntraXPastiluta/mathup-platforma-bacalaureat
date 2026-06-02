-- Restore support tickets (dropped in 20260530120000). Created via Edge Function (service role).
create table if not exists public.support_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  user_email text not null,
  user_name text,
  category text not null,
  subject text not null,
  message text not null,
  status text not null default 'open',
  assigned_admin_id uuid references auth.users (id) on delete set null,
  assigned_at timestamptz,
  created_at timestamptz not null default now()
);

alter table public.support_requests
  drop constraint if exists support_requests_status_check;
alter table public.support_requests
  add constraint support_requests_status_check
  check (status in ('open', 'in_progress', 'closed'));

create index if not exists support_requests_created_idx
  on public.support_requests (created_at desc);

create index if not exists support_requests_status_created_idx
  on public.support_requests (status, created_at desc);

create index if not exists support_requests_assigned_idx
  on public.support_requests (assigned_admin_id);

create index if not exists support_requests_assigned_status_idx
  on public.support_requests (assigned_admin_id, status);

alter table public.support_requests enable row level security;

drop policy if exists support_requests_select_own on public.support_requests;
create policy support_requests_select_own
  on public.support_requests
  for select
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists support_requests_select_admin on public.support_requests;
create policy support_requests_select_admin
  on public.support_requests
  for select
  to authenticated
  using (public.is_curriculum_admin());

drop policy if exists support_requests_update_admin on public.support_requests;
create policy support_requests_update_admin
  on public.support_requests
  for update
  to authenticated
  using (public.is_curriculum_admin())
  with check (public.is_curriculum_admin());
