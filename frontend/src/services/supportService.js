/**
 * Trimiterea solicitărilor de suport de către utilizatori. Apelează o edge
 * function (care salvează tichetul și trimite emailurile), cu fallback pe fetch
 * direct la erori de rețea. Intrările sunt validate și trunchiate înainte de trimitere.
 */
import { supabase } from '../supabaseClient'
import { USER_MESSAGES } from '../shared/utils/userFacingError'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY
const SUPPORT_UNAVAILABLE = USER_MESSAGES.supportSubmit

function logSupportError(context, error) {
  if (import.meta.env.DEV) {
    console.error(`[support:${context}]`, error)
  }
}

function parseSupportPayload(payload) {
  if (!payload || typeof payload !== 'object' || !payload.id) {
    throw new Error(SUPPORT_UNAVAILABLE)
  }
  if (payload.error) {
    const message = typeof payload.error === 'string' ? payload.error : SUPPORT_UNAVAILABLE
    throw new Error(message)
  }
  return {
    id: payload.id,
    emailDelivered: payload.email_delivered === true,
    autoreplyDelivered: payload.autoreply_delivered === true,
  }
}

async function invokeSubmitSupportRequest(accessToken, body) {
  const { data, error } = await supabase.functions.invoke('submit-support-request', {
    body,
    headers: { Authorization: `Bearer ${accessToken}` },
  })

  if (!error) return parseSupportPayload(data)

  const message = error.message || ''
  const contextStatus = error?.context?.status

  if (contextStatus === 429) {
    throw new Error('Ai trimis prea multe mesaje. Încearcă din nou peste o oră.')
  }

  if (contextStatus === 400 && data?.error) {
    throw new Error(data.error)
  }

  if (contextStatus === 404) {
    logSupportError('not-deployed', error)
    throw new Error(SUPPORT_UNAVAILABLE)
  }

  // Doar erorile de transport justifică reîncercarea prin fetch direct; erorile
  // de business (rate limit, validare) au fost deja tratate mai sus.
  const shouldRetryWithFetch =
    message.includes('Failed to send a request to the Edge Function') ||
    message.includes('Failed to fetch') ||
    message.includes('NetworkError')

  if (!shouldRetryWithFetch || !supabaseUrl || !supabaseAnonKey) {
    logSupportError('invoke', error)
    throw new Error(SUPPORT_UNAVAILABLE)
  }

  const response = await fetch(`${supabaseUrl}/functions/v1/submit-support-request`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      apikey: supabaseAnonKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  })

  const payload = await response.json().catch(() => null)
  if (response.status === 429) {
    throw new Error('Ai trimis prea multe mesaje. Încearcă din nou peste o oră.')
  }
  if (response.status === 400 && payload?.error) {
    throw new Error(payload.error)
  }
  if (!response.ok) {
    logSupportError('fetch', { status: response.status, payload })
    throw new Error(SUPPORT_UNAVAILABLE)
  }

  return parseSupportPayload(payload)
}

const SUPPORT_CATEGORIES = new Set(['billing', 'technical', 'content', 'other'])

/**
 * Validează și trimite o solicitare de suport pentru utilizatorul autentificat.
 * Subiectul și mesajul sunt trunchiate defensiv (120 / 2000 de caractere).
 */
export async function submitSupportRequest({ category, subject, message }) {
  const { data: { session }, error: sessionError } = await supabase.auth.getSession()
  if (sessionError) throw sessionError
  if (!session?.access_token) {
    throw new Error('Trebuie să fii autentificat pentru a contacta suportul.')
  }

  const safeCategory = String(category || '').trim()
  const safeSubject = String(subject || '').trim().slice(0, 120)
  const safeMessage = String(message || '').trim().slice(0, 2000)

  if (!SUPPORT_CATEGORIES.has(safeCategory)) {
    throw new Error('Categoria selectată nu este validă.')
  }
  if (!safeSubject || !safeMessage) {
    throw new Error('Completează subiectul și mesajul.')
  }

  return invokeSubmitSupportRequest(session.access_token, {
    category: safeCategory,
    subject: safeSubject,
    message: safeMessage,
  })
}

export const SUPPORT_SAVED_WITH_AUTOREPLY =
  'Solicitare înregistrată. Ți-am trimis un email de confirmare pe adresa contului. Un consultant academic va analiza mesajul în cel mult 48 de ore.'

export const SUPPORT_SAVED_WITHOUT_AUTOREPLY =
  'Solicitare înregistrată. Un consultant academic va analiza mesajul în cel mult 48 de ore.'

const MESSAGE_SELECT =
  'id, category, subject, message, status, created_at, assigned_admin_id, assigned_at, ' +
  'support_request_messages(id, author_role, author_user_id, body, created_at)'

/**
 * Listează tichetele utilizatorului curent împreună cu firul de conversație.
 * Politicile RLS limitează automat rezultatul la tichetele proprii.
 */
export async function getMySupportTickets() {
  const { data, error } = await supabase
    .from('support_requests')
    .select(MESSAGE_SELECT)
    .order('created_at', { ascending: false })

  if (error) throw error
  return data ?? []
}

/**
 * Trimite un mesaj în chatul unui tichet prin edge function. Funcția decide
 * rolul (elev vs admin asignat) pe baza identității și a tichetului, deci
 * același apel deservește ambele părți ale conversației.
 */
export async function sendSupportMessage(ticketId, body) {
  const text = String(body || '').trim().slice(0, 2000)
  if (!text) {
    throw new Error('Mesajul nu poate fi gol.')
  }

  const { data: { session }, error: sessionError } = await supabase.auth.getSession()
  if (sessionError) throw sessionError
  if (!session?.access_token) {
    throw new Error('Trebuie să fii autentificat pentru a trimite un mesaj.')
  }

  const { data, error } = await supabase.functions.invoke('send-support-message', {
    body: { ticket_id: ticketId, body: text },
    headers: { Authorization: `Bearer ${session.access_token}` },
  })

  if (error) {
    let serverMessage = ''
    try {
      const context = error.context
      if (context && typeof context.json === 'function') {
        const payload = await context.json()
        serverMessage = typeof payload?.error === 'string' ? payload.error : ''
      }
    } catch (parseError) {
      logSupportError('send-message-parse', parseError)
    }
    throw new Error(serverMessage || USER_MESSAGES.save)
  }

  return data?.message ?? null
}
