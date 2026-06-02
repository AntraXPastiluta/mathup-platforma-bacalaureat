import { useEffect } from 'react'
import { supabase } from '../../../supabaseClient'
import { mergeMessagesById } from '../../../services/supportTicketService'

/**
 * Live message stream for an open ticket (postgres_changes INSERT).
 */
export function useSupportRealtime(ticketId, enabled, onMessage) {
  useEffect(() => {
    if (!ticketId || !enabled || typeof onMessage !== 'function') return undefined

    const channel = supabase
      .channel(`support-messages:${ticketId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'support_request_messages',
          filter: `ticket_id=eq.${ticketId}`,
        },
        (payload) => {
          if (payload.new) {
            onMessage((prev) => mergeMessagesById(prev, payload.new))
          }
        },
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [ticketId, enabled, onMessage])
}
