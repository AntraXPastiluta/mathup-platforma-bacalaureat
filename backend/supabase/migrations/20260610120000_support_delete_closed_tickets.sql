-- Permite administratorilor să șteargă ticketele de suport închise.
-- Mesajele (support_request_messages) și notificările asociate se șterg
-- automat prin on delete cascade pe ticket_id.

drop policy if exists support_requests_delete_admin on public.support_requests;

create policy support_requests_delete_admin
  on public.support_requests
  for delete
  to authenticated
  using (public.is_curriculum_admin() and status = 'closed');
