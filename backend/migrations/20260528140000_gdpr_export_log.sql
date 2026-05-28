-- GDPR data export audit log (rate limiting + traceability)
create table if not exists public.gdpr_export_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

create index if not exists gdpr_export_logs_user_created_idx
  on public.gdpr_export_logs (user_id, created_at desc);

alter table public.gdpr_export_logs enable row level security;

-- No policies: only service_role (Edge Functions) reads/writes this table.
