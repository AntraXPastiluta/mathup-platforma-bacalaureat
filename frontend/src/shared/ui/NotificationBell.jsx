import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Bell, CheckCheck, MessageSquare, Ticket } from 'lucide-react'
import { useAuth } from '../../app/providers/AuthProvider'
import { useNotifications } from '../../app/providers/NotificationProvider'

/** Format relativ scurt, în limba română (ex: „acum 5 min", „acum 2 h"). */
function formatRelativeTime(value) {
  if (!value) return ''
  const then = new Date(value).getTime()
  if (Number.isNaN(then)) return ''
  const diffSec = Math.max(0, Math.round((Date.now() - then) / 1000))
  if (diffSec < 60) return 'acum'
  const diffMin = Math.round(diffSec / 60)
  if (diffMin < 60) return `acum ${diffMin} min`
  const diffH = Math.round(diffMin / 60)
  if (diffH < 24) return `acum ${diffH} h`
  const diffD = Math.round(diffH / 24)
  if (diffD < 7) return `acum ${diffD} z`
  return new Date(value).toLocaleDateString('ro-RO', { day: '2-digit', month: 'short' })
}

function notificationIcon(type) {
  if (type === 'support_new_ticket') return Ticket
  return MessageSquare
}

export function NotificationBell() {
  const navigate = useNavigate()
  const { isAdmin } = useAuth()
  const { notifications, unreadCount, markOneRead, markAllRead, markTicketAsRead } =
    useNotifications()
  const [open, setOpen] = useState(false)
  const containerRef = useRef(null)

  useEffect(() => {
    if (!open) return undefined
    const handlePointerDown = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setOpen(false)
      }
    }
    const handleKey = (event) => {
      if (event.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', handlePointerDown)
    document.addEventListener('keydown', handleKey)
    return () => {
      document.removeEventListener('mousedown', handlePointerDown)
      document.removeEventListener('keydown', handleKey)
    }
  }, [open])

  const destinationFor = (notification) => {
    if (notification.type === 'support_new_ticket') return '/admin?section=support'
    return isAdmin ? '/admin?section=support' : '/support'
  }

  const handleSelect = (notification) => {
    setOpen(false)
    if (notification.ticket_id) {
      void markTicketAsRead(notification.ticket_id)
    } else if (!notification.is_read) {
      void markOneRead(notification.id)
    }
    navigate(destinationFor(notification))
  }

  const badgeLabel = unreadCount > 9 ? '9+' : String(unreadCount)

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="relative rounded-lg p-2 text-slate-600 transition-colors hover:bg-slate-200 hover:text-primary dark:text-slate-400 dark:hover:bg-slate-800"
        title="Notificări"
        aria-label="Notificări"
        aria-expanded={open}
      >
        <Bell className="size-5" />
        {unreadCount > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex min-w-[1.05rem] items-center justify-center rounded-full bg-primary px-1 text-[10px] font-black leading-4 text-white ring-2 ring-white dark:ring-slate-950">
            {badgeLabel}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 z-50 mt-2 w-[min(22rem,calc(100vw-2rem))] overflow-hidden rounded-2xl border-2 border-border bg-white shadow-2xl dark:bg-slate-900">
          <header className="flex items-center justify-between border-b-2 border-border px-4 py-3">
            <span className="text-xs font-black uppercase tracking-widest text-slate-900 dark:text-white">
              Notificări
            </span>
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={() => markAllRead()}
                className="inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-widest text-primary transition-opacity hover:opacity-70"
              >
                <CheckCheck className="size-3.5" />
                Marchează tot
              </button>
            )}
          </header>

          <div className="max-h-[24rem] overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="flex flex-col items-center gap-2 px-4 py-10 text-center">
                <Bell className="size-8 text-slate-300" />
                <p className="text-sm font-semibold text-slate-400">Nicio notificare încă.</p>
              </div>
            ) : (
              notifications.map((notification) => {
                const Icon = notificationIcon(notification.type)
                return (
                  <button
                    key={notification.id}
                    type="button"
                    onClick={() => handleSelect(notification)}
                    className={`flex w-full items-start gap-3 border-b border-border px-4 py-3 text-left transition-colors last:border-b-0 hover:bg-slate-50 dark:hover:bg-slate-800/40 ${
                      notification.is_read ? '' : 'bg-primary/5'
                    }`}
                  >
                    <span
                      className={`mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full ${
                        notification.is_read
                          ? 'bg-slate-100 text-slate-400 dark:bg-slate-800'
                          : 'bg-primary/15 text-primary'
                      }`}
                    >
                      <Icon className="size-4" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <p className="truncate text-sm font-black tracking-tight text-slate-900 dark:text-white">
                          {notification.title}
                        </p>
                        {!notification.is_read && (
                          <span className="size-2 shrink-0 rounded-full bg-primary" />
                        )}
                      </div>
                      {notification.body && (
                        <p className="truncate text-xs font-medium text-slate-500 dark:text-slate-400">
                          {notification.body}
                        </p>
                      )}
                      <p className="mt-0.5 text-[10px] font-bold uppercase tracking-widest text-slate-400">
                        {formatRelativeTime(notification.created_at)}
                      </p>
                    </div>
                  </button>
                )
              })
            )}
          </div>
        </div>
      )}
    </div>
  )
}
