/**
 * Stare globală pentru centrul de notificări in-app. Încarcă istoricul
 * notificărilor utilizatorului autentificat, se abonează realtime la cele noi și
 * expune contoare derivate (total necitite, per tip, per ticket) plus acțiuni de
 * marcare ca citit. Marcarea este optimistă: actualizăm local imediat, apoi
 * persistăm în baza de date.
 */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react'
import { useAuth } from './AuthProvider'
import {
  getNotifications,
  markAllAsRead,
  markAsRead,
  markTicketRead,
  subscribeToNotifications,
} from '../../services/notificationService'

const NotificationContext = createContext(null)

export function NotificationProvider({ children }) {
  const { user } = useAuth()
  const userId = user?.id ?? null

  const [notifications, setNotifications] = useState([])
  const [loading, setLoading] = useState(false)

  // Încărcare inițială + abonare realtime, refăcute la schimbarea utilizatorului.
  useEffect(() => {
    if (!userId) {
      setNotifications([])
      return undefined
    }

    let cancelled = false
    setLoading(true)
    ;(async () => {
      try {
        const rows = await getNotifications()
        if (!cancelled) setNotifications(rows)
      } catch (loadError) {
        console.warn('Notifications load failed:', loadError)
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()

    const unsubscribe = subscribeToNotifications(userId, (row) => {
      setNotifications((current) => {
        if (current.some((item) => item.id === row.id)) return current
        return [row, ...current]
      })
    })

    return () => {
      cancelled = true
      unsubscribe()
    }
  }, [userId])

  const unreadCount = useMemo(
    () => notifications.reduce((total, item) => total + (item.is_read ? 0 : 1), 0),
    [notifications],
  )

  const unreadByType = useMemo(() => {
    const counts = {}
    for (const item of notifications) {
      if (item.is_read) continue
      counts[item.type] = (counts[item.type] ?? 0) + 1
    }
    return counts
  }, [notifications])

  const unreadByTicket = useMemo(() => {
    const counts = {}
    for (const item of notifications) {
      if (item.is_read || !item.ticket_id) continue
      counts[item.ticket_id] = (counts[item.ticket_id] ?? 0) + 1
    }
    return counts
  }, [notifications])

  const markOneRead = useCallback(async (notificationId) => {
    setNotifications((current) =>
      current.map((item) =>
        item.id === notificationId ? { ...item, is_read: true } : item,
      ),
    )
    try {
      await markAsRead(notificationId)
    } catch (error) {
      console.warn('Mark notification read failed:', error)
    }
  }, [])

  const markAllRead = useCallback(async () => {
    setNotifications((current) => current.map((item) => ({ ...item, is_read: true })))
    try {
      await markAllAsRead()
    } catch (error) {
      console.warn('Mark all notifications read failed:', error)
    }
  }, [])

  const markTicketAsRead = useCallback(async (ticketId) => {
    if (!ticketId) return
    let hadUnread = false
    setNotifications((current) =>
      current.map((item) => {
        if (item.ticket_id === ticketId && !item.is_read) {
          hadUnread = true
          return { ...item, is_read: true }
        }
        return item
      }),
    )
    if (!hadUnread) return
    try {
      await markTicketRead(ticketId)
    } catch (error) {
      console.warn('Mark ticket notifications read failed:', error)
    }
  }, [])

  const value = useMemo(
    () => ({
      notifications,
      loading,
      unreadCount,
      unreadByType,
      unreadByTicket,
      markOneRead,
      markAllRead,
      markTicketAsRead,
    }),
    [
      notifications,
      loading,
      unreadCount,
      unreadByType,
      unreadByTicket,
      markOneRead,
      markAllRead,
      markTicketAsRead,
    ],
  )

  return <NotificationContext.Provider value={value}>{children}</NotificationContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export function useNotifications() {
  const context = useContext(NotificationContext)
  if (!context) {
    throw new Error('useNotifications must be used inside NotificationProvider')
  }
  return context
}
