import { TICKET_STATUS_LABELS } from '../constants'



function formatDate(iso) {

  try {

    const d = new Date(iso)

    const now = new Date()

    const isToday =

      d.getDate() === now.getDate() &&

      d.getMonth() === now.getMonth() &&

      d.getFullYear() === now.getFullYear()



    if (isToday) {

      return d.toLocaleTimeString('ro-RO', { hour: '2-digit', minute: '2-digit' })

    }

    return d.toLocaleDateString('ro-RO', { day: '2-digit', month: 'short' })

  } catch {

    return ''

  }

}



function ticketInitial(subject) {

  const s = (subject || '?').trim()

  return s.charAt(0).toUpperCase() || '?'

}



export function SupportTicketList({
  tickets,
  selectedId,
  onSelect,
  unreadByTicket = {},
  showRequester = false,
  emptyLabel,
}) {

  if (!tickets.length) {

    return (

      <p className="px-3 py-8 text-center text-xs text-muted-foreground">

        {emptyLabel ?? 'Nu ai solicitări încă. Deschide una nouă.'}

      </p>

    )

  }



  return (

    <ul className="divide-y divide-border overflow-y-auto">

      {tickets.map((ticket) => {

        const unread = unreadByTicket[ticket.id] ?? 0

        const active = ticket.id === selectedId

        return (

          <li key={ticket.id}>

            <button

              type="button"

              onClick={() => onSelect(ticket)}

              className={`support-chat-list-item ${

                active ? 'support-chat-list-item--active' : ''

              }`}

            >

              <span className="support-chat-avatar" aria-hidden>

                {ticketInitial(ticket.subject)}

              </span>

              <span className="min-w-0 flex-1">

                <span className="flex items-baseline justify-between gap-2">

                  <span

                    className={`line-clamp-1 text-sm leading-tight ${

                      unread > 0

                        ? 'font-semibold text-foreground'

                        : 'font-medium text-foreground'

                    }`}

                  >

                    {ticket.subject}

                  </span>

                  <span className="shrink-0 text-[10px] text-muted-foreground">

                    {formatDate(ticket.created_at)}

                  </span>

                </span>

                <span className="mt-0.5 flex items-center justify-between gap-2">

                  <span className="line-clamp-1 text-xs text-muted-foreground">

                    {showRequester && ticket.user_email
                      ? `${ticket.user_email} · ${TICKET_STATUS_LABELS[ticket.status] ?? ticket.status}`
                      : TICKET_STATUS_LABELS[ticket.status] ?? ticket.status}

                  </span>

                  {unread > 0 && (

                    <span className="support-chat-unread support-chat-launcher-badge">

                      {unread > 9 ? '9+' : unread}

                    </span>

                  )}

                </span>

              </span>

            </button>

          </li>

        )

      })}

    </ul>

  )

}


