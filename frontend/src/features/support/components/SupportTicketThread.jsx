import { useCallback, useEffect, useRef, useState } from 'react'

import { Loader2, Send } from 'lucide-react'

import { useReducedMotion } from 'framer-motion'

import { useAuth } from '../../../app/providers/AuthProvider'

import { AlertMessage } from '../../../shared/ui/AlertMessage'

import { toUserFacingError } from '../../../shared/utils/userFacingError'

import {

  createOptimisticMessage,

  fetchTicketMessages,

  mergeMessagesById,

  sendAdminMessage,

  sendUserMessage,

} from '../../../services/supportTicketService'

import { useSupportRealtime } from '../hooks/useSupportRealtime'

import { MIN_MESSAGE_LENGTH, MAX_MESSAGE_LENGTH, TICKET_STATUS_LABELS } from '../constants'



function formatTime(iso) {

  try {

    return new Date(iso).toLocaleString('ro-RO', {

      hour: '2-digit',

      minute: '2-digit',

    })

  } catch {

    return ''

  }

}



function formatDay(iso) {

  try {

    return new Date(iso).toLocaleDateString('ro-RO', {

      day: 'numeric',

      month: 'short',

    })

  } catch {

    return ''

  }

}



function shouldShowDaySeparator(messages, index) {

  if (index === 0) return true

  const prev = messages[index - 1]?.created_at

  const curr = messages[index]?.created_at

  if (!prev || !curr) return false

  return formatDay(prev) !== formatDay(curr)

}



export function SupportTicketThread({

  ticket,

  mode = 'user',

  canReply = true,

  onTicketRead,

  compactHeader = false,

}) {

  const { user } = useAuth()

  const reduceMotion = useReducedMotion()

  const [messages, setMessages] = useState([])

  const [draft, setDraft] = useState('')

  const [loading, setLoading] = useState(true)

  const [sending, setSending] = useState(false)

  const [error, setError] = useState('')

  const bottomRef = useRef(null)

  const inputRef = useRef(null)

  const isClosed = ticket?.status === 'closed'



  const loadMessages = useCallback(async () => {

    if (!ticket?.id) return

    setLoading(true)

    setError('')

    try {

      const rows = await fetchTicketMessages(ticket.id)

      setMessages(rows)

      onTicketRead?.(ticket.id)

    } catch (err) {

      setError(toUserFacingError(err))

    } finally {

      setLoading(false)

    }

  }, [ticket?.id, onTicketRead])



  useEffect(() => {

    loadMessages()

  }, [loadMessages])



  useSupportRealtime(ticket?.id, Boolean(ticket?.id), setMessages)



  useEffect(() => {

    bottomRef.current?.scrollIntoView({

      behavior: reduceMotion ? 'auto' : 'smooth',

    })

  }, [messages.length, reduceMotion])



  const handleSend = async (event) => {

    event.preventDefault()

    const text = draft.trim()

    if (!text || text.length < MIN_MESSAGE_LENGTH || sending || isClosed || !canReply) return



    setSending(true)

    setError('')

    const authorRole = mode === 'admin' ? 'admin' : 'user'

    const optimistic = createOptimisticMessage({

      ticketId: ticket.id,

      userId: user?.id,

      authorRole,

      body: text,

    })

    setMessages((prev) => mergeMessagesById(prev, optimistic))

    setDraft('')



    try {

      const saved =

        mode === 'admin'

          ? await sendAdminMessage(ticket.id, text)

          : await sendUserMessage(ticket.id, text)

      setMessages((prev) => {

        const withoutPending = prev.filter((m) => m.id !== optimistic.id)

        return mergeMessagesById(withoutPending, saved)

      })

    } catch (err) {

      setMessages((prev) => prev.filter((m) => m.id !== optimistic.id))

      setDraft(text)

      setError(toUserFacingError(err))

    } finally {

      setSending(false)

      inputRef.current?.focus()

    }

  }



  const handleInputKeyDown = (event) => {

    if (event.key === 'Enter' && !event.shiftKey) {

      event.preventDefault()

      handleSend(event)

    }

  }



  const statusLabel = TICKET_STATUS_LABELS[ticket?.status] ?? ticket?.status



  return (

    <div className="flex h-full min-h-0 flex-col">

      {!compactHeader && (

        <div className="support-chat-header shrink-0">

          <div className="min-w-0 flex-1">

            <p className="support-chat-header-title line-clamp-1">{ticket.subject}</p>

            <p className="support-chat-header-sub">

              {isClosed ? 'Închis' : statusLabel}

              {mode === 'admin' && ticket.user_email ? ` · ${ticket.user_email}` : ''}

            </p>

          </div>

        </div>

      )}



      <div className="support-chat-thread-bg">

        {loading && (

          <div className="flex justify-center py-6">

            <Loader2 className="size-5 animate-spin text-primary" aria-hidden />

          </div>

        )}

        {!loading && messages.length === 0 && (

          <p className="py-6 text-center text-xs text-muted-foreground">

            Niciun mesaj încă. Scrie primul mesaj mai jos.

          </p>

        )}

        {!loading && messages.map((msg, index) => {

          const isMine =

            mode === 'user'

              ? msg.author_role === 'user'

              : msg.author_role === 'admin'

          const isPending = String(msg.id).startsWith('pending-')

          const showDay = shouldShowDaySeparator(messages, index)



          return (

            <div key={msg.id}>

              {showDay && (

                <p className="my-2 text-center text-[10px] font-medium uppercase tracking-wide text-muted-foreground">

                  {formatDay(msg.created_at)}

                </p>

              )}

              <div

                className={`support-chat-msg mb-1.5 flex ${isMine ? 'justify-end' : 'justify-start'}`}

              >

                <div

                  className={`support-chat-bubble ${

                    isMine ? 'support-chat-bubble--mine' : 'support-chat-bubble--theirs'

                  } ${isPending ? 'opacity-70' : ''}`}

                >

                  <p>{msg.body}</p>

                  <p className="support-chat-bubble-meta">

                    {isPending ? 'Se trimite…' : formatTime(msg.created_at)}

                  </p>

                </div>

              </div>

            </div>

          )

        })}

        <div ref={bottomRef} className="h-px shrink-0" aria-hidden />

      </div>



      {error && (

        <div className="shrink-0 px-2 pb-1">

          <AlertMessage message={error} variant="error" />

        </div>

      )}



      {!isClosed && canReply && (

        <form onSubmit={handleSend} className="support-chat-compose shrink-0">

          <textarea

            ref={inputRef}

            value={draft}

            onChange={(e) => setDraft(e.target.value)}

            onKeyDown={handleInputKeyDown}

            placeholder="Mesaj…"

            rows={1}

            maxLength={MAX_MESSAGE_LENGTH}

            className="support-chat-input"

            aria-label="Mesaj"

          />

          <button

            type="submit"

            disabled={sending || draft.trim().length < MIN_MESSAGE_LENGTH}

            className="support-chat-send"

            aria-label="Trimite mesajul"

          >

            {sending ? (

              <Loader2 className="size-4 animate-spin" aria-hidden />

            ) : (

              <Send className="size-4" aria-hidden />

            )}

          </button>

        </form>

      )}



      {isClosed && (

        <p className="shrink-0 border-t border-border px-3 py-2 text-center text-xs text-muted-foreground">

          Conversația este închisă.

        </p>

      )}

    </div>

  )

}


