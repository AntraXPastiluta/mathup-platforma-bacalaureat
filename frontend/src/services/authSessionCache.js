/**
 * Cache local (localStorage) pentru datele de autorizare ale utilizatorului
 * (statut Premium și rol de admin). Permite afișarea instantanee a stării
 * corecte la încărcarea aplicației, înainte ca cererile de rețea să se termine.
 */

// Versiunea face parte din cheie: la schimbarea formei datelor, incrementarea
// ei invalidează automat intrările vechi salvate de utilizatori.
const CACHE_VERSION = 1
const CACHE_KEY = `mathup_auth_cache_v${CACHE_VERSION}`

function readStore() {
  if (typeof localStorage === 'undefined') return {}
  try {
    const raw = localStorage.getItem(CACHE_KEY)
    if (!raw) return {}
    const parsed = JSON.parse(raw)
    return parsed && typeof parsed === 'object' ? parsed : {}
  } catch {
    return {}
  }
}

function writeStore(store) {
  if (typeof localStorage === 'undefined') return
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(store))
  } catch {
    // Cotă depășită sau navigare privată — ignorăm, cache-ul e doar o optimizare.
  }
}

/**
 * Citește datele cache pentru un utilizator.
 *
 * @param {string} userId
 * @returns {{ entitlement: object | null, admin: { isAdmin: boolean, isPrimaryAdmin: boolean, primaryAdminEmail: string | null } | null } | null}
 */
export function readAuthCache(userId) {
  if (!userId) return null
  const entry = readStore()[userId]
  if (!entry || typeof entry !== 'object') return null
  return {
    entitlement: entry.entitlement ?? null,
    admin: entry.admin ?? null,
  }
}

/**
 * Actualizează parțial cache-ul unui utilizator. Câmpurile lipsă din `partial`
 * sunt păstrate, astfel încât se poate scrie doar `entitlement` sau doar `admin`.
 *
 * @param {string} userId
 * @param {{ entitlement?: object | null, admin?: { isAdmin: boolean, isPrimaryAdmin: boolean, primaryAdminEmail: string | null } | null }} partial
 */
export function writeAuthCache(userId, partial) {
  if (!userId || !partial || typeof partial !== 'object') return
  const store = readStore()
  const existing = store[userId] && typeof store[userId] === 'object' ? store[userId] : {}
  store[userId] = {
    ...existing,
    ...(partial.entitlement !== undefined ? { entitlement: partial.entitlement } : {}),
    ...(partial.admin !== undefined ? { admin: partial.admin } : {}),
    updatedAt: Date.now(),
  }
  writeStore(store)
}

/** Șterge cache-ul: pentru un anumit utilizator sau, dacă lipsește `userId`, complet. */
export function clearAuthCache(userId) {
  if (!userId) {
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem(CACHE_KEY)
    }
    return
  }
  const store = readStore()
  if (!store[userId]) return
  delete store[userId]
  // Dacă nu mai rămâne niciun utilizator, eliminăm complet cheia din localStorage.
  if (Object.keys(store).length === 0) {
    localStorage.removeItem(CACHE_KEY)
  } else {
    writeStore(store)
  }
}
