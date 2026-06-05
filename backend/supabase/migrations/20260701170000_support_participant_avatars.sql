-- Show participant identity (name + profile photo) inside the support chat. Avatars
-- live in each user's private auth metadata, so we denormalize them onto the ticket the
-- same way the names already are: the student's avatar via a before-insert trigger, the
-- admin's avatar atomically at claim time. Photo URLs are public (storage getPublicUrl),
-- so they render for the other participant.

alter table public.support_requests
  add column if not exists user_avatar_id text;
alter table public.support_requests
  add column if not exists user_avatar_photo_url text;
alter table public.support_requests
  add column if not exists assigned_admin_avatar_id text;
alter table public.support_requests
  add column if not exists assigned_admin_avatar_photo_url text;

-- Stamp the student's avatar from their auth metadata when the ticket is created.
create or replace function public.support_request_fill_user_avatar()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_meta jsonb;
begin
  select au.raw_user_meta_data into v_meta
  from auth.users au
  where au.id = new.user_id;

  if new.user_avatar_id is null then
    new.user_avatar_id := nullif(v_meta ->> 'avatar_id', '');
  end if;
  if new.user_avatar_photo_url is null then
    new.user_avatar_photo_url := nullif(v_meta ->> 'avatar_photo_url', '');
  end if;

  return new;
end;
$$;

drop trigger if exists support_request_fill_user_avatar on public.support_requests;
create trigger support_request_fill_user_avatar
  before insert on public.support_requests
  for each row
  execute function public.support_request_fill_user_avatar();

-- Re-create the atomic claim so it also stamps the admin's email, name and avatar.
create or replace function public.claim_support_ticket(p_ticket_id uuid)
returns public.support_requests
language plpgsql
security definer
set search_path = public
as $$
declare
  v_ticket public.support_requests;
  v_meta jsonb;
  v_admin_email text;
  v_admin_name text;
begin
  if not public.is_curriculum_admin() then
    raise exception 'Doar administratorii pot prelua tickete.';
  end if;

  select au.email, au.raw_user_meta_data
    into v_admin_email, v_meta
  from auth.users au
  where au.id = auth.uid();

  v_admin_name := nullif(trim(v_meta ->> 'full_name'), '');

  update public.support_requests
  set assigned_admin_id = auth.uid(),
      assigned_admin_email = v_admin_email,
      assigned_admin_name = v_admin_name,
      assigned_admin_avatar_id = nullif(v_meta ->> 'avatar_id', ''),
      assigned_admin_avatar_photo_url = nullif(v_meta ->> 'avatar_photo_url', ''),
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

-- Backfill existing rows from current auth metadata.
update public.support_requests sr
set user_avatar_id = nullif(au.raw_user_meta_data ->> 'avatar_id', ''),
    user_avatar_photo_url = nullif(au.raw_user_meta_data ->> 'avatar_photo_url', '')
from auth.users au
where sr.user_id = au.id
  and sr.user_avatar_id is null
  and sr.user_avatar_photo_url is null;

update public.support_requests sr
set assigned_admin_avatar_id = nullif(au.raw_user_meta_data ->> 'avatar_id', ''),
    assigned_admin_avatar_photo_url = nullif(au.raw_user_meta_data ->> 'avatar_photo_url', '')
from auth.users au
where sr.assigned_admin_id = au.id
  and sr.assigned_admin_id is not null
  and sr.assigned_admin_avatar_id is null
  and sr.assigned_admin_avatar_photo_url is null;
