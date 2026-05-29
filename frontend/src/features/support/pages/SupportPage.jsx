import { useCallback, useEffect, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, ChevronDown, ChevronUp, MessageCircle, Send } from 'lucide-react'
import { useAuth } from '../../../app/providers/AuthProvider'
import { Navbar } from '../../../shared/ui/Navbar'
import { AlertMessage } from '../../../shared/ui/AlertMessage'
import { Button } from '../../../shared/ui/Button'
import { BrandLogo } from '../../../shared/ui/BrandLogo'
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
import { useNotifications } from '../../../app/providers/NotificationProvider'
import { useSupportRealtime } from '../hooks/useSupportRealtime'
import { SupportChatPanel } from '../components/SupportChatPanel'

function statusBadgeClass(status) {
  if (status === 'open') return 'bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300'
  if (status === 'in_progress') return 'bg-blue-100 text-blue-800 dark:bg-blue-950/40 dark:text-blue-300'
  return 'bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
}

const CATEGORIES = [
  { value: 'billing', label: 'Facturare' },
  { value: 'technical', label: 'Problemă tehnică' },
  { value: 'content', label: 'Conținut lecții' },
  { value: 'other', label: 'Altele' },
]

const CATEGORY_EXAMPLES = {
  billing: {
    subject: 'Ex: Abonamentul Premium nu s-a activat după plată',
    message:
      'Ex: Am plătit pe data de …, dar în profil încă văd cont gratuit. Am folosit cardul / emailul … și nu am primit confirmare.',
  },
  technical: {
    subject: 'Ex: Nu pot accesa lecția sau pagina se încarcă greu',
    message:
      'Ex: Când deschid lecția … apare mesajul de eroare …. Pași: m-am logat → dashboard → …. Browser: Chrome / telefon.',
  },
  content: {
    subject: 'Ex: Eroare la exercițiu sau lecție incompletă',
    message:
      'Ex: La lecția „…” (Subiectul …), exercițiul … pare greșit / lipsește explicația / imaginea nu se încarcă. Ce așteptam să văd: …',
  },
  other: {
    subject: 'Ex: Întrebare despre cont sau utilizarea platformei',
    message:
      'Ex: Vreau să … / Am nevoie de ajutor cu …. Orice detaliu util (program M1/M2/M3, ce pagină, ce ai încercat deja).',
  },
}

const INITIAL_FORM = {
  category: 'technical',
  subject: '',
  message: '',
}

export function SupportPage() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const { markTicketAsRead } = useNotifications()
  const [form, setForm] = useState(INITIAL_FORM)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const [myTickets, setMyTickets] = useState([])
  const [ticketsLoading, setTicketsLoading] = useState(false)
  const [ticketsError, setTicketsError] = useState('')
  const [expandedTicketId, setExpandedTicketId] = useState(null)
  const [sendingTicketId, setSendingTicketId] = useState(null)

  const userEmail = user?.email || ''
  const userName = user?.user_metadata?.full_name?.trim() || 'Elev'

  const categoryExamples = useMemo(
    () => CATEGORY_EXAMPLES[form.category] ?? CATEGORY_EXAMPLES.technical,
    [form.category],
  )

  const loadMyTickets = useCallback(async ({ silent = false } = {}) => {
    if (!user) return
    if (!silent) {
      setTicketsLoading(true)
      setTicketsError('')
    }
    try {
      const rows = await getMySupportTickets()
      setMyTickets(rows)
    } catch (loadError) {
      if (!silent) setTicketsError(toUserFacingError(loadError, USER_MESSAGES.load))
    } finally {
      if (!silent) setTicketsLoading(false)
    }
  }, [user])

  useEffect(() => {
    if (!user) return undefined
    let cancelled = false

    ;(async () => {
      setTicketsLoading(true)
      setTicketsError('')
      try {
        const rows = await getMySupportTickets()
        if (!cancelled) setMyTickets(rows)
      } catch (loadError) {
        if (!cancelled) setTicketsError(toUserFacingError(loadError, USER_MESSAGES.load))
      } finally {
        if (!cancelled) setTicketsLoading(false)
      }
    })()

    return () => {
      cancelled = true
    }
  }, [user])

  // Live-merge incoming chat messages instead of polling. RLS limits the stream
  // to the current user's own tickets.
  const mergeRealtimeMessage = useCallback((message) => {
    setMyTickets((current) => {
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
    enabled: Boolean(user),
    userId: user?.id ?? null,
    onMessage: mergeRealtimeMessage,
  })

  // Opening a thread clears its unread notifications.
  useEffect(() => {
    if (expandedTicketId) void markTicketAsRead(expandedTicketId)
  }, [expandedTicketId, markTicketAsRead])

  const handleSendMessage = async (ticket, text) => {
    setSendingTicketId(ticket.id)
    try {
      const message = await sendSupportMessage(ticket.id, text)
      if (message) {
        setMyTickets((current) =>
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
    setError('')
    setSuccess('')

    if (!form.subject.trim()) {
      setError('Subiectul solicitării este obligatoriu.')
      return
    }
    if (!form.message.trim()) {
      setError('Mesajul solicitării este obligatoriu.')
      return
    }

    setLoading(true)
    try {
      const result = await submitSupportRequest({
        category: form.category,
        subject: form.subject,
        message: form.message,
      })
      setForm(INITIAL_FORM)
      setSuccess(
        result.autoreplyDelivered ? SUPPORT_SAVED_WITH_AUTOREPLY : SUPPORT_SAVED_WITHOUT_AUTOREPLY,
      )
      await loadMyTickets({ silent: true })
      if (result.id) setExpandedTicketId(result.id)
    } catch (submitError) {
      setError(toUserFacingError(submitError, USER_MESSAGES.supportSubmit))
    } finally {
      setLoading(false)
    }
  }

  const fieldLabelClass = "text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 ml-1 mb-2 block"
  const inputClass = "w-full rounded-xl border-2 border-border bg-slate-50 px-5 py-4 font-bold text-slate-900 focus:outline-none focus:border-primary transition-all dark:bg-white/5 dark:text-white"

  return (
    <div className="min-h-screen text-slate-900 dark:text-slate-50 bg-slate-50 dark:bg-slate-950 transition-colors duration-500">
      <Navbar />

      <main className="container relative z-0 max-w-3xl py-16 px-4">
        <div className="absolute inset-0 scholar-grid opacity-[0.02] dark:opacity-[0.04] pointer-events-none" />

        <motion.button
          onClick={() => navigate('/dashboard')}
          className="mb-10 inline-flex items-center gap-3 text-xs font-black uppercase tracking-widest text-slate-400 hover:text-primary transition-colors"
          whileHover={{ x: -4 }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          <ArrowLeft className="size-4" />
          Înapoi la Dashboard
        </motion.button>

        <motion.section 
          className="relative bg-white dark:bg-slate-900 rounded-[2.5rem] border-2 border-border shadow-2xl p-10 md:p-16 overflow-hidden"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
        >
          {/* Decorative Seal */}
          <div className="absolute -top-12 -right-12 size-48 bg-primary/5 rounded-full border-2 border-dashed border-primary/10 flex items-center justify-center p-12 opacity-40">
             <MessageCircle className="size-full text-primary/20" />
          </div>

          <header className="relative z-10 pb-12 border-b-2 border-border mb-12">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded bg-primary/5 border border-primary/20 text-primary text-[9px] font-black uppercase tracking-widest mb-4">
               Registry / Help Center
            </div>
            <h1 className="text-4xl font-black uppercase tracking-tighter leading-tight">
              Contact Academic
            </h1>
            <p className="mt-4 text-sm font-medium leading-relaxed text-slate-500 dark:text-slate-400 max-w-lg">
              Utilizează acest canal formal pentru asistență tehnică, întrebări despre curriculum sau probleme de facturare.
            </p>
          </header>

          <form onSubmit={handleSubmit} className="relative z-10 space-y-10">
            <AlertMessage type="success" message={success} />
            <AlertMessage message={error} />

            <div className="grid gap-8 sm:grid-cols-2">
              <div className="space-y-2">
                <label className={fieldLabelClass}>Identitate</label>
                <div className="w-full bg-slate-100/50 dark:bg-white/2 border-2 border-border rounded-xl px-5 py-4 font-bold text-slate-400 dark:text-slate-500 cursor-not-allowed text-sm">
                  {userName}
                </div>
              </div>
              <div className="space-y-2">
                <label className={fieldLabelClass}>Contact Sincronizat</label>
                <div className="w-full bg-slate-100/50 dark:bg-white/2 border-2 border-border rounded-xl px-5 py-4 font-bold text-slate-400 dark:text-slate-500 cursor-not-allowed text-sm truncate">
                  {userEmail}
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <label htmlFor="support-category" className={fieldLabelClass}>Departament Vizat</label>
              <select
                id="support-category"
                className={`${inputClass} appearance-none cursor-pointer pr-10`}
                value={form.category}
                onChange={(event) => setForm((prev) => ({ ...prev, category: event.target.value }))}
                disabled={loading || Boolean(success)}
              >
                {CATEGORIES.map((item) => (
                  <option key={item.value} value={item.value} className="bg-white dark:bg-slate-900">{item.label}</option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <label htmlFor="support-subject" className={fieldLabelClass}>Subiect Solicitare</label>
              <input
                id="support-subject"
                type="text"
                maxLength={120}
                className={inputClass}
                value={form.subject}
                onChange={(event) => setForm((prev) => ({ ...prev, subject: event.target.value }))}
                placeholder={categoryExamples.subject}
                required
                disabled={loading || Boolean(success)}
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="support-message" className={fieldLabelClass}>Detaliere Solicitare</label>
              <textarea
                id="support-message"
                rows={6}
                maxLength={2000}
                className={`${inputClass} resize-none font-medium text-base h-48`}
                value={form.message}
                onChange={(event) => setForm((prev) => ({ ...prev, message: event.target.value }))}
                placeholder={categoryExamples.message}
                required
                disabled={loading || Boolean(success)}
              />
              <div className="flex justify-end pt-2">
                 <span className="text-[10px] font-black uppercase tracking-widest text-slate-300">Caractere: {form.message.length}/2000</span>
              </div>
            </div>

            <div className="pt-8 border-t-2 border-border flex flex-col sm:flex-row gap-4">
              <Button
                type="submit"
                className="flex-1 h-16 rounded-xl bg-primary text-white shadow-xl shadow-primary/20"
                disabled={loading || Boolean(success)}
              >
                {loading ? 'Transmisie în curs...' : 'Expediază Solicitarea'}
                {!loading && <Send className="size-4 ml-2" />}
              </Button>
              {success && (
                <Button
                  type="button"
                  variant="outline"
                  className="h-16 px-10 rounded-xl"
                  onClick={() => {
                    setSuccess('')
                    setForm(INITIAL_FORM)
                  }}
                >
                  Mesaj Nou
                </Button>
              )}
            </div>
          </form>
        </motion.section>

        <motion.section
          className="relative mt-10 rounded-[2.5rem] border-2 border-border bg-white p-8 shadow-2xl dark:bg-slate-900 md:p-12"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <header className="mb-8 flex flex-col gap-2 border-b-2 border-border pb-6">
            <div className="inline-flex w-fit items-center gap-2 rounded bg-primary/5 px-3 py-1 text-[9px] font-black uppercase tracking-widest text-primary">
              <MessageCircle className="size-3.5" />
              Conversațiile mele
            </div>
            <h2 className="text-2xl font-black uppercase tracking-tight text-slate-900 dark:text-white">
              Solicitările tale
            </h2>
            <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
              Urmărește răspunsurile echipei și continuă conversația direct aici.
            </p>
          </header>

          {ticketsError && <AlertMessage message={ticketsError} type="error" />}

          {ticketsLoading ? (
            <div className="flex min-h-[20vh] items-center justify-center">
              <div className="size-10 animate-spin rounded-full border-4 border-primary/10 border-t-primary" />
            </div>
          ) : myTickets.length === 0 ? (
            <p className="py-10 text-center text-sm font-semibold text-slate-400">
              Nu ai solicitări încă. Trimite un mesaj folosind formularul de mai sus.
            </p>
          ) : (
            <div className="space-y-4">
              {myTickets.map((ticket) => {
                const expanded = expandedTicketId === ticket.id
                const categoryLabel = SUPPORT_CATEGORY_LABELS[ticket.category] ?? ticket.category
                const statusLabel = SUPPORT_STATUS_LABELS[ticket.status] ?? ticket.status
                const closed = ticket.status === 'closed'

                return (
                  <article
                    key={ticket.id}
                    className="overflow-hidden rounded-[1.5rem] border-2 border-border bg-slate-50 dark:bg-white/5"
                  >
                    <button
                      type="button"
                      onClick={() => setExpandedTicketId(expanded ? null : ticket.id)}
                      className="flex w-full items-start gap-4 p-5 text-left transition-colors hover:bg-white dark:hover:bg-slate-800/40"
                    >
                      <div className="min-w-0 flex-1 space-y-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className={`rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-widest ${statusBadgeClass(ticket.status)}`}>
                            {statusLabel}
                          </span>
                          <span className="rounded-full bg-white px-2.5 py-1 text-[10px] font-black uppercase tracking-widest text-slate-600 ring-1 ring-border dark:bg-slate-900 dark:text-slate-300">
                            {categoryLabel}
                          </span>
                          <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                            {formatTicketDate(ticket.created_at)}
                          </span>
                        </div>
                        <h3 className="truncate text-base font-black tracking-tight text-slate-900 dark:text-white">
                          {ticket.subject}
                        </h3>
                      </div>
                      {expanded ? (
                        <ChevronUp className="mt-1 size-5 shrink-0 text-slate-400" />
                      ) : (
                        <ChevronDown className="mt-1 size-5 shrink-0 text-slate-400" />
                      )}
                    </button>

                    {expanded && (
                      <div className="border-t-2 border-border px-5 py-5">
                        <SupportChatPanel
                          messages={buildTicketThread(ticket)}
                          selfRole="user"
                          peerLabel="Echipă MathUP"
                          onSend={(text) => handleSendMessage(ticket, text)}
                          sending={sendingTicketId === ticket.id}
                          closed={closed}
                        />
                      </div>
                    )}
                  </article>
                )
              })}
            </div>
          )}
        </motion.section>
      </main>

      <footer className="container py-24 text-center opacity-40">
        <div className="flex flex-col items-center gap-4 grayscale hover:grayscale-0 transition-all duration-700">
          <BrandLogo className="size-10" />
          <div className="space-y-1">
            <span className="block text-xs font-black uppercase tracking-[0.6em] text-slate-900 dark:text-white">
              MathUP Scholarly Support
            </span>
            <span className="block text-[10px] font-bold text-primary uppercase tracking-[0.2em]">
              Academic Registry & Helpdesk
            </span>
          </div>
        </div>
      </footer>
    </div>
  )
}
