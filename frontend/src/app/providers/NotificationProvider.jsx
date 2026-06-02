import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react'
import { supabase } from '../../supabaseClient'
import {
  fetchNotifications,
  markNotificationRead,
  markTicketNotificationsRead,
} from '../../services/supportNotificationService'
import { useAuth } from './AuthProvider'

const NotificationContext = createContext(null)

export function NotificationProvider({ children }) {
  const { user } = useAuth()
  const [notifications, setNotifications] = useState([])
  const [loading, setLoading] = useState(false)

  const reload = useCallback(async () => {
    if (!user?.id) {
      setNotifications([])
      return
    }
    setLoading(true)
    try {
      const rows = await fetchNotifications()
      setNotifications(rows)
    } catch (err) {
      console.warn('[notifications] load failed', err)
    } finally {
      setLoading(false)
    }
  }, [user?.id])

  useEffect(() => {
    reload()
  }, [reload])

  useEffect(() => {
    if (!user?.id) return undefined

    const channel = supabase
      .channel(`notifications:${user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `recipient_user_id=eq.${user.id}`,
        },
        (payload) => {
          if (payload.new) {
            setNotifications((prev) => {
              if (prev.some((n) => n.id === payload.new.id)) return prev
              return [payload.new, ...prev]
            })
          }
        },
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [user?.id])

  const unreadCount = useMemo(
    () => notifications.filter((n) => !n.is_read).length,
    [notifications],
  )

  const unreadByTicket = useMemo(() => {
    const map = {}
    for (const n of notifications) {
      if (!n.is_read && n.ticket_id) {
        map[n.ticket_id] = (map[n.ticket_id] ?? 0) + 1
      }
    }
    return map
  }, [notifications])

  const supportReplyUnreadCount = useMemo(
    () => notifications.filter((n) => !n.is_read && n.type === 'support_reply').length,
    [notifications],
  )

  const supportNewTicketUnreadCount = useMemo(
    () => notifications.filter((n) => !n.is_read && n.type === 'support_new_ticket').length,
    [notifications],
  )

  const markAsRead = useCallback(async (notificationId) => {
    await markNotificationRead(notificationId)
    setNotifications((prev) =>
      prev.map((n) => (n.id === notificationId ? { ...n, is_read: true } : n)),
    )
  }, [])

  const markTicketRead = useCallback(async (ticketId) => {
    if (!ticketId) return
    await markTicketNotificationsRead(ticketId)
    setNotifications((prev) =>
      prev.map((n) => (n.ticket_id === ticketId ? { ...n, is_read: true } : n)),
    )
  }, [])

  const value = useMemo(
    () => ({
      notifications,
      loading,
      unreadCount,
      unreadByTicket,
      supportReplyUnreadCount,
      supportNewTicketUnreadCount,
      markAsRead,
      markTicketRead,
      reload,
    }),
    [
      notifications,
      loading,
      unreadCount,
      unreadByTicket,
      supportReplyUnreadCount,
      supportNewTicketUnreadCount,
      markAsRead,
      markTicketRead,
      reload,
    ],
  )

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  )
}

export function useNotifications() {
  const ctx = useContext(NotificationContext)
  if (!ctx) {
    throw new Error('useNotifications must be used within NotificationProvider')
  }
  return ctx
}
