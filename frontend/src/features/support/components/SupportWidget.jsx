import { useState } from 'react'

import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'

import { useAuth } from '../../../app/providers/AuthProvider'
import { useNotifications } from '../../../app/providers/NotificationProvider'
import { SupportWidgetLauncher } from './SupportWidgetLauncher'
import { SupportUserPanel } from './SupportUserPanel'
import { SupportAdminPanel } from './SupportAdminPanel'

export function SupportWidget() {
  const { isAdmin } = useAuth()
  const reduceMotion = useReducedMotion()
  const { supportReplyUnreadCount, supportNewTicketUnreadCount } = useNotifications()
  const [open, setOpen] = useState(false)

  // Administratorii sunt notificați în launcher despre ticketele noi și răspunsurile
  // primite la ticketele preluate; utilizatorii doar despre răspunsurile la solicitările lor.
  const launcherUnread = isAdmin
    ? supportNewTicketUnreadCount + supportReplyUnreadCount
    : supportReplyUnreadCount

  const panelMotion = reduceMotion
    ? { initial: false, animate: { opacity: 1 }, exit: { opacity: 0 } }
    : {
        initial: { opacity: 0, y: 12, scale: 0.98 },
        animate: { opacity: 1, y: 0, scale: 1 },
        exit: { opacity: 0, y: 10, scale: 0.98 },
        transition: { duration: 0.22, ease: [0.22, 1, 0.36, 1] },
      }

  return (
    <>
      <SupportWidgetLauncher
        open={open}
        unreadCount={launcherUnread}
        onToggle={() => setOpen((v) => !v)}
      />

      <AnimatePresence>
        {open && (
          <motion.div
            role="dialog"
            aria-label="Suport MathUP"
            className="support-chat-panel fixed bottom-[4.75rem] right-4 z-[110] h-[min(28rem,calc(100vh-6.5rem))] w-[min(22rem,calc(100vw-1.5rem))] sm:bottom-24 sm:right-6"
            {...panelMotion}
          >
            {isAdmin ? (
              <SupportAdminPanel onClose={() => setOpen(false)} />
            ) : (
              <SupportUserPanel onClose={() => setOpen(false)} />
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
