import { useCallback, useEffect, useState } from 'react'

import { Link } from 'react-router-dom'

import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'

import { ArrowLeft, Headphones, Plus, X } from 'lucide-react'

import { useAuth } from '../../../app/providers/AuthProvider'

import { useNotifications } from '../../../app/providers/NotificationProvider'

import { listMyTickets } from '../../../services/supportTicketService'

import { SupportWidgetLauncher } from './SupportWidgetLauncher'

import { SupportTicketList } from './SupportTicketList'

import { SupportTicketThread } from './SupportTicketThread'

import { SupportNewTicketForm } from './SupportNewTicketForm'

import { supabase } from '../../../supabaseClient'

import { TICKET_STATUS_LABELS } from '../constants'



const VIEW_TITLES = {

  list: 'Suport MathUP',

  new: 'Solicitare nouă',

  thread: 'Conversație',

}



export function SupportWidget() {

  const { user } = useAuth()

  const reduceMotion = useReducedMotion()

  const { supportReplyUnreadCount, unreadByTicket, markTicketRead } = useNotifications()

  const [open, setOpen] = useState(false)

  const [view, setView] = useState('list')

  const [tickets, setTickets] = useState([])

  const [selectedTicket, setSelectedTicket] = useState(null)

  const [loadingTickets, setLoadingTickets] = useState(false)



  const loadTickets = useCallback(async () => {

    if (!user?.id) return

    setLoadingTickets(true)

    try {

      const rows = await listMyTickets()

      setTickets(rows)

    } catch (err) {

      console.warn('[support] list tickets failed', err)

    } finally {

      setLoadingTickets(false)

    }

  }, [user?.id])



  useEffect(() => {

    if (open && user?.id) {

      loadTickets()

    }

  }, [open, user?.id, loadTickets])



  useEffect(() => {

    if (!user?.id || !open) return undefined



    const channel = supabase

      .channel(`support-user-tickets:${user.id}`)

      .on(

        'postgres_changes',

        {

          event: 'INSERT',

          schema: 'public',

          table: 'support_requests',

          filter: `user_id=eq.${user.id}`,

        },

        (payload) => {

          if (payload.new) {

            setTickets((prev) => {

              if (prev.some((t) => t.id === payload.new.id)) return prev

              return [payload.new, ...prev]

            })

          }

        },

      )

      .on(

        'postgres_changes',

        {

          event: 'UPDATE',

          schema: 'public',

          table: 'support_requests',

          filter: `user_id=eq.${user.id}`,

        },

        (payload) => {

          if (payload.new) {

            setTickets((prev) =>

              prev.map((t) => (t.id === payload.new.id ? { ...t, ...payload.new } : t)),

            )

            setSelectedTicket((prev) =>

              prev?.id === payload.new.id ? { ...prev, ...payload.new } : prev,

            )

          }

        },

      )

      .subscribe()



    return () => {

      supabase.removeChannel(channel)

    }

  }, [user?.id, open])



  const handleTicketCreated = (ticket) => {

    if (ticket?.id) {

      setTickets((prev) => [ticket, ...prev.filter((t) => t.id !== ticket.id)])

      setSelectedTicket(ticket)

      setView('thread')

    } else {

      loadTickets()

      setView('list')

    }

  }



  const handleSelectTicket = (ticket) => {

    setSelectedTicket(ticket)

    setView('thread')

    markTicketRead(ticket.id)

  }



  const handleTicketRead = useCallback(

    (ticketId) => {

      markTicketRead(ticketId)

    },

    [markTicketRead],

  )



  const panelMotion = reduceMotion

    ? { initial: false, animate: { opacity: 1 }, exit: { opacity: 0 } }

    : {

        initial: { opacity: 0, y: 12, scale: 0.98 },

        animate: { opacity: 1, y: 0, scale: 1 },

        exit: { opacity: 0, y: 10, scale: 0.98 },

        transition: { duration: 0.22, ease: [0.22, 1, 0.36, 1] },

      }



  const threadStatus =

    selectedTicket &&

    (TICKET_STATUS_LABELS[selectedTicket.status] ?? selectedTicket.status)



  return (

    <>

      <SupportWidgetLauncher

        open={open}

        unreadCount={supportReplyUnreadCount}

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

            <header className="support-chat-header shrink-0">

              <div className="flex min-w-0 flex-1 items-center gap-2">

                {view !== 'list' && user && (

                  <button

                    type="button"

                    onClick={() => {

                      setView('list')

                      setSelectedTicket(null)

                    }}

                    className="support-chat-icon-btn shrink-0"

                    aria-label="Înapoi la listă"

                  >

                    <ArrowLeft className="size-4" />

                  </button>

                )}

                {view === 'list' && (

                  <span

                    className="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary"

                    aria-hidden

                  >

                    <Headphones className="size-3.5" />

                  </span>

                )}

                <div className="min-w-0 flex-1">

                  <h2 className="support-chat-header-title truncate">

                    {view === 'thread' && selectedTicket

                      ? selectedTicket.subject

                      : VIEW_TITLES[view]}

                  </h2>

                  {view === 'thread' && selectedTicket && (

                    <p className="support-chat-header-sub truncate">{threadStatus}</p>

                  )}

                  {view === 'list' && user && (

                    <p className="support-chat-header-sub">Răspundem în cel mai scurt timp</p>

                  )}

                </div>

              </div>

              <button

                type="button"

                onClick={() => setOpen(false)}

                className="support-chat-icon-btn shrink-0"

                aria-label="Închide"

              >

                <X className="size-4" />

              </button>

            </header>



            {!user ? (

              <div className="flex flex-1 flex-col items-center justify-center gap-3 p-5 text-center">

                <p className="text-xs leading-relaxed text-muted-foreground">

                  Autentifică-te pentru a trimite o solicitare către echipa noastră.

                </p>

                <Link

                  to="/login"

                  onClick={() => setOpen(false)}

                  className="rounded-full bg-primary px-5 py-2 text-xs font-semibold text-primary-foreground shadow-md shadow-primary/20 transition-transform hover:scale-[1.02] active:scale-[0.98]"

                >

                  Autentificare

                </Link>

              </div>

            ) : (

              <div className="flex min-h-0 flex-1 flex-col">

                {view === 'list' && (

                  <>

                    <div className="flex shrink-0 items-center justify-between border-b border-border px-3 py-1.5">

                      <span className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">

                        Solicitările tale

                      </span>

                      <button

                        type="button"

                        onClick={() => setView('new')}

                        className="inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-semibold text-primary transition-colors hover:bg-primary/10"

                      >

                        <Plus className="size-3.5" />

                        Nou

                      </button>

                    </div>

                    {loadingTickets ? (

                      <p className="py-8 text-center text-xs text-muted-foreground">

                        Se încarcă…

                      </p>

                    ) : (

                      <SupportTicketList

                        tickets={tickets}

                        selectedId={selectedTicket?.id}

                        onSelect={handleSelectTicket}

                        unreadByTicket={unreadByTicket}

                      />

                    )}

                  </>

                )}



                {view === 'new' && (

                  <SupportNewTicketForm onCreated={handleTicketCreated} />

                )}



                {view === 'thread' && selectedTicket && (

                  <SupportTicketThread

                    ticket={selectedTicket}

                    mode="user"

                    compactHeader

                    onTicketRead={handleTicketRead}

                  />

                )}

              </div>

            )}

          </motion.div>

        )}

      </AnimatePresence>

    </>

  )

}


