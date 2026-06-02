-- In-app notifications for support chat + Realtime publication.

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  recipient_user_id uuid not null references auth.users (id) on delete cascade,
  type text not null check (type in ('support_new_ticket', 'support_reply')),
  ticket_id uuid references public.support_requests (id) on delete cascade,
  title text not null,
  body text not null default '',
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists notifications_recipient_idx
  on public.notifications (recipient_user_id, is_read, created_at desc);

create index if not exists notifications_ticket_idx
  on public.notifications (ticket_id);

alter table public.notifications enable row level security;

drop policy if exists notifications_select_own on public.notifications;
create policy notifications_select_own
  on public.notifications
  for select
  to authenticated
  using (recipient_user_id = auth.uid());

drop policy if exists notifications_update_own on public.notifications;
create policy notifications_update_own
  on public.notifications
  for update
  to authenticated
  using (recipient_user_id = auth.uid())
  with check (recipient_user_id = auth.uid());

create or replace function public.notify_support_new_ticket()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.notifications (recipient_user_id, type, ticket_id, title, body)
  select distinct au.id,
         'support_new_ticket',
         new.id,
         'Ticket nou de suport',
         coalesce(nullif(new.subject, ''), 'Solicitare nouă')
  from public.curriculum_admin_emails cae
  join auth.users au on lower(au.email) = lower(cae.email)
  where au.id <> new.user_id;

  return new;
end;
$$;

drop trigger if exists support_new_ticket_notify on public.support_requests;
create trigger support_new_ticket_notify
  after insert on public.support_requests
  for each row
  execute function public.notify_support_new_ticket();

create or replace function public.notify_support_message()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_ticket public.support_requests;
  v_title text;
begin
  select * into v_ticket
  from public.support_requests
  where id = new.ticket_id;

  if v_ticket.id is null then
    return new;
  end if;

  v_title := coalesce(nullif(v_ticket.subject, ''), 'Conversație suport');

  if new.author_role = 'admin' then
    insert into public.notifications (recipient_user_id, type, ticket_id, title, body)
    values (v_ticket.user_id, 'support_reply', v_ticket.id,
            'Răspuns la solicitarea ta', v_title);
  elsif new.author_role = 'user' and v_ticket.assigned_admin_id is not null then
    insert into public.notifications (recipient_user_id, type, ticket_id, title, body)
    values (v_ticket.assigned_admin_id, 'support_reply', v_ticket.id,
            'Mesaj nou de la elev', v_title);
  end if;

  return new;
end;
$$;

drop trigger if exists support_message_notify on public.support_request_messages;
create trigger support_message_notify
  after insert on public.support_request_messages
  for each row
  execute function public.notify_support_message();

do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime'
        and schemaname = 'public'
        and tablename = 'notifications'
    ) then
      alter publication supabase_realtime add table public.notifications;
    end if;

    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime'
        and schemaname = 'public'
        and tablename = 'support_requests'
    ) then
      alter publication supabase_realtime add table public.support_requests;
    end if;

    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime'
        and schemaname = 'public'
        and tablename = 'support_request_messages'
    ) then
      alter publication supabase_realtime add table public.support_request_messages;
    end if;
  end if;
end $$;
