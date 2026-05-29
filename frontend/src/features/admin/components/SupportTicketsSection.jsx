import { useEffect, useMemo, useState } from 'react'
import { ChevronDown, ChevronUp, Mail, MessageCircle, RefreshCw } from 'lucide-react'
import { Button } from '../../../shared/ui/Button'
import { AlertMessage } from '../../../shared/ui/AlertMessage'
import {
  getSupportTickets,
  SUPPORT_CATEGORY_LABELS,
  SUPPORT_STATUS_LABELS,
  SUPPORT_TICKET_STATUSES,
  updateSupportTicketStatus,
} from '../../../services/supportAdminService'
import { toUserFacingError, USER_MESSAGES } from '../../../shared/utils/userFacingError'

const STATUS_FILTERS = ['all', ...SUPPORT_TICKET_STATUSES]

function formatTicketDate(value) {
  if (!value) return '—'
  return new Date(value).toLocaleString('ro-RO', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function statusBadgeClass(status) {
  if (status === 'open') return 'bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300'
  if (status === 'in_progress') return 'bg-blue-100 text-blue-800 dark:bg-blue-950/40 dark:text-blue-300'
  return 'bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
}

export function SupportTicketsSection() {
  const [tickets, setTickets] = useState([])
  const [loading, setLoading] = useState(true)
  const [savingId, setSavingId] = useState(null)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [expandedId, setExpandedId] = useState(null)

  async function loadTickets() {
    setLoading(true)
    setError('')
    try {
      const rows = await getSupportTickets()
      setTickets(rows)
    } catch (loadError) {
      setError(toUserFacingError(loadError, USER_MESSAGES.load))
    } finally {
      setLoading(false)
    }
  }

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

  const filteredTickets = useMemo(() => {
    if (statusFilter === 'all') return tickets
    return tickets.filter((ticket) => ticket.status === statusFilter)
  }, [tickets, statusFilter])

  const openCount = useMemo(
    () => tickets.filter((ticket) => ticket.status === 'open').length,
    [tickets],
  )

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
            Solicitările trimise din formularul de suport apar aici ca tickete. Nu se mai trimite email
            către echipă — răspunsul se gestionează din acest panou.
          </p>
        </div>

        <Button
          type="button"
          variant="outline"
          onClick={loadTickets}
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
        {STATUS_FILTERS.map((filter) => {
          const active = statusFilter === filter
          const label =
            filter === 'all'
              ? `Toate (${tickets.length})`
              : `${SUPPORT_STATUS_LABELS[filter]} (${tickets.filter((t) => t.status === filter).length})`
          return (
            <button
              key={filter}
              type="button"
              onClick={() => setStatusFilter(filter)}
              className={`rounded-full px-4 py-2 text-xs font-black uppercase tracking-widest transition-colors ${
                active
                  ? 'bg-primary text-white'
                  : 'bg-white text-slate-500 ring-2 ring-border hover:text-primary dark:bg-slate-900'
              }`}
            >
              {label}
            </button>
          )
        })}
        {openCount > 0 && (
          <span className="text-xs font-semibold text-amber-600 dark:text-amber-400">
            {openCount} ticket{openCount === 1 ? '' : 'e'} nou{openCount === 1 ? '' : 'e'}
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
            Nu există tickete {statusFilter === 'all' ? '' : `cu status „${SUPPORT_STATUS_LABELS[statusFilter]}”`}.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredTickets.map((ticket) => {
            const expanded = expandedId === ticket.id
            const categoryLabel = SUPPORT_CATEGORY_LABELS[ticket.category] ?? ticket.category
            const statusLabel = SUPPORT_STATUS_LABELS[ticket.status] ?? ticket.status

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
                    <div className="rounded-xl border border-dashed border-border bg-slate-50 p-4 text-sm leading-relaxed text-slate-700 whitespace-pre-wrap dark:bg-white/5 dark:text-slate-200">
                      {ticket.message}
                    </div>

                    <div className="flex flex-wrap gap-3">
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
