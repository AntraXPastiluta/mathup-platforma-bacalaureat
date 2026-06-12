import { supabase } from '../supabaseClient'

export async function fetchNotifications(limit = 50) {
  const { data, error } = await supabase
    .from('notifications')
    .select('id, type, ticket_id, title, body, is_read, created_at')
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) throw error
  return data ?? []
}

export async function markNotificationRead(notificationId) {
  const { error } = await supabase
    .from('notifications')
    .update({ is_read: true })
    .eq('id', notificationId)

  if (error) throw error
}

export async function markTicketNotificationsRead(ticketId) {
  const { error } = await supabase
    .from('notifications')
    .update({ is_read: true })
    .eq('ticket_id', ticketId)
    .eq('is_read', false)

  if (error) throw error
}

export async function markAllNotificationsRead() {
  const { error } = await supabase
    .from('notifications')
    .update({ is_read: true })
    .eq('is_read', false)

  if (error) throw error
}
