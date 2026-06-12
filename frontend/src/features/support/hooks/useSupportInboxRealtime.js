import { useEffect } from 'react'
import { supabase } from '../../../supabaseClient'

function mergeTicketById(existing, incoming) {
  if (!incoming?.id) return existing
  const idx = existing.findIndex((t) => t.id === incoming.id)
  if (idx === -1) {
    return [incoming, ...existing].sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
    )
  }
  const next = [...existing]
  next[idx] = { ...next[idx], ...incoming }
  return next
}

/**
 * Live ticket queue for admins (INSERT + UPDATE + DELETE on support_requests).
 */
export function useSupportInboxRealtime(enabled, onTicketsChange) {
  useEffect(() => {
    if (!enabled || typeof onTicketsChange !== 'function') return undefined

    const channel = supabase
      .channel('support-inbox')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'support_requests' },
        (payload) => {
          if (payload.new) {
            onTicketsChange((prev) => mergeTicketById(prev, payload.new))
          }
        },
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'support_requests' },
        (payload) => {
          if (payload.new) {
            onTicketsChange((prev) => mergeTicketById(prev, payload.new))
          }
        },
      )
      .on(
        'postgres_changes',
        { event: 'DELETE', schema: 'public', table: 'support_requests' },
        (payload) => {
          // La DELETE, payload.old conține doar cheia primară.
          if (payload.old?.id) {
            onTicketsChange((prev) => prev.filter((t) => t.id !== payload.old.id))
          }
        },
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [enabled, onTicketsChange])
}
