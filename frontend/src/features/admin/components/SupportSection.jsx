import { useCallback, useEffect, useMemo, useState } from 'react'

import { Loader2 } from 'lucide-react'

import { useAuth } from '../../../app/providers/AuthProvider'

import { useNotifications } from '../../../app/providers/NotificationProvider'

import { Button } from '../../../shared/ui/Button'

import { AlertMessage } from '../../../shared/ui/AlertMessage'

import { toUserFacingError } from '../../../shared/utils/userFacingError'

import {

  claimTicket,

  closeTicket,

  listAllTicketsForAdmin,

} from '../../../services/supportTicketService'

import { SupportTicketThread } from '../../support/components/SupportTicketThread'

import { TICKET_STATUS_LABELS } from '../../support/constants'

import { useSupportInboxRealtime } from '../../support/hooks/useSupportInboxRealtime'



const FILTERS = [

  { id: 'all', label: 'Toate' },

  { id: 'open', label: 'Deschise' },

  { id: 'in_progress', label: 'În lucru' },

  { id: 'closed', label: 'Închise' },

]



function formatDate(iso) {

  try {

    return new Date(iso).toLocaleString('ro-RO', {

      day: '2-digit',

      month: 'short',

      hour: '2-digit',

      minute: '2-digit',

    })

  } catch {

    return ''

  }

}



function ticketInitial(subject) {

  const s = (subject || '?').trim()

  return s.charAt(0).toUpperCase() || '?'

}



export function SupportSection() {

  const { user } = useAuth()

  const { markTicketRead } = useNotifications()

  const [tickets, setTickets] = useState([])

  const [filter, setFilter] = useState('open')

  const [selected, setSelected] = useState(null)

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



  const isAssignedToMe = selected?.assigned_admin_id === user?.id

  const canReplyAsAdmin = isAssignedToMe && selected?.status !== 'closed'

  const canClaim =

    selected &&

    !selected.assigned_admin_id &&

    selected.status !== 'closed'



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



  const handleSelect = (ticket) => {

    setSelected(ticket)

    markTicketRead(ticket.id)

  }



  return (

    <div className="grid gap-4 lg:grid-cols-12 lg:gap-5">

      <aside className="lg:col-span-4">

        <div className="support-chat-panel overflow-hidden">

          <div className="flex flex-wrap gap-1.5 border-b border-border p-2">

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



          {loading ? (

            <div className="flex justify-center py-10">

              <Loader2 className="size-6 animate-spin text-primary" aria-hidden />

            </div>

          ) : (

            <ul className="max-h-[min(28rem,60vh)] divide-y divide-border overflow-y-auto">

              {filtered.length === 0 && (

                <li className="px-3 py-8 text-center text-xs text-muted-foreground">

                  Niciun ticket în această categorie.

                </li>

              )}

              {filtered.map((ticket) => (

                <li key={ticket.id}>

                  <button

                    type="button"

                    onClick={() => handleSelect(ticket)}

                    className={`support-chat-list-item ${

                      selected?.id === ticket.id ? 'support-chat-list-item--active' : ''

                    }`}

                  >

                    <span className="support-chat-avatar" aria-hidden>

                      {ticketInitial(ticket.subject)}

                    </span>

                    <span className="min-w-0 flex-1">

                      <span className="line-clamp-1 text-sm font-medium text-foreground">

                        {ticket.subject}

                      </span>

                      <span className="line-clamp-1 text-xs text-muted-foreground">

                        {ticket.user_email}

                      </span>

                      <span className="mt-0.5 text-[10px] text-muted-foreground">

                        {TICKET_STATUS_LABELS[ticket.status] ?? ticket.status}

                        {' · '}

                        {formatDate(ticket.created_at)}

                      </span>

                    </span>

                  </button>

                </li>

              ))}

            </ul>

          )}

        </div>

      </aside>



      <section className="lg:col-span-8">

        <div className="support-chat-panel flex h-[min(32rem,70vh)] flex-col">

          {!selected ? (

            <p className="flex flex-1 items-center justify-center text-xs text-muted-foreground">

              Selectează un ticket din listă.

            </p>

          ) : (

            <>

              <div className="support-chat-header shrink-0 flex-wrap">

                <div className="min-w-0 flex-1">

                  <p className="support-chat-header-title line-clamp-1">

                    {selected.user_name || selected.user_email}

                  </p>

                  <p className="support-chat-header-sub line-clamp-1">

                    {selected.user_email}

                    {' · '}

                    {TICKET_STATUS_LABELS[selected.status] ?? selected.status}

                  </p>

                </div>

                <div className="flex shrink-0 flex-wrap gap-1.5">

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

                  {isAssignedToMe && selected.status !== 'closed' && (

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

                </div>

              </div>



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

                  Ticket preluat de alt administrator. Poți citi conversația, dar nu poți răspunde.

                </p>

              )}

            </>

          )}

        </div>

      </section>

    </div>

  )

}


