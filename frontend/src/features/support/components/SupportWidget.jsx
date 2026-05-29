import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { ArrowLeft, MessageCircle, Plus, Send, X } from 'lucide-react'
import { useAuth } from '../../../app/providers/AuthProvider'
import { useNotifications } from '../../../app/providers/NotificationProvider'
import { Button } from '../../../shared/ui/Button'
import { AlertMessage } from '../../../shared/ui/AlertMessage'
import {
  getMySupportTickets,
  sendSupportMessage,
  submitSupportRequest,
  SUPPORT_SAVED_WITH_AUTOREPLY,
  SUPPORT_SAVED_WITHOUT_AUTOREPLY,
} from '../../../services/supportService'
import {
  buildTicketThread,
  formatTicketDate,
  SUPPORT_CATEGORY_LABELS,
  SUPPORT_STATUS_LABELS,
} from '../../../services/supportConstants'
import { toUserFacingError, USER_MESSAGES } from '../../../shared/utils/userFacingError'
import { useSupportRealtime } from '../hooks/useSupportRealtime'
import { SupportChatPanel } from './SupportChatPanel'

const CATEGORIES = [
  { value: 'technical', label: 'Problemă tehnică' },
  { value: 'billing', label: 'Facturare' },
  { value: 'content', label: 'Conținut lecții' },
  { value: 'other', label: 'Altele' },
]

const INITIAL_FORM = {
  category: 'technical',
  subject: '',
  message: '',
}

function statusBadgeClass(status) {
  if (status === 'open') return 'bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300'
  if (status === 'in_progress') return 'bg-blue-100 text-blue-800 dark:bg-blue-950/40 dark:text-blue-300'
  return 'bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
}

/**
 * Widget plutitor de suport pentru colțul din dreapta-jos al paginii.
 * Reutilizează serviciile și `SupportChatPanel` din pagina de suport, oferind
 * trei vederi: lista tichetelor, firul unui tichet și formularul pentru un
 * mesaj nou.
 */
export function SupportWidget() {
  const { user } = useAuth()
  const { unreadByType, markTicketAsRead } = useNotifications()
  const replyUnread = unreadByType?.support_reply ?? 0
  const [open, setOpen] = useState(false)
  const [view, setView] = useState('list')

  const [tickets, setTickets] = useState([])
  const [ticketsLoading, setTicketsLoading] = useState(false)
  const [ticketsError, setTicketsError] = useState('')
  const [activeTicketId, setActiveTicketId] = useState(null)
  const [sendingTicketId, setSendingTicketId] = useState(null)

  const [form, setForm] = useState(INITIAL_FORM)
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState('')
  const [submitSuccess, setSubmitSuccess] = useState('')

  const hasLoadedRef = useRef(false)

  const loadMyTickets = useCallback(async ({ silent = false } = {}) => {
    if (!user) return
    if (!silent) {
      setTicketsLoading(true)
      setTicketsError('')
    }
    try {
      const rows = await getMySupportTickets()
      setTickets(rows)
    } catch (loadError) {
      if (!silent) setTicketsError(toUserFacingError(loadError, USER_MESSAGES.load))
    } finally {
      if (!silent) setTicketsLoading(false)
    }
  }, [user])

  // Load tickets whenever the widget opens. The first open shows a spinner;
  // subsequent opens refresh quietly so anything that arrived while the realtime
  // subscription was paused (widget closed) is reconciled.
  useEffect(() => {
    if (!open || !user) return
    const silent = hasLoadedRef.current
    hasLoadedRef.current = true
    loadMyTickets({ silent })
  }, [open, user, loadMyTickets])

  // Live-merge incoming chat messages instead of polling. RLS limits the stream
  // to the current user's own tickets.
  const mergeRealtimeMessage = useCallback((message) => {
    setTickets((current) => {
      let found = false
      const next = current.map((ticket) => {
        if (ticket.id !== message.ticket_id) return ticket
        found = true
        const existing = ticket.support_request_messages ?? []
        if (existing.some((item) => item.id === message.id)) return ticket
        return { ...ticket, support_request_messages: [...existing, message] }
      })
      return found ? next : current
    })
  }, [])

  useSupportRealtime({
    enabled: open && Boolean(user),
    userId: user?.id ?? null,
    onMessage: mergeRealtimeMessage,
  })

  const activeTicket = useMemo(
    () => tickets.find((ticket) => ticket.id === activeTicketId) ?? null,
    [tickets, activeTicketId],
  )

  const handleSendMessage = async (ticket, text) => {
    setSendingTicketId(ticket.id)
    setTicketsError('')
    try {
      const message = await sendSupportMessage(ticket.id, text)
      if (message) {
        setTickets((current) =>
          current.map((item) =>
            item.id === ticket.id
              ? {
                  ...item,
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
      setTicketsError(toUserFacingError(sendError, USER_MESSAGES.save))
      return false
    } finally {
      setSendingTicketId(null)
    }
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    setSubmitError('')
    setSubmitSuccess('')

    if (!form.subject.trim()) {
      setSubmitError('Subiectul solicitării este obligatoriu.')
      return
    }
    if (!form.message.trim()) {
      setSubmitError('Mesajul solicitării este obligatoriu.')
      return
    }

    setSubmitting(true)
    try {
      const result = await submitSupportRequest({
        category: form.category,
        subject: form.subject,
        message: form.message,
      })
      setForm(INITIAL_FORM)
      setSubmitSuccess(
        result.autoreplyDelivered ? SUPPORT_SAVED_WITH_AUTOREPLY : SUPPORT_SAVED_WITHOUT_AUTOREPLY,
      )
      await loadMyTickets({ silent: true })
      if (result.id) {
        setActiveTicketId(result.id)
        setView('chat')
      }
    } catch (error) {
      setSubmitError(toUserFacingError(error, USER_MESSAGES.supportSubmit))
    } finally {
      setSubmitting(false)
    }
  }

  const openNewConversation = () => {
    setForm(INITIAL_FORM)
    setSubmitError('')
    setSubmitSuccess('')
    setView('new')
  }

  const openTicket = (ticketId) => {
    setActiveTicketId(ticketId)
    setTicketsError('')
    setView('chat')
    void markTicketAsRead(ticketId)
  }

  const inputClass =
    'w-full rounded-xl border-2 border-border bg-slate-50 px-3 py-2.5 text-sm font-semibold text-slate-900 focus:border-primary focus:outline-none transition-all dark:bg-white/5 dark:text-white'
  const labelClass = 'mb-1.5 block text-[10px] font-black uppercase tracking-[0.2em] text-slate-400'

  let headerTitle = 'Suport MathUP'
  if (view === 'chat' && activeTicket) headerTitle = activeTicket.subject
  else if (view === 'new') headerTitle = 'Mesaj nou'

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col items-end sm:bottom-6 sm:right-6">
      {open && (
        <div className="mb-3 flex h-[32rem] max-h-[calc(100vh-6rem)] w-[min(22rem,calc(100vw-2rem))] flex-col overflow-hidden rounded-3xl border-2 border-border bg-white shadow-2xl dark:bg-slate-900">
          <header className="flex items-center gap-2 border-b-2 border-border bg-slate-50 px-4 py-3 dark:bg-white/5">
            {view !== 'list' ? (
              <button
                type="button"
                onClick={() => setView('list')}
                className="rounded-lg p-1 text-slate-400 transition-colors hover:bg-slate-200 hover:text-primary dark:hover:bg-slate-800"
                aria-label="Înapoi la conversații"
              >
                <ArrowLeft className="size-4" />
              </button>
            ) : (
              <MessageCircle className="size-5 shrink-0 text-primary" />
            )}
            <h2 className="min-w-0 flex-1 truncate text-sm font-black uppercase tracking-tight text-slate-900 dark:text-white">
              {headerTitle}
            </h2>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="rounded-lg p-1 text-slate-400 transition-colors hover:bg-slate-200 hover:text-primary dark:hover:bg-slate-800"
              aria-label="Închide chatul"
            >
              <X className="size-4" />
            </button>
          </header>

          <div className="min-h-0 flex-1 overflow-y-auto p-4">
            {view === 'list' && (
              <div className="space-y-3">
                {ticketsError && <AlertMessage message={ticketsError} type="error" />}

                {ticketsLoading ? (
                  <div className="flex min-h-[12rem] items-center justify-center">
                    <div className="size-8 animate-spin rounded-full border-4 border-primary/10 border-t-primary" />
                  </div>
                ) : tickets.length === 0 ? (
                  <div className="flex min-h-[12rem] flex-col items-center justify-center gap-3 text-center">
                    <MessageCircle className="size-10 text-primary/30" />
                    <p className="text-sm font-semibold text-slate-400">
                      Nu ai conversații încă. Scrie-ne și îți răspundem rapid.
                    </p>
                  </div>
                ) : (
                  tickets.map((ticket) => {
                    const categoryLabel = SUPPORT_CATEGORY_LABELS[ticket.category] ?? ticket.category
                    const statusLabel = SUPPORT_STATUS_LABELS[ticket.status] ?? ticket.status
                    return (
                      <button
                        key={ticket.id}
                        type="button"
                        onClick={() => openTicket(ticket.id)}
                        className="w-full rounded-2xl border-2 border-border bg-slate-50 p-3 text-left transition-colors hover:border-primary hover:bg-white dark:bg-white/5 dark:hover:bg-slate-800/40"
                      >
                        <div className="mb-1.5 flex flex-wrap items-center gap-1.5">
                          <span className={`rounded-full px-2 py-0.5 text-[9px] font-black uppercase tracking-widest ${statusBadgeClass(ticket.status)}`}>
                            {statusLabel}
                          </span>
                          <span className="rounded-full bg-white px-2 py-0.5 text-[9px] font-black uppercase tracking-widest text-slate-600 ring-1 ring-border dark:bg-slate-900 dark:text-slate-300">
                            {categoryLabel}
                          </span>
                        </div>
                        <p className="truncate text-sm font-black tracking-tight text-slate-900 dark:text-white">
                          {ticket.subject}
                        </p>
                        <p className="mt-0.5 text-[10px] font-bold uppercase tracking-widest text-slate-400">
                          {formatTicketDate(ticket.created_at)}
                        </p>
                      </button>
                    )
                  })
                )}
              </div>
            )}

            {view === 'chat' && activeTicket && (
              <div className="space-y-3">
                {ticketsError && <AlertMessage message={ticketsError} type="error" />}
                <SupportChatPanel
                  messages={buildTicketThread(activeTicket)}
                  selfRole="user"
                  selfUserId={user?.id ?? null}
                  peerLabel="Echipă MathUP"
                  onSend={(text) => handleSendMessage(activeTicket, text)}
                  sending={sendingTicketId === activeTicket.id}
                  closed={activeTicket.status === 'closed'}
                />
              </div>
            )}

            {view === 'new' && (
              <form onSubmit={handleSubmit} className="space-y-4">
                {submitSuccess && <AlertMessage type="success" message={submitSuccess} />}
                {submitError && <AlertMessage message={submitError} />}

                <div>
                  <label htmlFor="widget-category" className={labelClass}>Departament</label>
                  <select
                    id="widget-category"
                    className={`${inputClass} cursor-pointer appearance-none pr-8`}
                    value={form.category}
                    onChange={(event) => setForm((prev) => ({ ...prev, category: event.target.value }))}
                    disabled={submitting || Boolean(submitSuccess)}
                  >
                    {CATEGORIES.map((item) => (
                      <option key={item.value} value={item.value} className="bg-white dark:bg-slate-900">
                        {item.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label htmlFor="widget-subject" className={labelClass}>Subiect</label>
                  <input
                    id="widget-subject"
                    type="text"
                    maxLength={120}
                    className={inputClass}
                    value={form.subject}
                    onChange={(event) => setForm((prev) => ({ ...prev, subject: event.target.value }))}
                    placeholder="Ex: Nu pot accesa lecția"
                    required
                    disabled={submitting || Boolean(submitSuccess)}
                  />
                </div>

                <div>
                  <label htmlFor="widget-message" className={labelClass}>Mesaj</label>
                  <textarea
                    id="widget-message"
                    rows={5}
                    maxLength={2000}
                    className={`${inputClass} resize-none`}
                    value={form.message}
                    onChange={(event) => setForm((prev) => ({ ...prev, message: event.target.value }))}
                    placeholder="Descrie pe scurt cu ce te putem ajuta…"
                    required
                    disabled={submitting || Boolean(submitSuccess)}
                  />
                  <div className="mt-1 flex justify-end">
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-300">
                      {form.message.length}/2000
                    </span>
                  </div>
                </div>

                {!submitSuccess && (
                  <Button type="submit" className="h-12 w-full rounded-xl" disabled={submitting}>
                    {submitting ? 'Se trimite…' : 'Trimite'}
                    {!submitting && <Send className="ml-2 size-4" />}
                  </Button>
                )}
              </form>
            )}
          </div>

          {view === 'list' && !ticketsLoading && (
            <div className="border-t-2 border-border p-3">
              <Button type="button" onClick={openNewConversation} className="h-11 w-full rounded-xl">
                <Plus className="mr-2 size-4" />
                Mesaj nou
              </Button>
            </div>
          )}
        </div>
      )}

      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="relative flex size-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-xl shadow-primary/30 transition-transform hover:scale-105 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
        aria-label={open ? 'Închide chatul de suport' : 'Deschide chatul de suport'}
        aria-expanded={open}
      >
        {open ? <X className="size-6" /> : <MessageCircle className="size-6" />}
        {!open && replyUnread > 0 && (
          <span className="absolute -right-1 -top-1 flex min-w-[1.25rem] items-center justify-center rounded-full bg-red-500 px-1 text-[11px] font-black leading-5 text-white ring-2 ring-white dark:ring-slate-950">
            {replyUnread > 9 ? '9+' : replyUnread}
          </span>
        )}
      </button>
    </div>
  )
}
