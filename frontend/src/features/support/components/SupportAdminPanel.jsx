import { useCallback, useEffect, useMemo, useState } from 'react'

import { ArrowLeft, Headphones, Loader2, Trash2, X } from 'lucide-react'

import { useAuth } from '../../../app/providers/AuthProvider'
import { useNotifications } from '../../../app/providers/NotificationProvider'
import { Button } from '../../../shared/ui/Button'
import { AlertMessage } from '../../../shared/ui/AlertMessage'
import { toUserFacingError } from '../../../shared/utils/userFacingError'
import {
  claimTicket,
  closeTicket,
  deleteTicket,
  listAllTicketsForAdmin,
} from '../../../services/supportTicketService'
import { TICKET_STATUS_LABELS } from '../constants'
import { useSupportInboxRealtime } from '../hooks/useSupportInboxRealtime'
import { SupportTicketList } from './SupportTicketList'
import { SupportTicketThread } from './SupportTicketThread'

const FILTERS = [
  { id: 'open', label: 'Noi' },
  { id: 'in_progress', label: 'În lucru' },
  { id: 'closed', label: 'Închise' },
  { id: 'all', label: 'Toate' },
]

/**
 * Inbox-ul de suport pentru administratori, integrat în widgetul flotant: lista
 * tuturor ticketelor, preluarea (acceptarea), răspunsul și închiderea lor.
 */
export function SupportAdminPanel({ onClose }) {
  const { user } = useAuth()
  const { unreadByTicket, markTicketRead } = useNotifications()
  const [tickets, setTickets] = useState([])
  const [filter, setFilter] = useState('open')
  const [selected, setSelected] = useState(null)
  const [view, setView] = useState('list')
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(false)
  const [error, setError] = useState('')

  const loadTickets = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const rows = await listAllTicketsForAdmin()
      setTickets(rows)
    } catch (err) {
      setError(toUserFacingError(err))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadTickets()
  }, [loadTickets])

  useSupportInboxRealtime(true, setTickets)

  const filtered = useMemo(() => {
    if (filter === 'all') return tickets
    return tickets.filter((t) => t.status === filter)
  }, [tickets, filter])

  const pendingCount = useMemo(
    () => tickets.filter((t) => t.status === 'open').length,
    [tickets],
  )

  const isAssignedToMe = selected?.assigned_admin_id === user?.id
  const canReplyAsAdmin = isAssignedToMe && selected?.status !== 'closed'
  const canClaim = selected && !selected.assigned_admin_id && selected.status !== 'closed'
  const canClose = isAssignedToMe && selected?.status !== 'closed'
  const canDelete = selected?.status === 'closed'

  const handleClaim = async () => {
    if (!selected?.id) return
    setActionLoading(true)
    setError('')
    try {
      const updated = await claimTicket(selected.id)
      setSelected(updated)
      setTickets((prev) => prev.map((t) => (t.id === updated.id ? { ...t, ...updated } : t)))
    } catch (err) {
      setError(toUserFacingError(err))
    } finally {
      setActionLoading(false)
    }
  }

  const handleClose = async () => {
    if (!selected?.id) return
    setActionLoading(true)
    setError('')
    try {
      await closeTicket(selected.id)
      const closed = { ...selected, status: 'closed' }
      setSelected(closed)
      setTickets((prev) => prev.map((t) => (t.id === closed.id ? { ...t, status: 'closed' } : t)))
    } catch (err) {
      setError(toUserFacingError(err))
    } finally {
      setActionLoading(false)
    }
  }

  const handleDelete = async () => {
    if (!selected?.id) return
    const confirmed = window.confirm(
      'Ștergi definitiv acest ticket închis? Conversația și notificările asociate vor fi pierdute.',
    )
    if (!confirmed) return
    setActionLoading(true)
    setError('')
    try {
      await deleteTicket(selected.id)
      setTickets((prev) => prev.filter((t) => t.id !== selected.id))
      setView('list')
      setSelected(null)
    } catch (err) {
      setError(toUserFacingError(err))
    } finally {
      setActionLoading(false)
    }
  }

  const handleSelect = (ticket) => {
    setSelected(ticket)
    setView('thread')
    setError('')
    markTicketRead(ticket.id)
  }

  const handleBack = () => {
    setView('list')
    setSelected(null)
    setError('')
  }

  const inThread = view === 'thread' && selected
  const headerTitle = inThread ? selected.user_name || selected.user_email : 'Tickete suport'
  const statusLabel = inThread && (TICKET_STATUS_LABELS[selected.status] ?? selected.status)
  const headerSub = inThread
    ? `${statusLabel}${isAssignedToMe ? ' · Preluat de tine' : ''}`
    : pendingCount > 0
      ? `${pendingCount} ${pendingCount === 1 ? 'ticket nou' : 'tickete noi'}`
      : 'Niciun ticket nou'

  return (
    <>
      <header className="support-chat-header shrink-0">
        <div className="flex min-w-0 flex-1 items-center gap-2">
          {inThread ? (
            <button
              type="button"
              onClick={handleBack}
              className="support-chat-icon-btn shrink-0"
              aria-label="Înapoi la listă"
            >
              <ArrowLeft className="size-4" />
            </button>
          ) : (
            <span className="support-chat-medallion shrink-0" aria-hidden>
              <Headphones className="size-4" />
              <span className="support-chat-medallion-dot" />
            </span>
          )}
          <div className="min-w-0 flex-1">
            <h2
              className="support-chat-header-title truncate"
              title={inThread ? selected.user_email : undefined}
            >
              {headerTitle}
            </h2>
            <p className="support-chat-header-sub truncate">
              {!inThread && <span className="support-chat-online-dot" aria-hidden />}
              {headerSub}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="support-chat-icon-btn shrink-0"
          aria-label="Închide"
        >
          <X className="size-4" />
        </button>
      </header>

      {inThread ? (
        <div className="flex min-h-0 flex-1 flex-col">
          {(canClaim || canClose || canDelete) && (
            <div className="flex shrink-0 flex-wrap items-center justify-end gap-1.5 border-b border-border px-3 py-2">
              {canClaim && (
                <Button
                  size="sm"
                  variant="outline"
                  disabled={actionLoading}
                  onClick={handleClaim}
                  className="!h-7 !px-2.5 !text-xs"
                >
                  Preia ticket
                </Button>
              )}
              {canClose && (
                <Button
                  size="sm"
                  variant="secondary"
                  disabled={actionLoading}
                  onClick={handleClose}
                  className="!h-7 !px-2.5 !text-xs"
                >
                  Închide
                </Button>
              )}
              {canDelete && (
                <Button
                  size="sm"
                  variant="ghost"
                  disabled={actionLoading}
                  onClick={handleDelete}
                  className="!h-7 !px-2.5 !text-xs !text-red-600 hover:!bg-red-50 dark:!text-red-400 dark:hover:!bg-red-500/10"
                >
                  <Trash2 className="!size-3.5" />
                  Șterge ticket
                </Button>
              )}
            </div>
          )}

          {error && (
            <div className="shrink-0 px-2 pt-2">
              <AlertMessage message={error} variant="error" />
            </div>
          )}

          <div className="min-h-0 flex-1">
            <SupportTicketThread
              ticket={selected}
              mode="admin"
              canReply={canReplyAsAdmin}
              compactHeader
              onTicketRead={markTicketRead}
            />
          </div>

          {selected.assigned_admin_id && !isAssignedToMe && selected.status !== 'closed' && (
            <p className="shrink-0 border-t border-border px-3 py-2 text-center text-[11px] text-amber-600 dark:text-amber-400">
              Ticket preluat de{' '}
              {selected.assigned_admin_name || selected.assigned_admin_email || 'alt administrator'}.
              {' '}Poți citi conversația, dar nu poți răspunde.
            </p>
          )}
        </div>
      ) : (
        <div className="flex min-h-0 flex-1 flex-col">
          <div className="flex shrink-0 flex-wrap gap-1.5 border-b border-border px-2 py-2">
            {FILTERS.map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => setFilter(f.id)}
                className={`rounded-full px-2.5 py-0.5 text-[10px] font-semibold transition-colors ${
                  filter === f.id
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-muted-foreground hover:text-foreground'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          {error && (
            <div className="shrink-0 px-2 pt-2">
              <AlertMessage message={error} variant="error" />
            </div>
          )}

          {loading ? (
            <div className="flex justify-center py-10">
              <Loader2 className="size-6 animate-spin text-primary" aria-hidden />
            </div>
          ) : (
            <SupportTicketList
              tickets={filtered}
              selectedId={selected?.id}
              onSelect={handleSelect}
              unreadByTicket={unreadByTicket}
              showRequester
              emptyLabel="Niciun ticket în această categorie."
            />
          )}
        </div>
      )}
    </>
  )
}
