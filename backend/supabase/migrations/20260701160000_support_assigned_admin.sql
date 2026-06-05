-- Denormalize the assigned admin's identity onto the ticket so it can be shown in
-- the chat header. The student's RLS can read their own ticket row but cannot resolve
-- an admin UUID against auth.users, so we capture email + display name at claim time.

alter table public.support_requests
  add column if not exists assigned_admin_email text;
alter table public.support_requests
  add column if not exists assigned_admin_name text;

-- Backfill already-claimed tickets.
update public.support_requests sr
set assigned_admin_email = au.email,
    assigned_admin_name = nullif(trim(au.raw_user_meta_data ->> 'full_name'), '')
from auth.users au
where sr.assigned_admin_id = au.id
  and sr.assigned_admin_id is not null
  and sr.assigned_admin_email is null;

-- Re-create the atomic claim so it also stamps the admin's email + name.
create or replace function public.claim_support_ticket(p_ticket_id uuid)
returns public.support_requests
language plpgsql
security definer
set search_path = public
as $$
declare
  v_ticket public.support_requests;
  v_admin_email text;
  v_admin_name text;
begin
  if not public.is_curriculum_admin() then
    raise exception 'Doar administratorii pot prelua tickete.';
  end if;

  select au.email,
         nullif(trim(au.raw_user_meta_data ->> 'full_name'), '')
    into v_admin_email, v_admin_name
  from auth.users au
  where au.id = auth.uid();

  update public.support_requests
  set assigned_admin_id = auth.uid(),
      assigned_admin_email = v_admin_email,
      assigned_admin_name = v_admin_name,
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
