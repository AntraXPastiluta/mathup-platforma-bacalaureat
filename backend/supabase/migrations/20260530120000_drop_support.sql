-- Remove support tickets, chat, and support-only in-app notifications.

drop trigger if exists support_message_notify on public.support_request_messages;
drop trigger if exists support_new_ticket_notify on public.support_requests;

drop function if exists public.notify_support_message();
drop function if exists public.notify_support_new_ticket();
drop function if exists public.claim_support_ticket(uuid);

do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    if exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime'
        and schemaname = 'public'
        and tablename = 'support_request_messages'
    ) then
      alter publication supabase_realtime drop table public.support_request_messages;
    end if;

    if exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime'
        and schemaname = 'public'
        and tablename = 'support_requests'
    ) then
      alter publication supabase_realtime drop table public.support_requests;
    end if;

    if exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime'
        and schemaname = 'public'
        and tablename = 'notifications'
    ) then
      alter publication supabase_realtime drop table public.notifications;
    end if;
  end if;
end $$;

drop table if exists public.notifications cascade;
drop table if exists public.support_request_messages cascade;
drop table if exists public.support_requests cascade;
