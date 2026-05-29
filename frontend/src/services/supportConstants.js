/**
 * Constante și ajutoare partajate pentru sistemul de suport (formular elev,
 * chat și panoul admin). Etichetele sunt singura sursă de adevăr pentru
 * afișarea categoriilor și a statusurilor.
 */

export const SUPPORT_TICKET_STATUSES = ['open', 'in_progress', 'closed']

export const SUPPORT_CATEGORY_LABELS = {
  billing: 'Facturare',
  technical: 'Problemă tehnică',
  content: 'Conținut lecții',
  other: 'Altele',
}

export const SUPPORT_STATUS_LABELS = {
  open: 'Deschis',
  in_progress: 'În lucru',
  closed: 'Închis',
}

/** Formatare prietenoasă, în limba română, a unei date ISO din tichete/mesaje. */
export function formatTicketDate(value) {
  if (!value) return '—'
  return new Date(value).toLocaleString('ro-RO', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function byCreatedAtAsc(a, b) {
  return new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
}

/**
 * Returnează firul de mesaje al unui tichet, ordonat cronologic. Pentru
 * tichetele create înainte de chat (sau dacă inserarea mesajului inițial a
 * eșuat) sintetizează primul mesaj din câmpul `message` al tichetului, astfel
 * încât interfața să aibă mereu cel puțin mesajul de pornire.
 */
export function buildTicketThread(ticket) {
  const rawMessages = Array.isArray(ticket?.support_request_messages)
    ? ticket.support_request_messages
    : []

  if (rawMessages.length === 0) {
    return [
      {
        id: `seed-${ticket?.id}`,
        author_role: 'user',
        body: ticket?.message ?? '',
        created_at: ticket?.created_at ?? null,
      },
    ]
  }

  return [...rawMessages].sort(byCreatedAtAsc)
}
