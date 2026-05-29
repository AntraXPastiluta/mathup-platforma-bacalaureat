/**
 * Administrarea tichetelor de suport: listarea solicitărilor și schimbarea
 * statusului. Toate operațiunile sunt rezervate adminilor de curriculum.
 * Etichetele exportate sunt folosite pentru afișarea prietenoasă în interfață.
 */
import { supabase } from '../supabaseClient'
import { requireCurriculumAdmin } from './curriculumAdminService'

export const SUPPORT_TICKET_STATUSES = ['open', 'in_progress', 'closed']

export const SUPPORT_CATEGORY_LABELS = {
  billing: 'Facturare',
  technical: 'Problemă tehnică',
  content: 'Conținut lecții',
  other: 'Altele',
}

export const SUPPORT_STATUS_LABELS = {
  open: 'Deschis',
  in_progress: 'În lucru',
  closed: 'Închis',
}

/** Listează toate tichetele de suport, cele mai recente primele. */
export async function getSupportTickets() {
  await requireCurriculumAdmin()
  const { data, error } = await supabase
    .from('support_requests')
    .select('id, user_id, user_email, user_name, category, subject, message, status, created_at')
    .order('created_at', { ascending: false })

  if (error) throw error
  return data ?? []
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
    .select('id, user_id, user_email, user_name, category, subject, message, status, created_at')
    .single()

  if (error) throw error
  return data
}
