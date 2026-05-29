/**
 * Memorează „ultima locație” a utilizatorului pentru a-l readuce acolo după
 * autentificare sau reîncărcare. Salvează în metadatele profilului (persistent)
 * și gestionează un redirect temporar în sessionStorage (ex. ruta cerută înainte
 * de login). Rutele și parametrii sensibili sunt filtrați înainte de salvare.
 */
const LAST_LOCATION_KEY = 'last_location'
const PENDING_POST_AUTH_REDIRECT_KEY = 'mathup.pending_post_auth_redirect'
// Parametri din URL care nu trebuie salvați niciodată (token-uri, coduri de plată etc.);
// îi eliminăm înainte de a memora ultima locație, ca să nu persistăm date sensibile.
const SENSITIVE_QUERY_KEYS = new Set([
  'access_token',
  'checkout',
  'checkout_session',
  'code',
  'payment_intent_client_secret',
  'refresh_token',
  'session_id',
  'token',
])

const AUTH_PATHS = new Set([
  '/',
  '/register',
  '/login',
  '/forgot-password',
  '/reset-password',
  '/complete-profile',
  '/termeni-si-conditii',
  '/politica-de-confidentialitate',
  '/maintenance',
])

let lastPersistedPath = ''
let lastPersistedAt = 0

function normalizePathname(pathname) {
  if (typeof pathname !== 'string' || !pathname.startsWith('/')) return ''
  if (pathname.length > 1 && pathname.endsWith('/')) return pathname.slice(0, -1)
  return pathname
}

// Doar rutele protejate (din aplicația logată) merită memorate ca destinație;
// paginile publice/auth nu au sens ca redirect post-login.
function isProtectedPath(pathname) {
  return (
    pathname === '/dashboard'
    || pathname === '/profile'
    || pathname === '/support'
    || pathname === '/roadmap'
    || pathname === '/variante-rezolvate'
    || pathname === '/admin'
    || /^\/lessons\/[^/]+$/.test(pathname)
  )
}

function cleanSearch(search) {
  if (!search || typeof search !== 'string') return ''
  const input = search.startsWith('?') ? search.slice(1) : search
  const params = new URLSearchParams(input)
  SENSITIVE_QUERY_KEYS.forEach((key) => params.delete(key))
  const output = params.toString()
  return output ? `?${output}` : ''
}

function cleanHash(hash) {
  if (!hash || typeof hash !== 'string') return ''
  return hash.startsWith('#') ? hash : `#${hash}`
}

function pathFromLocation(locationLike) {
  if (typeof locationLike === 'string') {
    return locationLike
  }

  if (!locationLike || typeof locationLike !== 'object') return ''
  const pathname = normalizePathname(locationLike.pathname)
  if (!pathname) return ''
  return `${pathname}${cleanSearch(locationLike.search)}${cleanHash(locationLike.hash)}`
}

function locationFromPath(path) {
  if (typeof path !== 'string' || !path.startsWith('/')) return null

  const [pathnameAndSearch, rawHash = ''] = path.split('#')
  const [pathname = '', rawSearch = ''] = pathnameAndSearch.split('?')
  const normalizedPathname = normalizePathname(pathname)
  if (!normalizedPathname) return null

  return {
    pathname: normalizedPathname,
    search: cleanSearch(rawSearch ? `?${rawSearch}` : ''),
    hash: cleanHash(rawHash),
  }
}

/**
 * Decide dacă o rută poate fi reținută ca destinație post-login: trebuie să fie
 * protejată, non-auth, iar `/admin` doar dacă `allowAdmin` e adevărat.
 */
export function isAllowedPath(pathname, { allowAdmin = false } = {}) {
  const normalizedPathname = normalizePathname(pathname)
  if (!normalizedPathname) return false
  if (AUTH_PATHS.has(normalizedPathname)) return false
  if (!isProtectedPath(normalizedPathname)) return false
  if (normalizedPathname === '/admin' && !allowAdmin) return false
  return true
}

/**
 * Curăță și validează o locație (string sau obiect tip Location), eliminând
 * parametrii sensibili. Returnează null dacă ruta nu e permisă sau e prea lungă.
 */
export function sanitizeLocation(locationLike, options = {}) {
  const rawPath = pathFromLocation(locationLike)
  if (!rawPath) return null

  const parsed = locationFromPath(rawPath)
  if (!parsed) return null
  if (!isAllowedPath(parsed.pathname, options)) return null

  const path = `${parsed.pathname}${parsed.search}${parsed.hash}`
  // Limită defensivă de lungime, pentru a evita stocarea unor URL-uri abuzive.
  if (path.length > 256) return null
  return { ...parsed, path }
}

export function savePendingPostAuthRedirect(locationLike, options = {}) {
  const sanitized = sanitizeLocation(locationLike, options)
  if (!sanitized) return null
  sessionStorage.setItem(PENDING_POST_AUTH_REDIRECT_KEY, sanitized.path)
  return sanitized.path
}

export function clearPendingPostAuthRedirect() {
  sessionStorage.removeItem(PENDING_POST_AUTH_REDIRECT_KEY)
}

/** Citește și șterge (consumă) redirectul în așteptare, revalidându-l înainte de folosire. */
export function consumePendingPostAuthRedirect(options = {}) {
  const pendingPath = sessionStorage.getItem(PENDING_POST_AUTH_REDIRECT_KEY)
  sessionStorage.removeItem(PENDING_POST_AUTH_REDIRECT_KEY)
  if (!pendingPath) return null
  const sanitized = sanitizeLocation(pendingPath, options)
  return sanitized?.path ?? null
}

/**
 * Salvează ultima locație în metadatele utilizatorului (cu throttling), pentru a
 * o putea relua la următoarea sesiune.
 *
 * @param {Function} updateUserMetadata - Funcție care actualizează metadatele contului.
 * @param {string|object} locationLike - Locația curentă (path sau obiect Location).
 */
export async function persistLastLocation(updateUserMetadata, locationLike, options = {}) {
  if (typeof updateUserMetadata !== 'function') return null

  const sanitized = sanitizeLocation(locationLike, options)
  if (!sanitized) return null

  // Throttling: evităm scrierile repetate ale aceleiași rute într-un interval scurt,
  // pentru a nu suprasolicita actualizarea metadatelor utilizatorului la fiecare navigare.
  const now = Date.now()
  const minIntervalMs = Number.isFinite(options.minIntervalMs) ? options.minIntervalMs : 4000
  if (sanitized.path === lastPersistedPath && now - lastPersistedAt < minIntervalMs) {
    return null
  }

  lastPersistedPath = sanitized.path
  lastPersistedAt = now

  try {
    await updateUserMetadata(
      {
        [LAST_LOCATION_KEY]: {
          path: sanitized.path,
          updated_at: new Date(now).toISOString(),
        },
      },
      { silent: true },
    )
    return sanitized.path
  } catch (error) {
    console.warn('Persisting last location failed:', error)
    return null
  }
}

function readMetadataLastLocation(user, options = {}) {
  const metadataValue = user?.user_metadata?.[LAST_LOCATION_KEY]
  const candidatePath = typeof metadataValue === 'string' ? metadataValue : metadataValue?.path
  if (!candidatePath) return null
  const sanitized = sanitizeLocation(candidatePath, options)
  return sanitized?.path ?? null
}

// Ordinea de prioritate la redirect după autentificare: 1) ruta cerută explicit înainte
// de login, 2) ultima locație salvată în profil, 3) ruta implicită (fallback).
export function resolvePostAuthRedirect({ user, isAdmin = false, fallback = '/dashboard' } = {}) {
  const options = { allowAdmin: Boolean(isAdmin) }
  const pendingPath = consumePendingPostAuthRedirect(options)
  if (pendingPath) return pendingPath

  const metadataPath = readMetadataLastLocation(user, options)
  if (metadataPath) return metadataPath

  return fallback
}
