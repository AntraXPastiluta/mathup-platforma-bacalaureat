-- Support tickets submitted by logged-in users (inserts via Edge Function service role only).

create table if not exists public.support_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  user_email text not null,
  user_name text,
  category text not null,
  subject text not null,
  message text not null,
  status text not null default 'open',
  created_at timestamptz not null default now(),
  constraint support_requests_category_check check (
    category in ('billing', 'technical', 'content', 'other')
  ),
  constraint support_requests_status_check check (
    status in ('open', 'closed')
  ),
  constraint support_requests_subject_length check (char_length(subject) <= 120),
  constraint support_requests_message_length check (char_length(message) <= 2000)
);

create index if not exists support_requests_user_created_idx
  on public.support_requests (user_id, created_at desc);

alter table public.support_requests enable row level security;

-- No client INSERT: Edge Function uses service role.
-- Admins can read tickets via is_curriculum_admin().
create policy support_requests_select_admin
  on public.support_requests
  for select
  to authenticated
  using (public.is_curriculum_admin());

grant select on public.support_requests to authenticated;
