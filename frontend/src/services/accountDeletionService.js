/**
 * Serviciu pentru ștergerea contului în doi pași: solicitarea unui cod de
 * confirmare trimis pe email și confirmarea efectivă a ștergerii.
 * Folosește edge functions Supabase, cu un fallback pe fetch direct atunci
 * când invocarea prin SDK eșuează din motive de rețea.
 */
import { supabase } from '../supabaseClient'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

const ERR_UNAUTHENTICATED = 'Trebuie să fii autentificat pentru a efectua această acțiune.'
const ERR_GENERIC_REQUEST = 'Nu am putut trimite codul de confirmare. Încearcă din nou.'
const ERR_GENERIC_CONFIRM = 'Nu am putut șterge contul. Încearcă din nou sau contactează suportul.'

const PENDING_DELETION_KEY = 'mathup.account_deletion_pending'
// Codul de confirmare e valabil 15 minute; după acest interval starea „în așteptare”
// din sessionStorage e considerată expirată și ignorată.
const DELETION_SESSION_MS = 15 * 60 * 1000

function readPendingDeletionRaw() {
  try {
    const raw = sessionStorage.getItem(PENDING_DELETION_KEY)
    if (!raw) return null
    return JSON.parse(raw)
  } catch {
    return null
  }
}

/**
 * Reconstituie starea „ștergere în curs” după ce utilizatorul a părăsit pagina
 * (de exemplu, ca să citească emailul cu codul) și apoi a revenit.
 *
 * @param {string} userId - ID-ul utilizatorului curent; folosit pentru a evita
 *   preluarea unei sesiuni rămase de la alt cont logat anterior.
 * @returns {{ step: 'awaiting_code', code: string } | null}
 */
export function readPendingAccountDeletionSession(userId) {
  if (!userId) return null
  const data = readPendingDeletionRaw()
  if (!data || data.userId !== userId || data.step !== 'awaiting_code') return null
  if (typeof data.expiresAt === 'number' && Date.now() > data.expiresAt) {
    sessionStorage.removeItem(PENDING_DELETION_KEY)
    return null
  }
  return {
    step: 'awaiting_code',
    code: typeof data.code === 'string' ? data.code : '',
  }
}

export function savePendingAccountDeletionSession(userId, { code = '' } = {}) {
  if (!userId) return
  sessionStorage.setItem(
    PENDING_DELETION_KEY,
    JSON.stringify({
      userId,
      step: 'awaiting_code',
      code,
      expiresAt: Date.now() + DELETION_SESSION_MS,
    }),
  )
}

export function clearPendingAccountDeletionSession() {
  sessionStorage.removeItem(PENDING_DELETION_KEY)
}

async function getAccessToken() {
  const { data: { session }, error } = await supabase.auth.getSession()
  if (error) throw error
  if (!session?.access_token) throw new Error(ERR_UNAUTHENTICATED)
  return session.access_token
}

// Traduce erorile returnate de edge function în mesaje prietenoase pentru
// utilizator, pe baza codului HTTP (429 = prea multe cereri, 401 = nelogat etc.).
function mapInvokeError(error, data, fallback) {
  const status = error?.context?.status
  if (status === 429) {
    return new Error(
      data?.error ?? 'Ai solicitat prea multe coduri. Încearcă din nou peste o oră.',
    )
  }
  if (status === 401) return new Error(ERR_UNAUTHENTICATED)
  if ((status === 400 || status === 404) && data?.error) return new Error(data.error)
  return new Error(fallback)
}

// Apel HTTP direct către edge function, folosit ca rezervă atunci când
// `supabase.functions.invoke` eșuează din cauza unei probleme de rețea/CORS.
async function invokeFallback(fnName, accessToken, body, fallbackMessage) {
  if (!supabaseUrl || !supabaseAnonKey) throw new Error(fallbackMessage)

  const response = await fetch(`${supabaseUrl}/functions/v1/${fnName}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      apikey: supabaseAnonKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  })

  const payload = await response.json().catch(() => null)

  if (!response.ok) {
    if (response.status === 429) {
      throw new Error(payload?.error ?? 'Ai solicitat prea multe coduri. Încearcă din nou peste o oră.')
    }
    if (response.status === 401) throw new Error(ERR_UNAUTHENTICATED)
    if (response.status === 400 && payload?.error) throw new Error(payload.error)
    throw new Error(fallbackMessage)
  }

  return payload
}

/**
 * Solicită trimiterea pe email a unui cod de confirmare din 6 cifre necesar
 * pentru ștergerea contului.
 */
export async function requestAccountDeletion() {
  const accessToken = await getAccessToken()

  const { data, error } = await supabase.functions.invoke('request-account-deletion', {
    body: {},
    headers: { Authorization: `Bearer ${accessToken}` },
  })

  if (!error) return data

  // Diferențiem erorile de rețea (caz în care reîncercăm prin fetch direct) de
  // erorile de business returnate de funcție (pe care le propagăm ca atare).
  const isNetworkError =
    error?.message?.includes('Failed to send a request to the Edge Function') ||
    error?.message?.includes('Failed to fetch') ||
    error?.message?.includes('NetworkError') ||
    error?.context?.status === 404

  if (isNetworkError) {
    return invokeFallback('request-account-deletion', accessToken, {}, ERR_GENERIC_REQUEST)
  }

  throw mapInvokeError(error, data, ERR_GENERIC_REQUEST)
}

/**
 * Confirmă ștergerea contului folosind codul din 6 cifre primit pe email.
 * La succes, apelantul este responsabil să facă logout și redirect.
 *
 * @param {string} code - Codul de confirmare introdus de utilizator.
 */
export async function confirmAccountDeletion(code) {
  if (!code || typeof code !== 'string' || !code.trim()) {
    throw new Error('Introdu codul primit pe email.')
  }

  const accessToken = await getAccessToken()

  const { data, error } = await supabase.functions.invoke('confirm-account-deletion', {
    body: { code: code.trim() },
    headers: { Authorization: `Bearer ${accessToken}` },
  })

  if (!error) return data

  const isNetworkError =
    error?.message?.includes('Failed to send a request to the Edge Function') ||
    error?.message?.includes('Failed to fetch') ||
    error?.message?.includes('NetworkError') ||
    error?.context?.status === 404

  if (isNetworkError) {
    return invokeFallback('confirm-account-deletion', accessToken, { code: code.trim() }, ERR_GENERIC_CONFIRM)
  }

  throw mapInvokeError(error, data, ERR_GENERIC_CONFIRM)
}
