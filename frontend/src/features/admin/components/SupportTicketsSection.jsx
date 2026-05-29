import { useCallback, useEffect, useMemo, useState } from 'react'
import { ChevronDown, ChevronUp, Mail, MessageCircle, RefreshCw, UserCheck } from 'lucide-react'
import { Button } from '../../../shared/ui/Button'
import { AlertMessage } from '../../../shared/ui/AlertMessage'
import { useAuth } from '../../../app/providers/AuthProvider'
import {
  claimSupportTicket,
  getSupportTickets,
  sendSupportMessage,
  SUPPORT_CATEGORY_LABELS,
  SUPPORT_STATUS_LABELS,
  SUPPORT_TICKET_STATUSES,
  updateSupportTicketStatus,
} from '../../../services/supportAdminService'
import { buildTicketThread, formatTicketDate } from '../../../services/supportConstants'
import { toUserFacingError, USER_MESSAGES } from '../../../shared/utils/userFacingError'
import { SupportChatPanel } from '../../support/components/SupportChatPanel'

const ASSIGNMENT_FILTERS = [
  { id: 'all', label: 'Toate' },
  { id: 'unassigned', label: 'Nepreluate' },
  { id: 'mine', label: 'Preluate de mine' },
]

const POLL_INTERVAL_MS = 20000

function statusBadgeClass(status) {
  if (status === 'open') return 'bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300'
  if (status === 'in_progress') return 'bg-blue-100 text-blue-800 dark:bg-blue-950/40 dark:text-blue-300'
  return 'bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
}

export function SupportTicketsSection() {
  const { user } = useAuth()
  const adminId = user?.id ?? null

  const [tickets, setTickets] = useState([])
  const [loading, setLoading] = useState(true)
  const [savingId, setSavingId] = useState(null)
  const [claimingId, setClaimingId] = useState(null)
  const [sendingId, setSendingId] = useState(null)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [assignmentFilter, setAssignmentFilter] = useState('all')
  const [expandedId, setExpandedId] = useState(null)

  const loadTickets = useCallback(async ({ silent = false } = {}) => {
    if (!silent) setLoading(true)
    if (!silent) setError('')
    try {
      const rows = await getSupportTickets()
      setTickets(rows)
    } catch (loadError) {
      if (!silent) setError(toUserFacingError(loadError, USER_MESSAGES.load))
    } finally {
      if (!silent) setLoading(false)
    }
  }, [])

  useEffect(() => {
    let cancelled = false

    ;(async () => {
      setLoading(true)
      setError('')
      try {
        const rows = await getSupportTickets()
        if (!cancelled) setTickets(rows)
      } catch (loadError) {
        if (!cancelled) setError(toUserFacingError(loadError, USER_MESSAGES.load))
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()

    return () => {
      cancelled = true
    }
  }, [])

  // Live-ish chat: refresh quietly while a conversation is open.
  useEffect(() => {
    if (!expandedId) return undefined
    const id = setInterval(() => loadTickets({ silent: true }), POLL_INTERVAL_MS)
    return () => clearInterval(id)
  }, [expandedId, loadTickets])

  const filteredTickets = useMemo(() => {
    if (assignmentFilter === 'unassigned') {
      return tickets.filter((ticket) => !ticket.assigned_admin_id)
    }
    if (assignmentFilter === 'mine') {
      return tickets.filter((ticket) => ticket.assigned_admin_id === adminId)
    }
    return tickets
  }, [tickets, assignmentFilter, adminId])

  const unassignedCount = useMemo(
    () => tickets.filter((ticket) => !ticket.assigned_admin_id).length,
    [tickets],
  )
  const mineCount = useMemo(
    () => tickets.filter((ticket) => ticket.assigned_admin_id === adminId).length,
    [tickets, adminId],
  )

  const filterCount = (id) => {
    if (id === 'unassigned') return unassignedCount
    if (id === 'mine') return mineCount
    return tickets.length
  }

  const mergeTicket = (ticketId, patch) => {
    setTickets((current) =>
      current.map((ticket) => (ticket.id === ticketId ? { ...ticket, ...patch } : ticket)),
    )
  }

  const handleStatusChange = async (ticketId, status) => {
    setSavingId(ticketId)
    setError('')
    setSuccess('')
    try {
      const updated = await updateSupportTicketStatus(ticketId, status)
      setTickets((current) =>
        current.map((ticket) => (ticket.id === updated.id ? updated : ticket)),
      )
      setSuccess('Statusul ticketului a fost actualizat.')
    } catch (saveError) {
      setError(toUserFacingError(saveError, USER_MESSAGES.save))
    } finally {
      setSavingId(null)
    }
  }

  const handleClaim = async (ticketId) => {
    setClaimingId(ticketId)
    setError('')
    setSuccess('')
    try {
      const claimed = await claimSupportTicket(ticketId)
      mergeTicket(ticketId, {
        assigned_admin_id: claimed?.assigned_admin_id ?? adminId,
        assigned_at: claimed?.assigned_at ?? new Date().toISOString(),
        status: claimed?.status ?? 'in_progress',
      })
      setSuccess('Ai preluat ticketul. Doar tu poți răspunde acum.')
    } catch (claimError) {
      setError(toUserFacingError(claimError, USER_MESSAGES.save))
      // Another admin may have claimed it first; refresh to reflect reality.
      loadTickets({ silent: true })
    } finally {
      setClaimingId(null)
    }
  }

  const handleSend = async (ticket, text) => {
    setSendingId(ticket.id)
    setError('')
    try {
      const message = await sendSupportMessage(ticket.id, text)
      if (message) {
        setTickets((current) =>
          current.map((item) =>
            item.id === ticket.id
              ? {
                  ...item,
                  status: item.status === 'open' ? 'in_progress' : item.status,
                  support_request_messages: [
                    ...(item.support_request_messages ?? []),
                    message,
                  ],
                }
              : item,
          ),
        )
      }
      return true
    } catch (sendError) {
      setError(toUserFacingError(sendError, USER_MESSAGES.save))
      return false
    } finally {
      setSendingId(null)
    }
  }

  return (
    <section className="space-y-8">
      <div className="flex flex-col gap-4 border-b-2 border-border pb-8 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 rounded bg-slate-900 px-3 py-1 text-[10px] font-black uppercase tracking-wide text-white dark:bg-white dark:text-slate-950">
            <MessageCircle className="size-3.5" />
            Suport / Tickete
          </div>
          <h2 className="text-2xl font-black uppercase tracking-tight text-slate-900 dark:text-white">
            Mesaje utilizatori
          </h2>
          <p className="max-w-2xl text-sm font-medium text-slate-600 dark:text-slate-400">
            Fiecare solicitare devine o conversație. Preia un ticket pentru a răspunde — odată
            preluat, doar tu poți scrie în acel chat, iar elevul vede răspunsurile direct în platformă.
          </p>
        </div>

        <Button
          type="button"
          variant="outline"
          onClick={() => loadTickets()}
          disabled={loading}
          className="h-12 rounded-xl"
        >
          <RefreshCw className={`mr-2 size-4 ${loading ? 'animate-spin' : ''}`} />
          Reîncarcă
        </Button>
      </div>

      {success && <AlertMessage message={success} type="success" />}
      {error && <AlertMessage message={error} type="error" />}

      <div className="flex flex-wrap items-center gap-3">
        {ASSIGNMENT_FILTERS.map((filter) => {
          const active = assignmentFilter === filter.id
          return (
            <button
              key={filter.id}
              type="button"
              onClick={() => setAssignmentFilter(filter.id)}
              className={`rounded-full px-4 py-2 text-xs font-black uppercase tracking-widest transition-colors ${
                active
                  ? 'bg-primary text-white'
                  : 'bg-white text-slate-500 ring-2 ring-border hover:text-primary dark:bg-slate-900'
              }`}
            >
              {filter.label} ({filterCount(filter.id)})
            </button>
          )
        })}
        {unassignedCount > 0 && (
          <span className="text-xs font-semibold text-amber-600 dark:text-amber-400">
            {unassignedCount} nepreluat{unassignedCount === 1 ? '' : 'e'}
          </span>
        )}
      </div>

      {loading ? (
        <div className="flex min-h-[30vh] items-center justify-center">
          <div className="size-10 animate-spin rounded-full border-4 border-primary/10 border-t-primary" />
        </div>
      ) : filteredTickets.length === 0 ? (
        <div className="rounded-[2rem] border-2 border-dashed border-border bg-white p-12 text-center dark:bg-slate-900">
          <MessageCircle className="mx-auto mb-4 size-10 text-slate-300" />
          <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">
            Nu există tickete în această categorie.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredTickets.map((ticket) => {
            const expanded = expandedId === ticket.id
            const categoryLabel = SUPPORT_CATEGORY_LABELS[ticket.category] ?? ticket.category
            const statusLabel = SUPPORT_STATUS_LABELS[ticket.status] ?? ticket.status
            const closed = ticket.status === 'closed'
            const assignedToMe = ticket.assigned_admin_id === adminId
            const unassigned = !ticket.assigned_admin_id
            const assignmentLabel = unassigned
              ? 'Nepreluat'
              : assignedToMe
                ? 'Preluat de tine'
                : 'Preluat de alt admin'
            const readOnlyReason = unassigned
              ? 'Preia ticketul pentru a răspunde.'
              : assignedToMe
                ? null
                : 'Ticket preluat de alt administrator.'

            return (
              <article
                key={ticket.id}
                className="overflow-hidden rounded-[1.5rem] border-2 border-border bg-white shadow-sm dark:bg-slate-900"
              >
                <button
                  type="button"
                  onClick={() => setExpandedId(expanded ? null : ticket.id)}
                  className="flex w-full items-start gap-4 p-6 text-left transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/40"
                >
                  <div className="min-w-0 flex-1 space-y-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-widest ${statusBadgeClass(ticket.status)}`}>
                        {statusLabel}
                      </span>
                      <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-black uppercase tracking-widest text-slate-600 dark:bg-white/5 dark:text-slate-300">
                        {categoryLabel}
                      </span>
                      <span className={`rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-widest ${
                        unassigned
                          ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300'
                          : assignedToMe
                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300'
                            : 'bg-slate-200 text-slate-600 dark:bg-slate-800 dark:text-slate-300'
                      }`}>
                        {assignmentLabel}
                      </span>
                      <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                        {formatTicketDate(ticket.created_at)}
                      </span>
                    </div>
                    <h3 className="text-lg font-black tracking-tight text-slate-900 dark:text-white">
                      {ticket.subject}
                    </h3>
                    <div className="flex flex-wrap items-center gap-4 text-sm text-slate-500 dark:text-slate-400">
                      <span>{ticket.user_name || 'Elev'}</span>
                      <span className="inline-flex items-center gap-1">
                        <Mail className="size-3.5" />
                        {ticket.user_email}
                      </span>
                    </div>
                    {!expanded && (
                      <p className="line-clamp-2 text-sm text-slate-600 dark:text-slate-300">
                        {ticket.message}
                      </p>
                    )}
                  </div>
                  {expanded ? (
                    <ChevronUp className="mt-1 size-5 shrink-0 text-slate-400" />
                  ) : (
                    <ChevronDown className="mt-1 size-5 shrink-0 text-slate-400" />
                  )}
                </button>

                {expanded && (
                  <div className="space-y-5 border-t-2 border-border px-6 py-5">
                    {unassigned && !closed && (
                      <Button
                        type="button"
                        onClick={() => handleClaim(ticket.id)}
                        disabled={claimingId === ticket.id}
                        className="h-11 rounded-xl"
                      >
                        <UserCheck className="mr-2 size-4" />
                        {claimingId === ticket.id ? 'Se preia…' : 'Preia ticketul'}
                      </Button>
                    )}

                    <SupportChatPanel
                      messages={buildTicketThread(ticket)}
                      selfRole="admin"
                      peerLabel={ticket.user_name || 'Elev'}
                      onSend={(text) => handleSend(ticket, text)}
                      sending={sendingId === ticket.id}
                      closed={closed}
                      readOnlyReason={readOnlyReason}
                    />

                    <div className="flex flex-wrap gap-3 border-t-2 border-border pt-5">
                      {SUPPORT_TICKET_STATUSES.map((status) => (
                        <Button
                          key={status}
                          type="button"
                          variant={ticket.status === status ? 'default' : 'outline'}
                          disabled={savingId === ticket.id || ticket.status === status}
                          onClick={() => handleStatusChange(ticket.id, status)}
                          className="h-11 rounded-xl text-xs font-black uppercase tracking-widest"
                        >
                          {SUPPORT_STATUS_LABELS[status]}
                        </Button>
                      ))}
                    </div>

                    <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                      ID ticket: {ticket.id}
                    </p>
                  </div>
                )}
              </article>
            )
          })}
        </div>
      )}
    </section>
  )
}
