import { createClient } from '@supabase/supabase-js'
import { isStaleStoredAuthError } from './shared/utils/authTokenErrors'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Aplicația nu este configurată corect. Contactează suportul.')
}

// Preferința „Ține-mă minte”. O ținem mereu în localStorage (e un singur flag, nu
// sesiunea în sine), ca să știm la următoarea încărcare unde a fost scrisă sesiunea.
// Absența flag-ului = persistă (comportament implicit, retrocompatibil cu sesiunile
// deja salvate înainte de această funcționalitate).
const REMEMBER_FLAG_KEY = 'mathup.auth.remember'

function shouldPersistSession() {
  try {
    return window.localStorage.getItem(REMEMBER_FLAG_KEY) !== '0'
  } catch {
    return true
  }
}

/** Setează dacă sesiunea trebuie să supraviețuiască închiderii browserului.
 *  Se apelează ÎNAINTE de signIn/signUp, ca token-ul să fie scris în store-ul corect. */
export function setRememberSession(remember) {
  try {
    window.localStorage.setItem(REMEMBER_FLAG_KEY, remember ? '1' : '0')
  } catch {
    // localStorage indisponibil (mod privat strict) — ignorăm; ne bazăm pe default.
  }
}

// Storage care rutează sesiunea către localStorage (persistă) sau sessionStorage
// (se golește la închiderea tab-ului/browserului), în funcție de preferința de mai sus.
// Nu lăsăm niciodată token-ul în ambele store-uri simultan.
const rememberAwareStorage = {
  getItem: (key) => {
    try {
      const store = shouldPersistSession() ? window.localStorage : window.sessionStorage
      return store.getItem(key)
    } catch {
      return null
    }
  },
  setItem: (key, value) => {
    try {
      const persist = shouldPersistSession()
      const store = persist ? window.localStorage : window.sessionStorage
      const other = persist ? window.sessionStorage : window.localStorage
      store.setItem(key, value)
      other.removeItem(key)
    } catch {
      // ignore
    }
  },
  removeItem: (key) => {
    try {
      window.localStorage.removeItem(key)
      window.sessionStorage.removeItem(key)
    } catch {
      // ignore
    }
  },
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    // Validated in ensureAuthBootstrap() — avoids refresh 400 spam before cleanup.
    autoRefreshToken: false,
    detectSessionInUrl: true,
    storage: rememberAwareStorage,
  },
})

let authBootstrapPromise = null

async function bootstrapAuthSession() {
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error) {
    if (isStaleStoredAuthError(error)) {
      try {
        await supabase.auth.signOut({ scope: 'local' })
      } catch (signOutError) {
        console.warn('Local auth cleanup:', signOutError)
      }
    }
    return { user: null, session: null }
  }

  if (!user) {
    return { user: null, session: null }
  }

  supabase.auth.startAutoRefresh()
  const { data: { session } } = await supabase.auth.getSession()
  return { user, session: session ?? null }
}

/** Validates stored session once before app data fetches (shared by AuthProvider). */
export function ensureAuthBootstrap() {
  if (!authBootstrapPromise) {
    authBootstrapPromise = bootstrapAuthSession().catch((bootstrapError) => {
      authBootstrapPromise = null
      console.warn('Auth bootstrap failed:', bootstrapError)
      return { user: null, session: null }
    })
  }
  return authBootstrapPromise
}

export function resetAuthBootstrap() {
  authBootstrapPromise = null
}

export function startSessionAutoRefresh() {
  supabase.auth.startAutoRefresh()
}

export function stopSessionAutoRefresh() {
  supabase.auth.stopAutoRefresh()
}
