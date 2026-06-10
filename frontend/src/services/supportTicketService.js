import { supabase } from '../supabaseClient'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

const SUPPORT_UNAVAILABLE = 'Nu am putut trimite solicitarea. Încearcă din nou.'

export async function listMyTickets() {
  const { data, error } = await supabase
    .from('support_requests')
    .select('id, subject, status, category, created_at, user_name, user_email, user_avatar_id, user_avatar_photo_url, assigned_admin_id, assigned_admin_name, assigned_admin_avatar_id, assigned_admin_avatar_photo_url')
    .order('created_at', { ascending: false })

  if (error) throw error
  return data ?? []
}

export async function listAllTicketsForAdmin() {
  const { data, error } = await supabase
    .from('support_requests')
    .select('id, subject, status, category, created_at, user_id, user_email, user_name, user_avatar_id, user_avatar_photo_url, assigned_admin_id, assigned_admin_name, assigned_admin_email, assigned_admin_avatar_id, assigned_admin_avatar_photo_url, assigned_at')
    .order('created_at', { ascending: false })

  if (error) throw error
  return data ?? []
}

export async function fetchTicketMessages(ticketId) {
  const { data, error } = await supabase
    .from('support_request_messages')
    .select('id, ticket_id, author_user_id, author_role, body, created_at')
    .eq('ticket_id', ticketId)
    .order('created_at', { ascending: true })

  if (error) throw error
  return data ?? []
}

export async function sendUserMessage(ticketId, body) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Trebuie să fii autentificat.')

  const { data, error } = await supabase
    .from('support_request_messages')
    .insert({
      ticket_id: ticketId,
      author_user_id: user.id,
      author_role: 'user',
      body: body.trim(),
    })
    .select('id, ticket_id, author_user_id, author_role, body, created_at')
    .single()

  if (error) throw error
  return data
}

export async function sendAdminMessage(ticketId, body) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Trebuie să fii autentificat.')

  const { data, error } = await supabase
    .from('support_request_messages')
    .insert({
      ticket_id: ticketId,
      author_user_id: user.id,
      author_role: 'admin',
      body: body.trim(),
    })
    .select('id, ticket_id, author_user_id, author_role, body, created_at')
    .single()

  if (error) throw error
  return data
}

export async function claimTicket(ticketId) {
  const { data, error } = await supabase.rpc('claim_support_ticket', {
    p_ticket_id: ticketId,
  })

  if (error) throw error
  return data
}

export async function closeTicket(ticketId) {
  const { data, error } = await supabase
    .from('support_requests')
    .update({ status: 'closed' })
    .eq('id', ticketId)
    .select('id, status')
    .single()

  if (error) throw error
  return data
}

export async function deleteTicket(ticketId) {
  const { data, error } = await supabase
    .from('support_requests')
    .delete()
    .eq('id', ticketId)
    .eq('status', 'closed')
    .select('id')

  if (error) throw error
  // RLS permite ștergerea doar adminilor și doar pentru tickete închise;
  // un rezultat gol înseamnă că ștergerea a fost refuzată.
  if (!data?.length) {
    throw new Error('Doar ticketele închise pot fi șterse.')
  }
  return data[0]
}

async function invokeSubmitSupportRequest(accessToken, payload) {
  const { data, error } = await supabase.functions.invoke('submit-support-request', {
    body: payload,
    headers: { Authorization: `Bearer ${accessToken}` },
  })

  if (!error) return data?.ticket ?? data

  const message = error.message || ''
  const shouldRetryWithFetch =
    message.includes('Failed to send a request to the Edge Function') ||
    message.includes('Failed to fetch') ||
    message.includes('NetworkError')

  if (!shouldRetryWithFetch || !supabaseUrl || !supabaseAnonKey) {
    throw new Error(SUPPORT_UNAVAILABLE)
  }

  const response = await fetch(`${supabaseUrl}/functions/v1/submit-support-request`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      apikey: supabaseAnonKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  })

  const body = await response.json().catch(() => null)
  if (!response.ok) {
    const serverMsg = typeof body?.error === 'string' ? body.error : SUPPORT_UNAVAILABLE
    throw new Error(serverMsg)
  }

  return body?.ticket ?? body
}

export async function submitSupportTicket({ category, subject, message }) {
  const { data: { session }, error: sessionError } = await supabase.auth.getSession()
  if (sessionError) throw sessionError
  if (!session?.access_token) {
    throw new Error('Trebuie să fii autentificat pentru a contacta suportul.')
  }

  return invokeSubmitSupportRequest(session.access_token, { category, subject, message })
}

export function mergeMessagesById(existing, incoming) {
  if (!incoming) return existing
  const list = Array.isArray(incoming) ? incoming : [incoming]
  const byId = new Map(existing.map((m) => [m.id, m]))
  for (const row of list) {
    if (row?.id) byId.set(row.id, row)
  }
  return [...byId.values()].sort(
    (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
  )
}

export function createOptimisticMessage({ ticketId, userId, authorRole, body }) {
  return {
    id: `pending-${crypto.randomUUID()}`,
    ticket_id: ticketId,
    author_user_id: userId,
    author_role: authorRole,
    body: body.trim(),
    created_at: new Date().toISOString(),
    _optimistic: true,
  }
}
