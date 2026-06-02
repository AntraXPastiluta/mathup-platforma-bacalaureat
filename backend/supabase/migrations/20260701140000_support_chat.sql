-- Support chat messages and atomic ticket claim.

create table if not exists public.support_request_messages (
  id uuid primary key default gen_random_uuid(),
  ticket_id uuid not null references public.support_requests (id) on delete cascade,
  author_user_id uuid not null references auth.users (id) on delete cascade,
  author_role text not null check (author_role in ('user', 'admin')),
  body text not null,
  created_at timestamptz not null default now()
);

create index if not exists support_request_messages_ticket_idx
  on public.support_request_messages (ticket_id, created_at asc);

alter table public.support_request_messages enable row level security;

drop policy if exists support_request_messages_select on public.support_request_messages;
create policy support_request_messages_select
  on public.support_request_messages
  for select
  to authenticated
  using (
    public.is_curriculum_admin()
    or exists (
      select 1
      from public.support_requests sr
      where sr.id = ticket_id
        and sr.user_id = auth.uid()
    )
  );

drop policy if exists support_request_messages_insert_user on public.support_request_messages;
create policy support_request_messages_insert_user
  on public.support_request_messages
  for insert
  to authenticated
  with check (
    author_user_id = auth.uid()
    and author_role = 'user'
    and exists (
      select 1
      from public.support_requests sr
      where sr.id = ticket_id
        and sr.user_id = auth.uid()
        and sr.status <> 'closed'
    )
  );

drop policy if exists support_request_messages_insert_admin on public.support_request_messages;
create policy support_request_messages_insert_admin
  on public.support_request_messages
  for insert
  to authenticated
  with check (
    author_user_id = auth.uid()
    and author_role = 'admin'
    and public.is_curriculum_admin()
    and exists (
      select 1
      from public.support_requests sr
      where sr.id = ticket_id
        and sr.assigned_admin_id = auth.uid()
        and sr.status <> 'closed'
    )
  );

create or replace function public.claim_support_ticket(p_ticket_id uuid)
returns public.support_requests
language plpgsql
security definer
set search_path = public
as $$
declare
  v_ticket public.support_requests;
begin
  if not public.is_curriculum_admin() then
    raise exception 'Doar administratorii pot prelua tickete.';
  end if;

  update public.support_requests
  set assigned_admin_id = auth.uid(),
      assigned_at = now(),
      status = 'in_progress'
  where id = p_ticket_id
    and assigned_admin_id is null
    and status <> 'closed'
  returning * into v_ticket;

  if v_ticket.id is null then
    raise exception 'Ticketul este deja preluat, închis sau inexistent.';
  end if;

  return v_ticket;
end;
$$;

grant execute on function public.claim_support_ticket(uuid) to authenticated;
