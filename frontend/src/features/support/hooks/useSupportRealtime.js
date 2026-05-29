/**
 * Abonament realtime partajat pentru chatul de suport. Înlocuiește polling-ul:
 * livrează instant mesajele noi (și, opțional, tichetele noi / schimbările de
 * status) folosind `postgres_changes`. Politicile RLS limitează stream-ul la
 * rândurile pe care utilizatorul are dreptul să le vadă, deci elevul primește
 * doar mesajele tichetelor proprii, iar adminul pe toate.
 *
 * Handlerele sunt păstrate în ref-uri pentru a evita reabonarea la fiecare
 * re-randare; canalul se recreează doar când se schimbă `enabled` sau `userId`.
 */
import { useEffect, useRef } from 'react'
import { supabase } from '../../../supabaseClient'

export function useSupportRealtime({
  enabled = true,
  userId = null,
  onMessage,
  onTicketInsert,
  onTicketUpdate,
} = {}) {
  const handlersRef = useRef({ onMessage, onTicketInsert, onTicketUpdate })

  useEffect(() => {
    handlersRef.current = { onMessage, onTicketInsert, onTicketUpdate }
  }, [onMessage, onTicketInsert, onTicketUpdate])

  useEffect(() => {
    if (!enabled || !userId) return undefined

    const channel = supabase.channel(`support-realtime:${userId}:${Math.random().toString(36).slice(2)}`)

    channel.on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'support_request_messages' },
      (payload) => {
        if (payload?.new) handlersRef.current.onMessage?.(payload.new)
      },
    )

    channel.on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'support_requests' },
      (payload) => {
        if (payload?.new) handlersRef.current.onTicketInsert?.(payload.new)
      },
    )

    channel.on(
      'postgres_changes',
      { event: 'UPDATE', schema: 'public', table: 'support_requests' },
      (payload) => {
        if (payload?.new) handlersRef.current.onTicketUpdate?.(payload.new)
      },
    )

    channel.subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [enabled, userId])
}
