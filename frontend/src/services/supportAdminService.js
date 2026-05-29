/**
 * Administrarea tichetelor de suport: listarea conversațiilor, preluarea
 * exclusivă a unui tichet și schimbarea statusului. Toate operațiunile sunt
 * rezervate adminilor de curriculum. Etichetele sunt importate din modulul de
 * constante partajat pentru a evita dublarea cu interfața elevului.
 */
import { supabase } from '../supabaseClient'
import { requireCurriculumAdmin } from './curriculumAdminService'
import {
  SUPPORT_CATEGORY_LABELS,
  SUPPORT_STATUS_LABELS,
  SUPPORT_TICKET_STATUSES,
} from './supportConstants'

export { SUPPORT_CATEGORY_LABELS, SUPPORT_STATUS_LABELS, SUPPORT_TICKET_STATUSES }
export { sendSupportMessage } from './supportService'

const TICKET_SELECT =
  'id, user_id, user_email, user_name, category, subject, message, status, created_at, ' +
  'assigned_admin_id, assigned_at, ' +
  'support_request_messages(id, author_role, body, created_at, author_user_id)'

/** Listează toate tichetele de suport, cele mai recente primele, cu firul de chat. */
export async function getSupportTickets() {
  await requireCurriculumAdmin()
  const { data, error } = await supabase
    .from('support_requests')
    .select(TICKET_SELECT)
    .order('created_at', { ascending: false })

  if (error) throw error
  return data ?? []
}

/**
 * Preia exclusiv un tichet nepreluat. Apelul RPC este atomic: un singur admin
 * câștigă, iar restul primesc o eroare clară (deja preluat / închis).
 */
export async function claimSupportTicket(ticketId) {
  await requireCurriculumAdmin()
  const { data, error } = await supabase.rpc('claim_support_ticket', { p_ticket_id: ticketId })
  if (error) throw error
  return data
}

/** Actualizează statusul unui tichet, validând că noua valoare e una permisă. */
export async function updateSupportTicketStatus(ticketId, status) {
  await requireCurriculumAdmin()
  if (!SUPPORT_TICKET_STATUSES.includes(status)) {
    throw new Error('Status invalid.')
  }

  const { data, error } = await supabase
    .from('support_requests')
    .update({ status })
    .eq('id', ticketId)
    .select(TICKET_SELECT)
    .single()

  if (error) throw error
  return data
}
