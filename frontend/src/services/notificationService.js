/**
 * Centrul de notificări in-app. Notificările sunt create exclusiv de trigger-ele
 * din baza de date (suport: ticket nou / răspuns) și citite de utilizatorul
 * destinatar. Politicile RLS limitează automat fiecare interogare la propriile
 * notificări. Acest serviciu oferă citirea istoricului, marcarea ca citit și un
 * abonament realtime pentru livrarea instantanee.
 */
import { supabase } from '../supabaseClient'

const NOTIFICATION_SELECT = 'id, recipient_user_id, type, ticket_id, title, body, is_read, created_at'

const MAX_NOTIFICATIONS = 50

/** Listează notificările utilizatorului curent, cele mai recente primele. */
export async function getNotifications() {
  const { data, error } = await supabase
    .from('notifications')
    .select(NOTIFICATION_SELECT)
    .order('created_at', { ascending: false })
    .limit(MAX_NOTIFICATIONS)

  if (error) throw error
  return data ?? []
}

/** Marchează o singură notificare drept citită. */
export async function markAsRead(notificationId) {
  if (!notificationId) return
  const { error } = await supabase
    .from('notifications')
    .update({ is_read: true })
    .eq('id', notificationId)
    .eq('is_read', false)

  if (error) throw error
}

/** Marchează toate notificările necitite ale utilizatorului drept citite. */
export async function markAllAsRead() {
  const { error } = await supabase
    .from('notifications')
    .update({ is_read: true })
    .eq('is_read', false)

  if (error) throw error
}

/**
 * Marchează drept citite notificările legate de un anumit ticket (folosit când
 * utilizatorul deschide conversația respectivă).
 */
export async function markTicketRead(ticketId) {
  if (!ticketId) return
  const { error } = await supabase
    .from('notifications')
    .update({ is_read: true })
    .eq('ticket_id', ticketId)
    .eq('is_read', false)

  if (error) throw error
}

/**
 * Se abonează la notificările noi (INSERT) pentru un utilizator. Returnează o
 * funcție de dezabonare. Filtrul pe `recipient_user_id` reduce traficul, iar RLS
 * garantează că nu se livrează rânduri străine.
 */
export function subscribeToNotifications(userId, onInsert) {
  if (!userId || typeof onInsert !== 'function') {
    return () => {}
  }

  const channel = supabase
    .channel(`notifications:${userId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'notifications',
        filter: `recipient_user_id=eq.${userId}`,
      },
      (payload) => {
        if (payload?.new) onInsert(payload.new)
      },
    )
    .subscribe()

  return () => {
    supabase.removeChannel(channel)
  }
}
