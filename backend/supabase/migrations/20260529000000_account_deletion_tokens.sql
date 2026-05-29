-- Account deletion confirmation tokens
-- One row per user (upserted on each new request), cleaned up after confirmation or expiry.
create table if not exists public.account_deletion_tokens (
  user_id    uuid        primary key references auth.users (id) on delete cascade,
  token      text        not null,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);

alter table public.account_deletion_tokens enable row level security;

-- No user-facing policies: only service_role (Edge Functions) reads/writes this table.
