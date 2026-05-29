const COOKIE_NAME = 'mathup_session'
/** ~7 days — aligned with typical Supabase refresh token lifetime */
const MAX_AGE_SECONDS = 60 * 60 * 24 * 7

function isSecureContext() {
  return typeof window !== 'undefined' && window.location?.protocol === 'https:'
}

export function setSessionCookie() {
  if (typeof document === 'undefined') return
  const secure = isSecureContext() ? '; Secure' : ''
  document.cookie = `${COOKIE_NAME}=1; Path=/; Max-Age=${MAX_AGE_SECONDS}; SameSite=Lax${secure}`
}

export function clearSessionCookie() {
  if (typeof document === 'undefined') return
  const secure = isSecureContext() ? '; Secure' : ''
  document.cookie = `${COOKIE_NAME}=; Path=/; Max-Age=0; SameSite=Lax${secure}`
}

export function hasSessionCookie() {
  if (typeof document === 'undefined') return false
  return document.cookie.split(';').some((part) => part.trim().startsWith(`${COOKIE_NAME}=1`))
}
