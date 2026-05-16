/** Mesaje generice afișate utilizatorului — fără detalii tehnice. */
export const USER_MESSAGES = {
  generic: 'Ceva nu a mers bine. Încearcă din nou.',
  load: 'Nu am putut încărca datele. Încearcă din nou.',
  save: 'Nu am putut salva modificările. Încearcă din nou.',
  delete: 'Nu am putut șterge. Încearcă din nou.',
  upload: 'Nu am putut încărca fișierul. Încearcă din nou.',
  download: 'Nu am putut descărca fișierul.',
  authLogin: 'Email sau parolă incorectă.',
  authRegister: 'Nu am putut crea contul. Verifică datele și încearcă din nou.',
  authResetRequest: 'Nu am putut trimite emailul de resetare. Încearcă din nou.',
  authResetPassword: 'Nu am putut actualiza parola. Încearcă din nou sau solicită un link nou.',
  authSession: 'Sesiunea a expirat. Autentifică-te din nou.',
  checkout: 'Plata Premium nu este disponibilă momentan. Încearcă mai târziu.',
  cancelPremium: 'Nu am putut anula abonamentul Premium. Încearcă din nou.',
  config: 'Aplicația nu este configurată corect. Contactează suportul.',
}

const TECHNICAL_PATTERN =
  /supabase|stripe|edge function|postgres|relation |column |row-level|rls|jwt|\.env|pgrst|violates|duplicate key|failed to fetch|networkerror|checkout-session|stripe-webhook|cancel-premium|service_role|anon key|not found|42883|23505|scholar-bac|app_url|webhook|apikey|authorization header|unauthorized\.|method not allowed/i

/** Mesaje deliberate din aplicație (validări, permisiuni) — pot fi afișate. */
const SAFE_MESSAGE_PREFIXES = [
  'Doar administratorul principal',
  'Introdu o adresă',
  'Trebuie să fii autentificat',
  'Acces neautorizat',
  'Titlul',
  'Toate câmpurile',
  'Selectează un roadmap',
  'Poți încărca doar',
  'Fotografia',
  'Parolele nu coincid',
  'Parola trebuie',
  'Nu există un abonament Premium',
  'Abonamentul Premium se anulează',
  'Abonamentul este deja programat',
  'Această lecție necesită acces Premium',
  'Fișierul este prea mare',
  'Tipul de fișier',
  'Nu am putut porni plata Premium',
  'Nu am putut anula abonamentul Premium',
  'Nu am putut descărca',
  'Nu am putut încărca fotografia',
  'Descărcarea este permisă',
  'Fișierul nu are',
  'Răspunsul nu a putut',
  'Acest email este deja administrator',
  'Administratorul principal nu poate',
  'Trebuie să rămână cel puțin',
  'Lista Premium nu este disponibilă',
  'Verificarea emailului nu este disponibilă',
  'Nu am putut adăuga administratorul',
  'Aplicația nu este configurată',
  'Lista Premium nu este disponibilă momentan',
  'Verificarea emailului nu este disponibilă momentan',
  'Dacă există un cont',
]

function looksTechnical(message) {
  return TECHNICAL_PATTERN.test(message)
}

function isSafeAppMessage(message) {
  if (!message || typeof message !== 'string') return false
  const trimmed = message.trim()
  if (trimmed.length > 200) return false
  if (looksTechnical(trimmed)) return false
  return SAFE_MESSAGE_PREFIXES.some((prefix) => trimmed.startsWith(prefix))
}

/**
 * @param {unknown} error
 * @param {string} [fallback]
 */
export function toUserFacingError(error, fallback = USER_MESSAGES.generic) {
  const message =
    error instanceof Error
      ? error.message
      : typeof error === 'string'
        ? error
        : ''

  if (message && isSafeAppMessage(message)) {
    return message.trim()
  }

  if (import.meta.env.DEV && message) {
    console.error('[userFacingError]', error)
  }

  return fallback
}

export function toAuthLoginError(error) {
  return toUserFacingError(error, USER_MESSAGES.authLogin)
}

export function toAuthRegisterError(error) {
  return toUserFacingError(error, USER_MESSAGES.authRegister)
}

export function toAuthResetRequestError(error) {
  return toUserFacingError(error, USER_MESSAGES.authResetRequest)
}

export function toAuthResetPasswordError(error) {
  return toUserFacingError(error, USER_MESSAGES.authResetPassword)
}

export function toCheckoutError(error) {
  return toUserFacingError(error, USER_MESSAGES.checkout)
}

export function toCancelPremiumError(error) {
  return toUserFacingError(error, USER_MESSAGES.cancelPremium)
}
