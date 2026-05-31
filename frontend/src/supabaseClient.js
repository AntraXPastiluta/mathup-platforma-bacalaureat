import { createClient } from '@supabase/supabase-js'
import { isInvalidRefreshTokenError } from './shared/utils/authTokenErrors'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Aplicația nu este configurată corect. Contactează suportul.')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    // Validated in ensureAuthBootstrap() — avoids refresh 400 spam before cleanup.
    autoRefreshToken: false,
    detectSessionInUrl: true,
    storage: window.localStorage,
  },
})

let authBootstrapPromise = null

async function bootstrapAuthSession() {
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error) {
    if (isInvalidRefreshTokenError(error)) {
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
